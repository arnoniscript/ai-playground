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

    if (error) throw error;

    // Filter by restricted emails if applicable
    const availablePlaygrounds = (playgrounds || []).filter(pg => {
      if (!pg.restricted_emails || pg.restricted_emails.length === 0) {
        return true; // Available to all
      }
      return pg.restricted_emails.includes(userEmail);
    });

    res.json({ data: availablePlaygrounds });
  } catch (error) {
    throw error;
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

    const { data: playground, error } = await db
      .from('playgrounds')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !playground) {
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
      },
    });
  } catch (error) {
    throw error;
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

    if (insertError) throw insertError;

    // Increment counter
    const { error: updateError } = await db
      .from('evaluation_counters')
      .update({ current_count: counter.current_count + 1 })
      .eq('id', counter.id);

    if (updateError) throw updateError;

    res.status(201).json({
      message: 'Evaluation submitted successfully',
      session_id: payload.session_id,
    });
  } catch (error) {
    throw error;
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
    throw error;
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

    if (error) throw error;

    // Count evaluations per model
    const progress: Record<string, number> = {};
    evaluations?.forEach(e => {
      progress[e.model_key] = (progress[e.model_key] || 0) + 1;
    });

    res.json({ data: { progress, total: evaluations?.length || 0 } });
  } catch (error) {
    throw error;
  }
});

export default router;
