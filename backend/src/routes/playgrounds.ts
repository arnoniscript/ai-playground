import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { SubmitEvaluationSchema } from '../schemas/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authMiddleware);

/**
 * GET /playgrounds
 * List available playgrounds for the current tester
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userEmail = req.user?.email;

    // Get active playgrounds
    const { data: playgrounds, error } = await db
      .from('playgrounds')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching playgrounds:', error);
      res.status(500).json({ error: 'Failed to fetch playgrounds' });
      return;
    }

    // Filter by restricted emails if applicable
    const availablePlaygrounds = (playgrounds || []).filter(pg => {
      if (!pg.restricted_emails || pg.restricted_emails.length === 0) {
        return true; // Available to all
      }
      return pg.restricted_emails.includes(userEmail);
    });

    // Fetch counters for each playground
    const playgroundsWithCounters = await Promise.all(
      availablePlaygrounds.map(async (playground) => {
        const { data: counters } = await db
          .from('evaluation_counters')
          .select('*')
          .eq('playground_id', playground.id);

        return {
          ...playground,
          counters,
        };
      })
    );

    res.json({ data: playgroundsWithCounters });
  } catch (error) {
    console.error('Error in GET /playgrounds:', error);
    res.status(500).json({ error: 'Failed to fetch playgrounds' });
  }
});

/**
 * GET /playgrounds/:id
 * Get playground details with questions and models
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;
    const userId = req.user!.id;

    const { data: playground, error } = await db
      .from('playgrounds')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !playground) {
      console.error('Error fetching playground:', error);
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    // Check access restrictions
    if (playground.restricted_emails && playground.restricted_emails.length > 0) {
      if (!playground.restricted_emails.includes(userEmail)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Check course requirement
    let linkedCourse = null;
    let userCourseProgress = null;
    let courseAccessBlocked = false;

    if (playground.linked_course_id) {
      // Get course details
      const { data: course } = await db
        .from('courses')
        .select('id, title, description, is_published')
        .eq('id', playground.linked_course_id)
        .eq('is_published', true)
        .single();

      if (course) {
        linkedCourse = course;

        // Get user's progress in the course
        const { data: progress } = await db
          .from('user_course_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', course.id)
          .single();

        userCourseProgress = progress;

        // Block access if course is required and not completed
        if (playground.course_required && (!progress || !progress.completed)) {
          courseAccessBlocked = true;
        }
      }
    }

    // Get models
    const { data: models } = await db
      .from('model_configurations')
      .select('*')
      .eq('playground_id', id);

    // Get questions for this playground
    const { data: questions } = await db
      .from('questions')
      .select('*')
      .eq('playground_id', id)
      .order('order_index', { ascending: true });

    // Get evaluation counters to show progress
    const { data: counters } = await db
      .from('evaluation_counters')
      .select('*')
      .eq('playground_id', id);

    res.json({
      data: {
        ...playground,
        models,
        questions,
        counters,
        linked_course: linkedCourse,
        user_course_progress: userCourseProgress,
        course_access_blocked: courseAccessBlocked,
      },
    });
  } catch (error) {
    console.error('Error fetching playground:', error);
    res.status(500).json({ error: 'Failed to fetch playground' });
  }
});

/**
 * POST /playgrounds/:id/evaluations
 * Submit evaluation responses
 */
router.post('/:id/evaluations', async (req: Request, res: Response) => {
  try {
    const { id: playgroundId } = req.params;
    const payload = SubmitEvaluationSchema.parse(req.body);

    // Verify playground exists and is active
    const { data: playground, error: pgError } = await db
      .from('playgrounds')
      .select('*')
      .eq('id', playgroundId)
      .eq('is_active', true)
      .single();

    if (pgError || !playground) {
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    // Check access restrictions
    if (playground.restricted_emails && playground.restricted_emails.length > 0) {
      if (!playground.restricted_emails.includes(req.user?.email)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Check if model still has evaluations available
    const { data: counter, error: counterError } = await db
      .from('evaluation_counters')
      .select('*')
      .eq('playground_id', playgroundId)
      .eq('model_key', payload.model_key)
      .single();

    if (counterError || !counter) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    // Get model configuration to check max evaluations
    const { data: modelConfig } = await db
      .from('model_configurations')
      .select('*')
      .eq('playground_id', playgroundId)
      .eq('model_key', payload.model_key)
      .single();

    if (!modelConfig || counter.current_count >= modelConfig.max_evaluations) {
      res.status(409).json({
        error: 'Model evaluation limit reached',
        message: 'This playground model has reached its maximum number of evaluations',
      });
      return;
    }

    // Insert evaluations
    const evaluationInserts = payload.answers.map(answer => ({
      id: uuidv4(),
      playground_id: playgroundId,
      user_id: req.user?.id,
      model_key: payload.model_key,
      question_id: answer.question_id,
      answer_text: answer.answer_text || null,
      answer_value: answer.answer_value || null,
      rating: answer.rating || null,
      session_id: payload.session_id,
    }));

    const { error: insertError } = await db
      .from('evaluations')
      .insert(evaluationInserts);

    if (insertError) {
      console.error('Error inserting evaluations:', insertError);
      res.status(500).json({ error: 'Failed to insert evaluations' });
      return;
    }

    // Increment counter
    const { error: updateError } = await db
      .from('evaluation_counters')
      .update({ current_count: counter.current_count + 1 })
      .eq('id', counter.id);

    if (updateError) {
      console.error('Error updating counter:', updateError);
      res.status(500).json({ error: 'Failed to update counter' });
      return;
    }

    res.status(201).json({
      message: 'Evaluation submitted successfully',
      session_id: payload.session_id,
    });
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    res.status(500).json({ error: 'Failed to submit evaluation' });
  }
});

/**
 * GET /playgrounds/:id/next-model
 * Get the next model to evaluate (for A/B testing)
 * Randomly alternates between A and B, ensuring fairness
 */
router.get('/:id/next-model', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: models, error } = await db
      .from('model_configurations')
      .select('*')
      .eq('playground_id', id);

    if (error || !models || models.length === 0) {
      res.status(404).json({ error: 'No models found' });
      return;
    }

    // For A/B testing, randomly select between available models
    if (models.length === 2) {
      const randomModel = models[Math.floor(Math.random() * models.length)];
      res.json({ data: { model_key: randomModel.model_key } });
    } else {
      // For tuning, return the single model
      res.json({ data: { model_key: models[0].model_key } });
    }
  } catch (error) {
    console.error('Error getting next model:', error);
    res.status(500).json({ error: 'Failed to get next model' });
  }
});

/**
 * GET /playgrounds/:id/progress
 * Get user's evaluation progress for a playground
 */
router.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: evaluations, error } = await db
      .from('evaluations')
      .select('model_key')
      .eq('playground_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
      return;
    }

    // Count evaluations per model
    const progress: Record<string, number> = {};
    evaluations?.forEach(e => {
      progress[e.model_key] = (progress[e.model_key] || 0) + 1;
    });

    res.json({ data: { progress, total: evaluations?.length || 0 } });
  } catch (error) {
    console.error('Error in progress endpoint:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

export default router;
