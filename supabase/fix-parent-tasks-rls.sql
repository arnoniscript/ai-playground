-- Fix RLS policies for parent_tasks to work with service role
-- Run this directly in Supabase SQL Editor

-- Drop existing admin policy
DROP POLICY IF EXISTS "parent_tasks_admin_all" ON parent_tasks;

-- Create new policy that allows service role (backend) to do everything
-- Service role bypasses RLS by default, but we need explicit policy for it
CREATE POLICY "Service role can manage all parent_tasks" ON parent_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Similarly fix parent_task_evaluations
DROP POLICY IF EXISTS "parent_task_evaluations_admin_select" ON parent_task_evaluations;
DROP POLICY IF EXISTS "parent_task_evaluations_qa_insert" ON parent_task_evaluations;
DROP POLICY IF EXISTS "parent_task_evaluations_qa_select" ON parent_task_evaluations;

CREATE POLICY "Service role can manage all parent_task_evaluations" ON parent_task_evaluations
  FOR ALL
  USING (true)
  WITH CHECK (true);
