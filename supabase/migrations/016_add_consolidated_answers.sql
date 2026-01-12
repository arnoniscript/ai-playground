-- Add consolidated answers system for data labeling

-- Add new status 'ignored' to parent_tasks
ALTER TABLE parent_tasks
  ADD COLUMN IF NOT EXISTS ignore_reason TEXT,
  ADD COLUMN IF NOT EXISTS consolidated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consolidated_by UUID REFERENCES users(id);

-- Update status check constraint to include 'ignored'
ALTER TABLE parent_tasks DROP CONSTRAINT IF EXISTS parent_tasks_status_check;
ALTER TABLE parent_tasks ADD CONSTRAINT parent_tasks_status_check 
  CHECK (status IN ('active', 'consolidated', 'returned_to_pipe', 'ignored'));

-- Create consolidated_answers table to store admin's final consolidated answers
CREATE TABLE IF NOT EXISTS consolidated_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES parent_tasks(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  
  -- The consolidated answer (can be from existing evaluation or new admin answer)
  answer_value TEXT, -- for select/boolean questions
  answer_text TEXT, -- for text questions
  
  -- If admin selected an existing evaluation answer
  source_evaluation_id UUID, -- references parent_task_evaluations(id) if selected existing answer
  
  -- Admin who did the consolidation
  consolidated_by UUID NOT NULL REFERENCES users(id),
  consolidated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one consolidated answer per question per parent task
  UNIQUE(parent_task_id, question_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_consolidated_answers_parent_task 
  ON consolidated_answers(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_answers_question 
  ON consolidated_answers(question_id);

-- RLS Policies
ALTER TABLE consolidated_answers ENABLE ROW LEVEL SECURITY;

-- Admins can read all consolidated answers
CREATE POLICY consolidated_answers_admin_read ON consolidated_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admins can insert/update consolidated answers
CREATE POLICY consolidated_answers_admin_write ON consolidated_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
