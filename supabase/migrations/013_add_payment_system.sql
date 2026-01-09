-- Migration 013: Add payment system for playgrounds and QA earnings
-- Created: 2026-01-08

-- Add payment fields to playgrounds table
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('per_hour', 'per_task', 'per_goal'));
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS payment_value DECIMAL(10, 2); -- Value in BRL
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS max_time_per_task INTEGER; -- Max minutes paid for per_hour type
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS tasks_for_goal INTEGER; -- Number of tasks to complete goal (per_goal type)

-- Create qa_earnings table to track QA payments
CREATE TABLE IF NOT EXISTS qa_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Amount earned in BRL
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'ready_for_payment', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate entries for same evaluation
  UNIQUE(evaluation_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_qa_earnings_user_id ON qa_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_earnings_playground_id ON qa_earnings(playground_id);
CREATE INDEX IF NOT EXISTS idx_qa_earnings_status ON qa_earnings(status);
CREATE INDEX IF NOT EXISTS idx_qa_earnings_submitted_at ON qa_earnings(submitted_at DESC);

-- RLS Policies for qa_earnings
ALTER TABLE qa_earnings ENABLE ROW LEVEL SECURITY;

-- Admins can see and manage all earnings
CREATE POLICY "Admins can manage all earnings"
ON qa_earnings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- QAs can see their own earnings
CREATE POLICY "QAs can view own earnings"
ON qa_earnings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert earnings (via backend)
CREATE POLICY "Backend can insert earnings"
ON qa_earnings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create view for earnings summary by user
CREATE OR REPLACE VIEW qa_earnings_summary AS
SELECT 
  user_id,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_count,
  SUM(CASE WHEN status = 'ready_for_payment' THEN 1 ELSE 0 END) as ready_for_payment_count,
  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
  SUM(CASE WHEN status = 'under_review' THEN amount ELSE 0 END) as under_review_amount,
  SUM(CASE WHEN status = 'ready_for_payment' THEN amount ELSE 0 END) as ready_for_payment_amount,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
  SUM(amount) as total_earned
FROM qa_earnings
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON qa_earnings_summary TO authenticated;
