import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { CreatePlaygroundSchema, UpdatePlaygroundSchema } from '../schemas/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authMiddleware);

/**
 * GET /admin/playgrounds
 * List all playgrounds (admin only)
 */
router.get('/playgrounds', adminOnly, async (req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from('playgrounds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/playgrounds/:id
 * Get playground details with questions and models
 */
router.get('/playgrounds/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: playground, error: playgroundError } = await db
      .from('playgrounds')
      .select('*')
      .eq('id', id)
      .single();

    if (playgroundError || !playground) {
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    // Verify ownership
    if (playground.created_by !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { data: models } = await db
      .from('model_configurations')
      .select('*')
      .eq('playground_id', id);

    const { data: questions } = await db
      .from('questions')
      .select('*')
      .eq('playground_id', id)
      .order('order_index', { ascending: true });

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
 * POST /admin/playgrounds
 * Create new playground with questions and models
 */
router.post('/playgrounds', adminOnly, async (req: Request, res: Response) => {
  try {
    const payload = CreatePlaygroundSchema.parse(req.body);

    // Create playground
    const playgroundId = uuidv4();
    const { data: playground, error: playgroundError } = await db
      .from('playgrounds')
      .insert({
        id: playgroundId,
        name: payload.name,
        type: payload.type,
        description: payload.description,
        support_text: payload.support_text,
        created_by: req.user?.id,
        restricted_emails: payload.restricted_emails || null,
      })
      .select()
      .single();

    if (playgroundError) throw playgroundError;

    // Create models
    const modelInserts = payload.models.map(model => ({
      playground_id: playgroundId,
      model_key: model.model_key,
      model_name: model.model_name,
      embed_code: model.embed_code,
      max_evaluations: model.max_evaluations,
    }));

    const { error: modelsError } = await db
      .from('model_configurations')
      .insert(modelInserts);

    if (modelsError) throw modelsError;

    // Create evaluation counters for each model
    const counterInserts = payload.models.map(model => ({
      playground_id: playgroundId,
      model_key: model.model_key,
      current_count: 0,
    }));

    const { error: countersError } = await db
      .from('evaluation_counters')
      .insert(counterInserts);

    if (countersError) throw countersError;

    // Create questions
    const questionInserts = payload.questions.map(q => ({
      playground_id: playgroundId,
      model_key: q.model_key || null,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.question_type === 'select' ? q.options : null,
      order_index: q.order_index,
      required: q.required,
    }));

    const { error: questionsError } = await db
      .from('questions')
      .insert(questionInserts);

    if (questionsError) throw questionsError;

    res.status(201).json({
      data: playground,
      message: 'Playground created successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /admin/playgrounds/:id
 * Update playground
 */
router.put('/playgrounds/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = UpdatePlaygroundSchema.parse(req.body);

    // Verify ownership
    const { data: playground, error: checkError } = await db
      .from('playgrounds')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !playground || playground.created_by !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { data, error } = await db
      .from('playgrounds')
      .update({
        name: payload.name,
        type: payload.type,
        description: payload.description,
        support_text: payload.support_text,
        restricted_emails: payload.restricted_emails,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /admin/playgrounds/:id
 * Delete playground
 */
router.delete('/playgrounds/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: playground, error: checkError } = await db
      .from('playgrounds')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !playground || playground.created_by !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { error } = await db
      .from('playgrounds')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Playground deleted' });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /admin/playgrounds/:id/metrics
 * Get playground metrics and dashboard data
 */
router.get('/playgrounds/:id/metrics', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: playground, error: checkError } = await db
      .from('playgrounds')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError || !playground || playground.created_by !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Get evaluation count per model
    const { data: counters } = await db
      .from('evaluation_counters')
      .select('*')
      .eq('playground_id', id);

    // Get question response metrics
    const { data: selectMetrics } = await db
      .from('question_metrics')
      .select('*')
      .eq('playground_id', id);

    // Get open-ended responses
    const { data: openResponses } = await db
      .from('open_responses')
      .select('*')
      .eq('playground_id', id)
      .order('created_at', { ascending: false });

    // Get total evaluations and unique testers
    const { data: allEvaluations } = await db
      .from('evaluations')
      .select('user_id')
      .eq('playground_id', id);

    // Get full playground data for status
    const { data: fullPlayground }: any = await db
      .from('playgrounds')
      .select('is_active')
      .eq('id', id)
      .single();

    const totalEvaluations = allEvaluations?.length || 0;
    const uniqueTesters = new Set(allEvaluations?.map((e: any) => e.user_id)).size;

    res.json({
      data: {
        counters,
        selectMetrics,
        openResponses,
        stats: {
          totalEvaluations,
          uniqueTesters,
          status: fullPlayground?.is_active ? 'in_progress' : 'completed',
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

export default router;
