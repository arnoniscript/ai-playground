import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { SubmitEvaluationSchema } from '../schemas/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserAccessiblePlaygrounds, userHasPlaygroundAccess } from '../utils/playground-access.js';
import { calculateEarning } from './earnings.js';
import { generateBrazilianPerson } from '../utils/brazilian-person-generator.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /playgrounds/generate-brazilian-person
 * Generate random Brazilian person data for testing
 */
router.get('/generate-brazilian-person', async (req: Request, res: Response) => {
  try {
    const person = generateBrazilianPerson();
    res.json({ data: person });
  } catch (error) {
    console.error('Error generating Brazilian person:', error);
    res.status(500).json({ error: 'Failed to generate person data' });
  }
});

/**
 * GET /playgrounds
 * List available playgrounds for the current user based on their role and authorizations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userEmail = req.user!.email;

    // Get accessible playground IDs for this user
    const accessibleIds = await getUserAccessiblePlaygrounds(userId, userRole, userEmail);

    if (accessibleIds.length === 0) {
      res.json({ data: [] });
      return;
    }

    // Fetch full playground data
    const { data: playgrounds, error } = await db
      .from('playgrounds')
      .select('*')
      .in('id', accessibleIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userEmail = req.user!.email;

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

    // Check if user has access to this playground
    const accessCheck = await userHasPlaygroundAccess(userId, id, userRole, userEmail);
    
    if (!accessCheck.hasAccess) {
      res.status(403).json({ 
        error: 'Access denied',
        reason: accessCheck.reason 
      });
      return;
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

    console.log('Playground data with tools:', {
      id: playground.id,
      name: playground.name,
      tools: playground.tools,
      hasTools: !!playground.tools,
    });

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
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userEmail = req.user!.email;

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

    // Check if user has access to this playground
    const accessCheck = await userHasPlaygroundAccess(userId, playgroundId, userRole, userEmail);
    
    if (!accessCheck.hasAccess) {
      res.status(403).json({ 
        error: 'Access denied',
        reason: accessCheck.reason 
      });
      return;
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

    // If playground is paid and user is QA, calculate and save earning
    if (playground.is_paid && userRole === 'qa' && payload.time_spent_seconds !== undefined) {
      try {
        console.log('Processing earning for QA:', { userId, playgroundId, timeSpent: payload.time_spent_seconds });
        
        // Get user's completed tasks count for per_goal calculation
        const { count: completedTasks } = await db
          .from('qa_earnings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('playground_id', playgroundId);

        const amount = calculateEarning(
          playground.payment_type,
          playground.payment_value,
          payload.time_spent_seconds,
          playground.max_time_per_task,
          playground.tasks_for_goal,
          completedTasks || 0
        );

        console.log('Calculated earning amount:', amount);

        // Create earning even if amount is 0 (for tracking purposes)
        // Admin can later adjust or approve based on actual work
        const earningData = {
          id: uuidv4(),
          user_id: userId,
          playground_id: playgroundId,
          evaluation_id: payload.session_id, // Use session_id to group all answers
          task_name: playground.name,
          submitted_at: new Date().toISOString(),
          time_spent_seconds: payload.time_spent_seconds || 0,
          amount: Math.max(0, amount), // Ensure non-negative
          status: 'under_review',
        };

        console.log('Inserting earning:', earningData);

        const { error: earningError } = await db
          .from('qa_earnings')
          .insert(earningData);

        if (earningError) {
          console.error('Error creating earning:', earningError);
          // Don't fail the whole request if earning fails
        } else {
          console.log('✅ Earning created successfully');
        }
      } catch (earningCalcError) {
        console.error('Error calculating earning:', earningCalcError);
        // Don't fail the whole request if earning calculation fails
      }
    } else {
      console.log('Earning not created:', { 
        is_paid: playground.is_paid, 
        userRole, 
        time_spent_seconds: payload.time_spent_seconds 
      });
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
