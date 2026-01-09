import { Router } from 'express';
import { supabase } from '../db/client';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { PaymentType, EarningStatus } from '../types';

const router = Router();

// QA: Get own earnings with filters
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { status, playground_id, limit = '20', offset = '0' } = req.query;

    let query = supabase
      .from('qa_earnings')
      .select('*, playgrounds(name), users(email, full_name)', { count: 'exact' })
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (playground_id) {
      query = query.eq('playground_id', playground_id);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      data: data || [],
      total: count || 0,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
      pages: totalPages,
    });
  })
);

// QA: Get evaluation answers for a specific earning
router.get(
  '/:id/answers',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get earning and verify ownership
    const { data: earning, error: earningError } = await supabase
      .from('qa_earnings')
      .select('*, playgrounds(name), users(email, full_name)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (earningError || !earning) {
      return res.status(404).json({ error: 'Earning not found' });
    }

    // First, try to get the session_id from the evaluation_id
    // evaluation_id might be either a session_id or an individual evaluation id
    let sessionId = earning.evaluation_id;
    
    // Try to find an evaluation with this id to get its session_id
    const { data: evalCheck } = await supabase
      .from('evaluations')
      .select('session_id')
      .eq('id', earning.evaluation_id)
      .single();
    
    if (evalCheck) {
      sessionId = evalCheck.session_id;
    }

    // Get evaluation answers using the correct session_id
    const { data: answers, error: answersError } = await supabase
      .from('evaluations')
      .select('id, question_id, answer_text, answer_value, questions(question_text, question_type, options)')
      .eq('session_id', sessionId);

    if (answersError) {
      return res.status(500).json({ error: answersError.message });
    }

    res.json({
      data: {
        earning,
        answers: answers || [],
      },
    });
  })
);

// QA: Get own earnings summary
router.get(
  '/summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('qa_earnings_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      data: data || {
        user_id: userId,
        total_tasks: 0,
        under_review_count: 0,
        under_review_amount: 0,
        ready_for_payment_count: 0,
        ready_for_payment_amount: 0,
        paid_count: 0,
        paid_amount: 0,
        rejected_count: 0,
        rejected_amount: 0,
        total_earned: 0,
      },
    });
  })
);

// Admin: Get all earnings with filters
router.get(
  '/admin',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      status,
      user_id,
      playground_id,
      limit = '20',
      offset = '0',
      from_date,
      to_date,
    } = req.query;

    let query = supabase
      .from('qa_earnings')
      .select(
        '*, users(email, full_name, document_number, nationality, phone, birth_date), playgrounds(name)',
        { count: 'exact' }
      )
      .order('submitted_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (playground_id) {
      query = query.eq('playground_id', playground_id);
    }

    if (from_date) {
      query = query.gte('submitted_at', from_date);
    }

    if (to_date) {
      query = query.lte('submitted_at', to_date);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      data: data || [],
      total: count || 0,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
      pages: totalPages,
    });
  })
);

// Admin: Get evaluation answers for a specific earning
router.get(
  '/admin/:id/answers',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    // Get earning (no ownership check for admin)
    const { data: earning, error: earningError } = await supabase
      .from('qa_earnings')
      .select('*, playgrounds(name), users(email, full_name)')
      .eq('id', id)
      .single();

    if (earningError || !earning) {
      return res.status(404).json({ error: 'Earning not found' });
    }

    // First, try to get the session_id from the evaluation_id
    // evaluation_id might be either a session_id or an individual evaluation id
    let sessionId = earning.evaluation_id;
    
    // Try to find an evaluation with this id to get its session_id
    const { data: evalCheck } = await supabase
      .from('evaluations')
      .select('session_id')
      .eq('id', earning.evaluation_id)
      .single();
    
    if (evalCheck) {
      sessionId = evalCheck.session_id;
    }

    // Get evaluation answers using the correct session_id
    const { data: answers, error: answersError } = await supabase
      .from('evaluations')
      .select('id, question_id, answer_text, answer_value, questions(question_text, question_type, options)')
      .eq('session_id', sessionId);

    if (answersError) {
      return res.status(500).json({ error: answersError.message });
    }

    res.json({
      data: {
        earning,
        answers: answers || [],
      },
    });
  })
);

// Admin: Get earnings statistics
router.get(
  '/admin/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: underReview, error: err1 } = await supabase
      .from('qa_earnings')
      .select('amount')
      .eq('status', 'under_review');

    const { data: readyForPayment, error: err2 } = await supabase
      .from('qa_earnings')
      .select('amount')
      .eq('status', 'ready_for_payment');

    const { data: paid, error: err3 } = await supabase
      .from('qa_earnings')
      .select('amount')
      .eq('status', 'paid');

    if (err1 || err2 || err3) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const stats = {
      under_review: {
        count: underReview?.length || 0,
        total: underReview?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      },
      ready_for_payment: {
        count: readyForPayment?.length || 0,
        total:
          readyForPayment?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      },
      paid: {
        count: paid?.length || 0,
        total: paid?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      },
    };

    res.json({ data: stats });
  })
);

// Admin: Approve earning (move to ready_for_payment)
router.put(
  '/admin/:id/approve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('qa_earnings')
      .update({ status: 'ready_for_payment' as EarningStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  })
);

// Admin: Mark as paid
router.put(
  '/admin/:id/pay',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('qa_earnings')
      .update({
        status: 'paid' as EarningStatus,
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  })
);

// Admin: Reject earning
router.put(
  '/admin/:id/reject',
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const { data, error } = await supabase
      .from('qa_earnings')
      .update({
        status: 'rejected' as EarningStatus,
        rejected_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  })
);

// Helper function to calculate earnings based on payment type
export function calculateEarning(
  paymentType: PaymentType,
  paymentValue: number,
  timeSpentSeconds: number,
  maxTimePerTask: number | null,
  tasksForGoal: number | null,
  completedTasks: number
): number {
  switch (paymentType) {
    case 'per_hour': {
      const hours = timeSpentSeconds / 3600;
      let amount = hours * paymentValue;

      // Apply max time cap if specified
      if (maxTimePerTask) {
        const maxMinutes = maxTimePerTask;
        const maxSeconds = maxMinutes * 60;
        if (timeSpentSeconds > maxSeconds) {
          const cappedHours = maxSeconds / 3600;
          amount = cappedHours * paymentValue;
        }
      }

      return Math.round(amount * 100) / 100; // Round to 2 decimals
    }

    case 'per_task': {
      return paymentValue;
    }

    case 'per_goal': {
      // Pay only when goal is reached
      if (tasksForGoal && completedTasks >= tasksForGoal) {
        return paymentValue;
      }
      return 0;
    }

    default:
      return 0;
  }
}

export default router;
