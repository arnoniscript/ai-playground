import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/courses
 * List all published courses with user progress
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { data: courses, error } = await db
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch courses' });
      return;
    }

    // Get user progress for all courses
    const { data: progressData } = await db
      .from('user_course_progress')
      .select('course_id, completed_at')
      .eq('user_id', userId);

    // Create a map of course_id -> progress
    const progressMap = new Map(
      progressData?.map((p) => [p.course_id, p]) || []
    );

    // Merge progress into courses
    const coursesWithProgress = courses.map((course) => ({
      ...course,
      user_progress: progressMap.get(course.id) || null,
    }));

    res.json({ data: coursesWithProgress });
  })
);

/**
 * GET /api/courses/:id
 * Get course details with steps (only question prompts, not correct answers)
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get course
    const { data: course, error: courseError } = await db
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (courseError || !course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get user progress
    const { data: progress } = await db
      .from('user_course_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', id)
      .single();

    // Get steps with questions (but hide correct answers)
    const { data: steps } = await db
      .from('course_steps')
      .select(`
        *,
        questions:evaluation_questions(
          id,
          step_id,
          order_index,
          question_text,
          question_image_url,
          question_video_url,
          question_audio_url,
          created_at,
          options:question_options(
            id,
            question_id,
            option_text,
            order_index,
            created_at
          )
        )
      `)
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    res.json({ data: { course: { ...course, steps: steps || [] }, progress: progress || null } });
  })
);

/**
 * POST /api/courses/:id/start
 * Start a course (create progress record)
 */
router.post(
  '/:id/start',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if course exists and is published
    const { data: course } = await db
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Check if user already started
    const { data: existingProgress } = await db
      .from('user_course_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', id)
      .single();

    if (existingProgress) {
      res.json({ data: existingProgress });
      return;
    }

    // Get first step
    const { data: firstStep } = await db
      .from('course_steps')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    // Create progress record
    const { data, error } = await db
      .from('user_course_progress')
      .insert({
        user_id: userId,
        course_id: id,
        current_step_id: firstStep?.id || null,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to start course' });
      return;
    }

    res.status(201).json({ data });
  })
);

/**
 * POST /api/courses/:courseId/steps/:stepId/submit
 * Submit an evaluation for a step
 */
router.post(
  '/:courseId/steps/:stepId/submit',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId, stepId } = req.params;
    const { answers } = req.body;
    const userId = req.user!.id;

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ error: 'Answers array is required' });
      return;
    }

    // Get step
    const { data: step } = await db
      .from('course_steps')
      .select('*')
      .eq('id', stepId)
      .eq('course_id', courseId)
      .single();

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    if (!step.has_evaluation) {
      res.status(400).json({ error: 'This step does not have an evaluation' });
      return;
    }

    // Check max attempts
    if (step.max_attempts) {
      const { count } = await db
        .from('user_step_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('step_id', stepId);

      if (count && count >= step.max_attempts) {
        res.status(400).json({ error: 'Maximum attempts reached for this step' });
        return;
      }
    }

    // Get correct answers for all questions
    const questionIds = answers.map((a: any) => a.question_id);
    const { data: correctOptions } = await db
      .from('question_options')
      .select('question_id, id')
      .in('question_id', questionIds)
      .eq('is_correct', true);

    const correctMap = new Map(correctOptions?.map((opt) => [opt.question_id, opt.id]) || []);

    // Calculate score
    let score = 0;
    const evaluatedAnswers = answers.map((answer: any) => {
      const isCorrect = correctMap.get(answer.question_id) === answer.selected_option_id;
      if (isCorrect) score++;

      return {
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id,
        is_correct: isCorrect,
      };
    });

    const totalQuestions = answers.length;
    const passed = step.evaluation_required ? score >= (step.min_score || 0) : true;

    // Get next attempt number
    const { data: attempts } = await db
      .from('user_step_attempts')
      .select('attempt_number')
      .eq('user_id', userId)
      .eq('step_id', stepId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = attempts && attempts.length > 0 ? attempts[0].attempt_number + 1 : 1;

    // Save attempt
    const { data: attempt, error } = await db
      .from('user_step_attempts')
      .insert({
        user_id: userId,
        step_id: stepId,
        attempt_number: attemptNumber,
        score,
        total_questions: totalQuestions,
        passed,
        answers: evaluatedAnswers,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to save attempt' });
      return;
    }

    res.json({
      data: {
        attempt,
        passed,
        score,
        total_questions: totalQuestions,
      },
    });
  })
);

/**
 * POST /api/courses/:courseId/steps/:stepId/complete
 * Mark a step as complete and move to next step
 */
router.post(
  '/:courseId/steps/:stepId/complete',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId, stepId } = req.params;
    const userId = req.user!.id;

    // Get step
    const { data: step } = await db
      .from('course_steps')
      .select('*')
      .eq('id', stepId)
      .eq('course_id', courseId)
      .single();

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    // If evaluation is required, check if user has passed
    if (step.has_evaluation && step.evaluation_required) {
      const { data: passedAttempts } = await db
        .from('user_step_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('step_id', stepId)
        .eq('passed', true)
        .limit(1);

      if (!passedAttempts || passedAttempts.length === 0) {
        res.status(400).json({ error: 'You must pass the evaluation before continuing' });
        return;
      }
    }

    // Get next step
    const { data: nextSteps } = await db
      .from('course_steps')
      .select('*')
      .eq('course_id', courseId)
      .gt('order_index', step.order_index)
      .order('order_index', { ascending: true })
      .limit(1);

    const nextStep = nextSteps && nextSteps.length > 0 ? nextSteps[0] : null;

    // Update progress
    if (nextStep) {
      // Move to next step
      const { data, error } = await db
        .from('user_course_progress')
        .update({ current_step_id: nextStep.id })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: 'Failed to update progress' });
        return;
      }

      res.json({ data, next_step: nextStep });
    } else {
      // Course completed
      const { data, error } = await db
        .from('user_course_progress')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: 'Failed to complete course' });
        return;
      }

      res.json({ data, course_completed: true });
    }
  })
);

/**
 * GET /api/courses/:courseId/progress
 * Get user's progress for a course
 */
router.get(
  '/:courseId/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const { data: progress } = await db
      .from('user_course_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (!progress) {
      res.status(404).json({ error: 'Progress not found. Start the course first.' });
      return;
    }

    // Get all attempts for this course
    const { data: attempts } = await db
      .from('user_step_attempts')
      .select(`
        *,
        step:course_steps(id, course_id)
      `)
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false });

    // Filter attempts for this course
    const courseAttempts = attempts?.filter((a: any) => a.step?.course_id === courseId) || [];

    res.json({
      data: {
        progress,
        attempts: courseAttempts,
      },
    });
  })
);

/**
 * GET /api/courses/:courseId/steps/:stepId/attempts
 * Get user's attempts for a specific step
 */
router.get(
  '/:courseId/steps/:stepId/attempts',
  asyncHandler(async (req: Request, res: Response) => {
    const { stepId } = req.params;
    const userId = req.user!.id;

    const { data: attempts } = await db
      .from('user_step_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('step_id', stepId)
      .order('attempt_number', { ascending: false });

    res.json({ data: attempts || [] });
  })
);

export default router;
