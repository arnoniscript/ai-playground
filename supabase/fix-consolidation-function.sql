-- Fix get_parent_task_consolidation_data to use evaluations table instead of non-existent task_answers

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
