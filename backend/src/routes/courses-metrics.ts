import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/courses/:courseId/metrics
 * Get comprehensive metrics for a course
 */
router.get(
  '/:courseId/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;

    // Get course info
    const { data: course } = await db.from('courses').select('id, title').eq('id', courseId).single();

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get total enrollments
    const { count: totalEnrollments } = await db
      .from('user_course_progress')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Get total completions
    const { count: totalCompletions } = await db
      .from('user_course_progress')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('completed', true);

    // Calculate completion rate
    const completionRate =
      totalEnrollments && totalEnrollments > 0 ? (totalCompletions! / totalEnrollments) * 100 : 0;

    // Get all attempts for average score calculation
    const { data: allAttempts } = await db
      .from('user_step_attempts')
      .select('score, total_questions, step:course_steps!inner(course_id)')
      .eq('step.course_id', courseId);

    let averageScore = 0;
    if (allAttempts && allAttempts.length > 0) {
      const totalPercentage = allAttempts.reduce((sum, att) => {
        return sum + (att.score / att.total_questions) * 100;
      }, 0);
      averageScore = totalPercentage / allAttempts.length;
    }

    // Get step metrics
    const { data: steps } = await db
      .from('course_steps')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    const stepMetrics = [];

    for (const step of steps || []) {
      // Get attempts for this step
      const { data: stepAttempts } = await db
        .from('user_step_attempts')
        .select('*')
        .eq('step_id', step.id);

      const totalAttempts = stepAttempts?.length || 0;
      
      // Get unique users
      const uniqueUsers = new Set(stepAttempts?.map(a => a.user_id)).size;

      // Calculate average score
      let stepAvgScore = 0;
      if (stepAttempts && stepAttempts.length > 0) {
        const totalPerc = stepAttempts.reduce((sum, att) => {
          return sum + (att.score / att.total_questions) * 100;
        }, 0);
        stepAvgScore = totalPerc / stepAttempts.length;
      }

      // Calculate pass rate
      const passedCount = stepAttempts?.filter(a => a.passed).length || 0;
      const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0;

      // Calculate average attempts to pass
      const userFirstPass = new Map();
      stepAttempts?.forEach(att => {
        if (att.passed) {
          if (!userFirstPass.has(att.user_id) || att.attempt_number < userFirstPass.get(att.user_id)) {
            userFirstPass.set(att.user_id, att.attempt_number);
          }
        }
      });
      
      const avgAttemptsToPass = userFirstPass.size > 0
        ? Array.from(userFirstPass.values()).reduce((a, b) => a + b, 0) / userFirstPass.size
        : 0;

      stepMetrics.push({
        step_id: step.id,
        step_title: step.title,
        step_order: step.order_index,
        total_attempts: totalAttempts,
        unique_users: uniqueUsers,
        average_score: stepAvgScore,
        pass_rate: passRate,
        average_attempts_to_pass: avgAttemptsToPass,
      });
    }

    const metrics = {
      course_id: course.id,
      course_title: course.title,
      total_enrollments: totalEnrollments || 0,
      total_completions: totalCompletions || 0,
      completion_rate: completionRate,
      average_score: averageScore,
      step_metrics: stepMetrics,
    };

    res.json({ data: metrics });
  })
);

/**
 * GET /api/admin/courses/:courseId/users
 * Get detailed metrics for all users in a course
 */
router.get(
  '/:courseId/users',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;

    // Get all users enrolled
    const { data: progressRecords } = await db
      .from('user_course_progress')
      .select(`
        *,
        user:users(email, full_name)
      `)
      .eq('course_id', courseId)
      .order('started_at', { ascending: false });

    // Get total steps
    const { count: totalSteps } = await db
      .from('course_steps')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    const userMetrics = [];

    for (const progress of progressRecords || []) {
      // Get current step order
      let currentStepOrder = 0;
      if (progress.completed) {
        // If completed, show 100%
        currentStepOrder = totalSteps || 0;
      } else if (progress.current_step_id) {
        const { data: currentStep } = await db
          .from('course_steps')
          .select('order_index')
          .eq('id', progress.current_step_id)
          .single();
        
        if (currentStep) {
          // order_index is 0-based, so add 1 for display
          currentStepOrder = currentStep.order_index + 1;
        }
      }

      // Get step attempts for this user
      const { data: attempts } = await db
        .from('user_step_attempts')
        .select(`
          *,
          step:course_steps!inner(id, title, order_index, course_id)
        `)
        .eq('user_id', progress.user_id)
        .eq('step.course_id', courseId)
        .order('step.order_index', { ascending: true });

      // Group by step
      const stepMap = new Map();
      attempts?.forEach(att => {
        const stepId = (att.step as any).id;
        if (!stepMap.has(stepId)) {
          stepMap.set(stepId, {
            step_id: stepId,
            step_title: (att.step as any).title,
            attempts: 0,
            best_score: 0,
            total_questions: att.total_questions,
            passed: false,
          });
        }
        const stepData = stepMap.get(stepId);
        stepData.attempts++;
        stepData.best_score = Math.max(stepData.best_score, att.score);
        if (att.passed) stepData.passed = true;
      });

      userMetrics.push({
        user_id: progress.user_id,
        user_email: (progress.user as any)?.email || '',
        user_name: (progress.user as any)?.full_name || null,
        course_id: courseId,
        started_at: progress.started_at,
        completed_at: progress.completed_at,
        completed: progress.completed,
        current_step_order: currentStepOrder,
        total_steps: totalSteps || 0,
        step_attempts: Array.from(stepMap.values()),
      });
    }

    res.json({ data: userMetrics });
  })
);

/**
 * GET /api/admin/courses/:courseId/users/:userId
 * Get detailed metrics for a specific user in a course
 */
router.get(
  '/:courseId/users/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId, userId } = req.params;

    // Get user progress
    const { data: progress } = await db
      .from('user_course_progress')
      .select(`
        *,
        user:users(email, full_name)
      `)
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .single();

    if (!progress) {
      res.status(404).json({ error: 'User not enrolled in this course' });
      return;
    }

    // Get total steps
    const { count: totalSteps } = await db
      .from('course_steps')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    // Get current step order
    let currentStepOrder = 0;
    if (progress.completed) {
      // If completed, show 100%
      currentStepOrder = totalSteps || 0;
    } else if (progress.current_step_id) {
      const { data: currentStep } = await db
        .from('course_steps')
        .select('order_index')
        .eq('id', progress.current_step_id)
        .single();
      
      if (currentStep) {
        // order_index is 0-based, so add 1 for display
        currentStepOrder = currentStep.order_index + 1;
      }
    }

    // Get attempts
    const { data: attempts } = await db
      .from('user_step_attempts')
      .select(`
        *,
        step:course_steps!inner(id, title, order_index, course_id)
      `)
      .eq('user_id', userId)
      .eq('step.course_id', courseId);

    // Group by step
    const stepMap = new Map();
    attempts?.forEach(att => {
      const stepId = (att.step as any).id;
      if (!stepMap.has(stepId)) {
        stepMap.set(stepId, {
          step_id: stepId,
          step_title: (att.step as any).title,
          attempts: 0,
          best_score: 0,
          total_questions: att.total_questions,
          passed: false,
        });
      }
      const stepData = stepMap.get(stepId);
      stepData.attempts++;
      stepData.best_score = Math.max(stepData.best_score, att.score);
      if (att.passed) stepData.passed = true;
    });

    const userMetrics = {
      user_id: userId,
      user_email: (progress.user as any)?.email || '',
      user_name: (progress.user as any)?.full_name || null,
      course_id: courseId,
      started_at: progress.started_at,
      completed_at: progress.completed_at,
      completed: progress.completed,
      current_step_order: currentStepOrder,
      total_steps: totalSteps || 0,
      step_attempts: Array.from(stepMap.values()),
    };

    res.json({ data: userMetrics });
  })
);

/**
 * GET /api/admin/courses/:courseId/steps/:stepId/metrics
 * Get detailed metrics for a specific step
 */
router.get(
  '/:courseId/steps/:stepId/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const { stepId } = req.params;

    // Get step info
    const { data: step } = await db.from('course_steps').select('*').eq('id', stepId).single();

    if (!step) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    // Get all attempts
    const { data: attempts } = await db
      .from('user_step_attempts')
      .select(`
        *,
        user:users(email, full_name)
      `)
      .eq('step_id', stepId)
      .order('attempted_at', { ascending: false });

    const totalAttempts = attempts?.length || 0;
    const uniqueUsers = new Set(attempts?.map(a => a.user_id)).size;

    let avgScore = 0;
    if (attempts && attempts.length > 0) {
      const totalPerc = attempts.reduce((sum, att) => {
        return sum + (att.score / att.total_questions) * 100;
      }, 0);
      avgScore = totalPerc / attempts.length;
    }

    const passedCount = attempts?.filter(a => a.passed).length || 0;
    const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0;

    res.json({
      data: {
        step,
        metrics: {
          total_attempts: totalAttempts,
          unique_users: uniqueUsers,
          average_score: avgScore,
          pass_rate: passRate,
        },
        attempts: attempts || [],
      },
    });
  })
);

export default router;
