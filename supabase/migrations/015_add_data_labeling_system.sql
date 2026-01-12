-- Migration: Add Data Labeling System
-- Description: Creates infrastructure for data labeling playgrounds with ZIP upload,
--              parent tasks (main tasks from files), repetitions control, and consolidation workflow

-- 1. Add new playground type
ALTER TYPE playground_type ADD VALUE IF NOT EXISTS 'data_labeling';

-- 2. Add new question type for boolean questions
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'boolean';

-- 3. Create parent_tasks table (main tasks from ZIP files)
CREATE TABLE IF NOT EXISTS parent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playground_id UUID NOT NULL REFERENCES playgrounds(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'text')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  
  -- Repetition control
  max_repetitions INTEGER NOT NULL DEFAULT 1,
  current_repetitions INTEGER NOT NULL DEFAULT 0,
  
  -- Consolidation status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consolidated', 'returned_to_pipe')),
  consolidated_at TIMESTAMPTZ,
  consolidated_by UUID REFERENCES users(id),
  
  -- Annotations for returned tasks
  admin_notes TEXT,
  extra_repetitions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX idx_parent_tasks_playground ON parent_tasks(playground_id);
CREATE INDEX idx_parent_tasks_status ON parent_tasks(status);
CREATE INDEX idx_parent_tasks_repetitions ON parent_tasks(playground_id, status, current_repetitions, max_repetitions);

-- 5. Create table to track which users evaluated which parent tasks
CREATE TABLE IF NOT EXISTS parent_task_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_task_id UUID NOT NULL REFERENCES parent_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- UUID to group evaluations, not a foreign key
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent same user from evaluating same parent task twice
  UNIQUE(parent_task_id, user_id)
);

CREATE INDEX idx_parent_task_evaluations_parent ON parent_task_evaluations(parent_task_id);
CREATE INDEX idx_parent_task_evaluations_user ON parent_task_evaluations(user_id);

-- 6. Add fields to playgrounds table for data labeling configuration
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS repetitions_per_task INTEGER DEFAULT 1;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS auto_calculate_evaluations BOOLEAN DEFAULT FALSE;
ALTER TABLE playgrounds ADD COLUMN IF NOT EXISTS has_returned_tasks BOOLEAN DEFAULT FALSE;

-- 7. Make model_key nullable in evaluations table (for data_labeling playgrounds)
ALTER TABLE evaluations ALTER COLUMN model_key DROP NOT NULL;

-- 8. Note: sessions table doesn't exist - session_id is just a UUID for grouping
--    parent_task_id relationship is tracked via parent_task_evaluations table

-- 9. Create function to get next available parent task for user
CREATE OR REPLACE FUNCTION get_next_parent_task(
  p_playground_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  parent_task_id UUID,
  file_name TEXT,
  file_type TEXT,
  file_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.file_name,
    pt.file_type,
    pt.file_url
  FROM parent_tasks pt
  WHERE pt.playground_id = p_playground_id
    AND pt.status IN ('active', 'returned_to_pipe')
    AND pt.current_repetitions < (pt.max_repetitions + pt.extra_repetitions)
    AND NOT EXISTS (
      SELECT 1 FROM parent_task_evaluations pte
      WHERE pte.parent_task_id = pt.id AND pte.user_id = p_user_id
    )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to increment parent task repetition counter
CREATE OR REPLACE FUNCTION increment_parent_task_repetition()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE parent_tasks
  SET 
    current_repetitions = current_repetitions + 1,
    updated_at = NOW()
  WHERE id = NEW.parent_task_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_parent_task_repetition
  AFTER INSERT ON parent_task_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION increment_parent_task_repetition();

-- 11. Create function to calculate total evaluations for data labeling playground
CREATE OR REPLACE FUNCTION calculate_data_labeling_evaluations(p_playground_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(max_repetitions + extra_repetitions), 0)
  INTO total
  FROM parent_tasks
  WHERE playground_id = p_playground_id
    AND status IN ('active', 'returned_to_pipe');
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to get consolidation data
CREATE OR REPLACE FUNCTION get_parent_task_consolidation_data(p_parent_task_id UUID)
RETURNS TABLE (
  parent_task_id UUID,
  file_name TEXT,
  file_type TEXT,
  file_url TEXT,
  max_repetitions INTEGER,
  current_repetitions INTEGER,
  status TEXT,
  evaluations_json JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.file_name,
    pt.file_type,
    pt.file_url,
    pt.max_repetitions,
    pt.current_repetitions,
    pt.status,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', eval_data.user_id,
            'user_email', eval_data.user_email,
            'user_name', eval_data.user_name,
            'evaluated_at', eval_data.evaluated_at,
            'session_id', eval_data.session_id,
            'answers', eval_data.answers
          ) ORDER BY eval_data.evaluated_at DESC
        )
        FROM (
          SELECT DISTINCT ON (pte.id)
            pte.id as eval_id,
            pte.user_id,
            u.email as user_email,
            u.full_name as user_name,
            pte.evaluated_at,
            pte.session_id,
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'question_id', answers_data.question_id,
                  'question_text', answers_data.question_text,
                  'question_type', answers_data.question_type,
                  'answer', answers_data.answer
                ) ORDER BY answers_data.order_index
              )
              FROM (
                SELECT DISTINCT ON (e.question_id)
                  e.question_id,
                  q.question_text,
                  q.question_type,
                  q.order_index,
                  COALESCE(e.answer_value, e.answer_text, e.rating::text) as answer
                FROM evaluations e
                JOIN questions q ON q.id = e.question_id
                WHERE e.session_id = pte.session_id
                ORDER BY e.question_id, q.order_index
              ) answers_data
            ) as answers
          FROM parent_task_evaluations pte
          JOIN users u ON u.id = pte.user_id
          WHERE pte.parent_task_id = pt.id
        ) eval_data
      ),
      '[]'::jsonb
    ) as evaluations_json
  FROM parent_tasks pt
  WHERE pt.id = p_parent_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to consolidate parent task
CREATE OR REPLACE FUNCTION consolidate_parent_task(
  p_parent_task_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE parent_tasks
  SET 
    status = 'consolidated',
    consolidated_at = NOW(),
    consolidated_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_parent_task_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create function to return parent task to pipe
CREATE OR REPLACE FUNCTION return_parent_task_to_pipe(
  p_parent_task_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT,
  p_extra_repetitions INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_playground_id UUID;
BEGIN
  -- Get playground_id and update task
  UPDATE parent_tasks
  SET 
    status = 'returned_to_pipe',
    admin_notes = p_admin_notes,
    extra_repetitions = p_extra_repetitions,
    consolidated_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_parent_task_id
  RETURNING playground_id INTO v_playground_id;
  
  -- Mark playground as having returned tasks
  UPDATE playgrounds
  SET has_returned_tasks = TRUE
  WHERE id = v_playground_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create function to get data labeling metrics
CREATE OR REPLACE FUNCTION get_data_labeling_metrics(p_playground_id UUID)
RETURNS TABLE (
  total_parent_tasks INTEGER,
  active_parent_tasks INTEGER,
  consolidated_parent_tasks INTEGER,
  returned_parent_tasks INTEGER,
  total_expected_evaluations INTEGER,
  completed_evaluations INTEGER,
  completion_percentage NUMERIC,
  has_returned_tasks BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_parent_tasks,
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER as active_parent_tasks,
    COUNT(*) FILTER (WHERE status = 'consolidated')::INTEGER as consolidated_parent_tasks,
    COUNT(*) FILTER (WHERE status = 'returned_to_pipe')::INTEGER as returned_parent_tasks,
    COALESCE(SUM(max_repetitions + extra_repetitions), 0)::INTEGER as total_expected_evaluations,
    COALESCE(SUM(current_repetitions), 0)::INTEGER as completed_evaluations,
    CASE 
      WHEN COALESCE(SUM(max_repetitions + extra_repetitions), 0) > 0 
      THEN ROUND((COALESCE(SUM(current_repetitions), 0)::NUMERIC / SUM(max_repetitions + extra_repetitions)::NUMERIC) * 100, 2)
      ELSE 0
    END as completion_percentage,
    BOOL_OR(status = 'returned_to_pipe') as has_returned_tasks
  FROM parent_tasks
  WHERE playground_id = p_playground_id;
END;
$$ LANGUAGE plpgsql;

-- 16. RLS Policies for parent_tasks
ALTER TABLE parent_tasks ENABLE ROW LEVEL SECURITY;

-- Service role (backend) can do everything
-- Note: Backend uses service role key which has elevated privileges
CREATE POLICY parent_tasks_service_role_all ON parent_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 17. RLS Policies for parent_task_evaluations
ALTER TABLE parent_task_evaluations ENABLE ROW LEVEL SECURITY;

-- Service role (backend) can do everything
CREATE POLICY parent_task_evaluations_service_role_all ON parent_task_evaluations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 18. Create storage bucket for data labeling files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('data-labeling-files', 'data-labeling-files', true)
ON CONFLICT (id) DO NOTHING;

-- 19. Storage policies for data labeling files
-- Note: Backend uses service role key which bypasses RLS, but storage policies are different
-- We need to allow service role access explicitly
DROP POLICY IF EXISTS "Admins can upload data labeling files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view data labeling files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete data labeling files" ON storage.objects;

CREATE POLICY "Service role can upload data labeling files" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'data-labeling-files');

CREATE POLICY "Public can view data labeling files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'data-labeling-files');

CREATE POLICY "Service role can delete data labeling files" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'data-labeling-files');

-- 20. Update timestamp trigger for parent_tasks
CREATE TRIGGER set_parent_tasks_updated_at
  BEFORE UPDATE ON parent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE parent_tasks IS 'Stores main tasks created from ZIP file uploads in data labeling playgrounds';
COMMENT ON TABLE parent_task_evaluations IS 'Tracks which users have evaluated which parent tasks to prevent duplicates';
COMMENT ON COLUMN playgrounds.repetitions_per_task IS 'Number of times each parent task should be evaluated by different users';
COMMENT ON COLUMN playgrounds.auto_calculate_evaluations IS 'If true, total evaluations = parent_tasks * repetitions_per_task';
COMMENT ON COLUMN playgrounds.has_returned_tasks IS 'Flag indicating if playground has tasks returned to pipe (for dashboard animation)';
