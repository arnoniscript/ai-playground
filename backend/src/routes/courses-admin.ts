import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/courses
 * List all courses (admin only)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { data: courses, error } = await db
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch courses' });
      return;
    }

    res.json({ data: courses });
  })
);

/**
 * GET /api/admin/courses/:id
 * Get course details with all steps and evaluations
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get course
    const { data: course, error: courseError } = await db
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (courseError || !course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get steps with questions and options
    const { data: steps, error: stepsError } = await db
      .from('course_steps')
      .select(`
        *,
        questions:evaluation_questions(
          *,
          options:question_options(*)
        )
      `)
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    if (stepsError) {
      res.status(500).json({ error: 'Failed to fetch steps' });
      return;
    }

    res.json({ data: { ...course, steps: steps || [] } });
  })
);

/**
 * POST /api/admin/courses
 * Create a new course
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { title, description, is_published } = req.body;
    const userId = req.user!.id;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const { data, error } = await db
      .from('courses')
      .insert({
        title,
        description,
        created_by: userId,
        is_published: is_published || false,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create course' });
      return;
    }

    res.status(201).json({ data });
  })
);

/**
 * PUT /api/admin/courses/:id
 * Update course details
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: any = {};

    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.is_published !== undefined) updateData.is_published = req.body.is_published;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json({ data });
  })
);

/**
 * DELETE /api/admin/courses/:id
 * Delete a course (cascades to steps, questions, etc.)
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await db.from('courses').delete().eq('id', id);

    if (error) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json({ message: 'Course deleted successfully' });
  })
);

/**
 * POST /api/admin/courses/:courseId/steps
 * Add a step to a course
 */
router.post(
  '/:courseId/steps',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const {
      order_index,
      title,
      content,
      image_url,
      video_url,
      audio_url,
      has_evaluation,
      evaluation_required,
      min_score,
      max_attempts,
    } = req.body;

    if (!title || order_index === undefined) {
      res.status(400).json({ error: 'Title and order_index are required' });
      return;
    }

    const { data, error } = await db
      .from('course_steps')
      .insert({
        course_id: courseId,
        order_index,
        title,
        content,
        image_url,
        video_url,
        audio_url,
        has_evaluation: has_evaluation || false,
        evaluation_required: evaluation_required || false,
        min_score,
        max_attempts,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: 'Failed to create step' });
      return;
    }

    res.status(201).json({ data });
  })
);

/**
 * PUT /api/admin/courses/:courseId/steps/:stepId
 * Update a course step
 */
router.put(
  '/:courseId/steps/:stepId',
  asyncHandler(async (req: Request, res: Response) => {
    const { stepId } = req.params;
    const updateData: any = {};

    if (req.body.order_index !== undefined) updateData.order_index = req.body.order_index;
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.content !== undefined) updateData.content = req.body.content;
    if (req.body.image_url !== undefined) updateData.image_url = req.body.image_url;
    if (req.body.video_url !== undefined) updateData.video_url = req.body.video_url;
    if (req.body.audio_url !== undefined) updateData.audio_url = req.body.audio_url;
    if (req.body.has_evaluation !== undefined) updateData.has_evaluation = req.body.has_evaluation;
    if (req.body.evaluation_required !== undefined)
      updateData.evaluation_required = req.body.evaluation_required;
    if (req.body.min_score !== undefined) updateData.min_score = req.body.min_score;
    if (req.body.max_attempts !== undefined) updateData.max_attempts = req.body.max_attempts;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('course_steps')
      .update(updateData)
      .eq('id', stepId)
      .select()
      .single();

    if (error) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    res.json({ data });
  })
);

/**
 * DELETE /api/admin/courses/:courseId/steps/:stepId
 * Delete a course step
 */
router.delete(
  '/:courseId/steps/:stepId',
  asyncHandler(async (req: Request, res: Response) => {
    const { stepId } = req.params;

    const { error } = await db.from('course_steps').delete().eq('id', stepId);

    if (error) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    res.json({ message: 'Step deleted successfully' });
  })
);

/**
 * POST /api/admin/courses/:courseId/steps/:stepId/questions
 * Add a question to a step evaluation
 */
router.post(
  '/:courseId/steps/:stepId/questions',
  asyncHandler(async (req: Request, res: Response) => {
    const { stepId } = req.params;
    const {
      order_index,
      question_text,
      question_image_url,
      question_video_url,
      question_audio_url,
      options,
    } = req.body;

    if (!question_text || order_index === undefined || !options || !Array.isArray(options)) {
      res.status(400).json({
        error: 'question_text, order_index, and options array are required',
      });
      return;
    }

    // Insert question
    const { data: question, error: questionError } = await db
      .from('evaluation_questions')
      .insert({
        step_id: stepId,
        order_index,
        question_text,
        question_image_url,
        question_video_url,
        question_audio_url,
      })
      .select()
      .single();

    if (questionError || !question) {
      res.status(500).json({ error: 'Failed to create question' });
      return;
    }

    // Insert options
    const optionsData = options.map((opt: any, idx: number) => ({
      question_id: question.id,
      option_text: opt.option_text,
      is_correct: opt.is_correct || false,
      order_index: opt.order_index !== undefined ? opt.order_index : idx,
    }));

    const { data: insertedOptions, error: optionsError } = await db
      .from('question_options')
      .insert(optionsData)
      .select();

    if (optionsError) {
      res.status(500).json({ error: 'Failed to create options' });
      return;
    }

    res.status(201).json({
      data: {
        ...question,
        options: insertedOptions,
      },
    });
  })
);

/**
 * PUT /api/admin/courses/:courseId/steps/:stepId/questions/:questionId
 * Update a question
 */
router.put(
  '/:courseId/steps/:stepId/questions/:questionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params;
    const {
      order_index,
      question_text,
      question_image_url,
      question_video_url,
      question_audio_url,
      options,
    } = req.body;

    // Update question
    const updateData: any = {};
    if (order_index !== undefined) updateData.order_index = order_index;
    if (question_text !== undefined) updateData.question_text = question_text;
    if (question_image_url !== undefined) updateData.question_image_url = question_image_url;
    if (question_video_url !== undefined) updateData.question_video_url = question_video_url;
    if (question_audio_url !== undefined) updateData.question_audio_url = question_audio_url;

    const { data: question, error: questionError } = await db
      .from('evaluation_questions')
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (questionError) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Update options if provided
    if (options && Array.isArray(options)) {
      // Delete existing options
      await db.from('question_options').delete().eq('question_id', questionId);

      // Insert new options
      const optionsData = options.map((opt: any, idx: number) => ({
        question_id: questionId,
        option_text: opt.option_text,
        is_correct: opt.is_correct || false,
        order_index: opt.order_index !== undefined ? opt.order_index : idx,
      }));

      const { data: insertedOptions } = await db
        .from('question_options')
        .insert(optionsData)
        .select();

      res.json({
        data: {
          ...question,
          options: insertedOptions || [],
        },
      });
    } else {
      // Get existing options
      const { data: existingOptions } = await db
        .from('question_options')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index', { ascending: true });

      res.json({
        data: {
          ...question,
          options: existingOptions || [],
        },
      });
    }
  })
);

/**
 * DELETE /api/admin/courses/:courseId/steps/:stepId/questions/:questionId
 * Delete a question
 */
router.delete(
  '/:courseId/steps/:stepId/questions/:questionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params;

    const { error } = await db.from('evaluation_questions').delete().eq('id', questionId);

    if (error) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json({ message: 'Question deleted successfully' });
  })
);

export default router;
