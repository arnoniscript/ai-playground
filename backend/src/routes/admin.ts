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
    const { data: playgrounds, error } = await db
      .from('playgrounds')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('GET /admin/playgrounds - Count:', playgrounds?.length);
    playgrounds?.forEach(p => {
      console.log(`  - ${p.name} (${p.id}): is_active=${p.is_active}`);
    });

    if (error) {
      console.error('Error fetching playgrounds:', error);
      res.status(500).json({ error: 'Failed to fetch playgrounds' });
      return;
    }

    // Fetch counters for each playground
    const playgroundsWithCounters = await Promise.all(
      (playgrounds || []).map(async (playground) => {
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
    console.error('Error fetching playgrounds:', error);
    res.status(500).json({ error: 'Failed to fetch playgrounds' });
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
      console.error('Error fetching playground:', playgroundError);
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    // Allow any admin to view playgrounds
    // No ownership check needed for viewing

    const { data: models, error: modelsError } = await db
      .from('model_configurations')
      .select('*')
      .eq('playground_id', id);

    if (modelsError) {
      console.error('Error fetching models:', modelsError);
    }

    const { data: questions, error: questionsError } = await db
      .from('questions')
      .select('*')
      .eq('playground_id', id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }

    const { data: counters, error: countersError } = await db
      .from('evaluation_counters')
      .select('*')
      .eq('playground_id', id);

    if (countersError) {
      console.error('Error fetching counters:', countersError);
    }

    res.json({
      data: {
        ...playground,
        models: models || [],
        questions: questions || [],
        counters: counters || [],
      },
    });
  } catch (error) {
    console.error('Error fetching playground:', error);
    res.status(500).json({ error: 'Failed to fetch playground', details: error instanceof Error ? error.message : 'Unknown error' });
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
        evaluation_goal: payload.evaluation_goal,
        linked_course_id: payload.linked_course_id || null,
        course_required: payload.course_required || false,
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
    console.error('Error creating playground:', error);
    res.status(500).json({ error: 'Failed to create playground' });
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

    console.log('PUT /admin/playgrounds/:id - ID:', id);
    console.log('PUT /admin/playgrounds/:id - Payload:', payload);
    console.log('PUT /admin/playgrounds/:id - User:', req.user?.id);

    // Verify ownership
    const { data: playground, error: checkError } = await db
      .from('playgrounds')
      .select('created_by')
      .eq('id', id)
      .single();

    console.log('PUT /admin/playgrounds/:id - Check result:', { playground, checkError });

    if (checkError || !playground) {
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    if (playground.created_by !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.type !== undefined) updateData.type = payload.type;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.support_text !== undefined) updateData.support_text = payload.support_text;
    if (payload.restricted_emails !== undefined) updateData.restricted_emails = payload.restricted_emails;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
    if (payload.evaluation_goal !== undefined) updateData.evaluation_goal = payload.evaluation_goal;
    if (payload.linked_course_id !== undefined) updateData.linked_course_id = payload.linked_course_id;
    if (payload.course_required !== undefined) updateData.course_required = payload.course_required;

    console.log('PUT /admin/playgrounds/:id - Update data:', updateData);

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const { error } = await db
      .from('playgrounds')
      .update(updateData)
      .eq('id', id);

    console.log('PUT /admin/playgrounds/:id - Update error:', error);
    
    // Verify the update actually happened
    const { data: verification } = await db
      .from('playgrounds')
      .select('is_active')
      .eq('id', id)
      .single();
    
    console.log('PUT /admin/playgrounds/:id - Verification after update:', verification);

    if (error) {
      console.error('Error updating playground:', error);
      res.status(500).json({ error: 'Failed to update playground' });
      return;
    }

    // Fetch updated playground
    const { data: updatedPlayground, error: fetchError } = await db
      .from('playgrounds')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updatedPlayground) {
      // Update succeeded but fetch failed - this is OK, just return success
      res.json({ message: 'Playground updated successfully' });
      return;
    }

    res.json({ data: updatedPlayground });
  } catch (error) {
    console.error('Error updating playground:', error);
    res.status(500).json({ error: 'Failed to update playground' });
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

    if (error) {
      console.error('Error deleting playground:', error);
      res.status(500).json({ error: 'Failed to delete playground' });
      return;
    }

    res.json({ message: 'Playground deleted' });
  } catch (error) {
    console.error('Error deleting playground:', error);
    res.status(500).json({ error: 'Failed to delete playground' });
  }
});

/**
 * GET /admin/playgrounds/:id/metrics
 * Get playground metrics and dashboard data
 */
router.get('/playgrounds/:id/metrics', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify playground exists (any admin can access)
    const { data: playground, error: checkError } = await db
      .from('playgrounds')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !playground) {
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    // Get evaluation count per model
    const { data: counters } = await db
      .from('evaluation_counters')
      .select('*')
      .eq('playground_id', id);

    // Get all questions for this playground
    const { data: questions } = await db
      .from('questions')
      .select('*')
      .eq('playground_id', id)
      .order('order_index', { ascending: true });

    // Get all evaluations for detailed metrics
    const { data: evaluations, error: evalsError } = await db
      .from('evaluations')
      .select('question_id, answer_text, answer_value, model_key, user_id, created_at')
      .eq('playground_id', id);

    console.log('Metrics Debug - Evaluations error:', evalsError);
    console.log('Metrics Debug - Sample evaluation:', evaluations?.[0]);

    // Calculate question metrics
    const questionMetrics = questions?.map((question) => {
      const questionEvals = evaluations?.filter((e) => e.question_id === question.id) || [];
      const totalResponses = questionEvals.length;

      let optionDistribution = null;

      if (question.question_type === 'select' && question.options) {
        // Calculate distribution for select questions
        const counts: Record<string, number> = {};
        questionEvals.forEach((e) => {
          if (e.answer_value) {
            counts[e.answer_value] = (counts[e.answer_value] || 0) + 1;
          }
        });

        optionDistribution = question.options.map((opt: any) => ({
          option: opt.label,
          value: opt.value,
          count: counts[opt.value] || 0,
          percentage: totalResponses > 0 ? ((counts[opt.value] || 0) / totalResponses) * 100 : 0,
        }));
      }

      return {
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        total_responses: totalResponses,
        option_distribution: optionDistribution,
      };
    }) || [];

    // Get open-ended responses
    const openResponses = evaluations
      ?.filter((e) => {
        const question = questions?.find((q) => q.id === e.question_id);
        return question?.question_type === 'input_string' && e.answer_text;
      })
      .map((e) => {
        const question = questions?.find((q) => q.id === e.question_id);
        return {
          question_id: e.question_id,
          question_text: question?.question_text || '',
          answer_text: e.answer_text,
          model_key: e.model_key,
          created_at: e.created_at,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100) || []; // Limit to 100 most recent

    // Get total evaluations and unique testers
    const { data: allEvaluations } = await db
      .from('evaluations')
      .select('user_id, session_id')
      .eq('playground_id', id);

    console.log('Metrics Debug - Playground ID:', id);
    console.log('Metrics Debug - Counters:', counters);
    console.log('Metrics Debug - Questions count:', questions?.length);
    console.log('Metrics Debug - Evaluations count:', evaluations?.length);
    console.log('Metrics Debug - All evaluations count:', allEvaluations?.length);

    // Get full playground data for status
    const { data: fullPlayground }: any = await db
      .from('playgrounds')
      .select('is_active')
      .eq('id', id)
      .single();

    // Count unique sessions (each session = 1 complete evaluation)
    const uniqueSessions = new Set(allEvaluations?.map((e: any) => e.session_id).filter(Boolean));
    const totalEvaluations = uniqueSessions.size;
    const uniqueTesters = new Set(allEvaluations?.map((e: any) => e.user_id)).size;

    console.log('Metrics Debug - Unique sessions:', uniqueSessions.size);
    console.log('Metrics Debug - Unique testers:', uniqueTesters);
    console.log('Metrics Debug - Total from counters:', counters?.reduce((sum: number, c: any) => sum + c.current_count, 0));

    // Get individual evaluations with user details
    const { data: individualEvaluations } = await db
      .from('evaluations')
      .select(`
        id,
        session_id,
        model_key,
        created_at,
        user_id,
        users!inner(email, full_name)
      `)
      .eq('playground_id', id)
      .order('created_at', { ascending: false });

    // Group evaluations by session
    const evaluationsBySession: Record<string, any> = {};
    individualEvaluations?.forEach((evaluation: any) => {
      const sessionId = evaluation.session_id;
      if (!sessionId) return;

      // Extract user info (users might be returned as array by Supabase)
      const userInfo = Array.isArray(evaluation.users) 
        ? evaluation.users[0] 
        : evaluation.users;

      if (!evaluationsBySession[sessionId]) {
        evaluationsBySession[sessionId] = {
          session_id: sessionId,
          user_id: evaluation.user_id,
          user_email: userInfo?.email || 'Desconhecido',
          user_name: userInfo?.full_name || null,
          model_key: evaluation.model_key,
          created_at: evaluation.created_at,
          evaluation_count: 0,
        };
      }
      evaluationsBySession[sessionId].evaluation_count++;
    });

    const evaluationsList = Object.values(evaluationsBySession).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({
      data: {
        counters,
        selectMetrics: questionMetrics.filter((q) => q.question_type === 'select'),
        questionMetrics: questionMetrics, // All questions
        openResponses,
        evaluationsList, // Individual evaluations grouped by session
        stats: {
          totalEvaluations,
          uniqueTesters,
          status: fullPlayground?.is_active ? 'in_progress' : 'completed',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /admin/playgrounds/:id/evaluations/:sessionId
 * Get detailed evaluation responses for a specific session
 */
router.get('/playgrounds/:id/evaluations/:sessionId', adminOnly, async (req: Request, res: Response) => {
  try {
    const { id: playgroundId, sessionId } = req.params;

    // Verify playground exists (any admin can view evaluations)
    const { data: playground, error: checkError } = await db
      .from('playgrounds')
      .select('id')
      .eq('id', playgroundId)
      .single();

    if (checkError || !playground) {
      res.status(404).json({ error: 'Playground not found' });
      return;
    }

    // Get all evaluations for this session with question details
    const { data: evaluationDetails } = await db
      .from('evaluations')
      .select(`
        id,
        question_id,
        answer_text,
        answer_value,
        rating,
        model_key,
        created_at,
        user_id,
        users!inner(email, full_name),
        questions!inner(question_text, question_type, options)
      `)
      .eq('playground_id', playgroundId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!evaluationDetails || evaluationDetails.length === 0) {
      res.status(404).json({ error: 'Evaluation not found' });
      return;
    }

    // Extract user info (users is returned as array by Supabase)
    const userInfo = Array.isArray(evaluationDetails[0].users) 
      ? evaluationDetails[0].users[0] 
      : evaluationDetails[0].users;
    
    const questionInfo = Array.isArray(evaluationDetails[0].questions)
      ? evaluationDetails[0].questions[0]
      : evaluationDetails[0].questions;

    const formattedDetails = {
      session_id: sessionId,
      user_email: userInfo?.email || '',
      user_name: userInfo?.full_name || null,
      model_key: evaluationDetails[0].model_key,
      created_at: evaluationDetails[0].created_at,
      responses: evaluationDetails.map((e: any) => {
        const question = Array.isArray(e.questions) ? e.questions[0] : e.questions;
        return {
          question_id: e.question_id,
          question_text: question?.question_text || '',
          question_type: question?.question_type || '',
          answer_text: e.answer_text,
          answer_value: e.answer_value,
          answer_label: question?.options?.find((opt: any) => opt.value === e.answer_value)?.label || e.answer_value,
          rating: e.rating,
        };
      }),
    };

    res.json({ data: formattedDetails });
  } catch (error) {
    console.error('Error fetching evaluation details:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation details' });
  }
});

/**
 * GET /admin/users
 * List all users (emails) for playground access control
 */
router.get('/users', adminOnly, async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await db
      .from('users')
      .select('id, email, role, created_at')
      .order('email', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
      return;
    }

    res.json({ data: users });
  } catch (error) {
    console.error('Error in GET /admin/users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
