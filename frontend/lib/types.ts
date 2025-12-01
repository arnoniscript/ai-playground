export type UserRole = 'admin' | 'tester';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Playground {
  id: string;
  name: string;
  type: 'ab_testing' | 'tuning';
  description: string | null;
  support_text: string | null;
  created_by: string;
  is_active: boolean;
  restricted_emails: string[] | null;
  models?: ModelConfiguration[];
  questions?: Question[];
  counters?: EvaluationCounter[];
  created_at: string;
  updated_at: string;
}

export interface ModelConfiguration {
  id: string;
  playground_id: string;
  model_key: string;
  model_name: string;
  embed_code: string;
  max_evaluations: number;
  created_at: string;
}

export interface Question {
  id: string;
  playground_id: string;
  model_key: string | null;
  question_text: string;
  question_type: 'select' | 'input_string';
  options: Array<{ label: string; value: string }> | null;
  order_index: number;
  required: boolean;
  created_at: string;
}

export interface EvaluationCounter {
  id: string;
  playground_id: string;
  model_key: string;
  current_count: number;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  playground_id: string;
  user_id: string;
  model_key: string;
  question_id: string;
  answer_text: string | null;
  answer_value: string | null;
  rating: number | null;
  session_id: string | null;
  created_at: string;
}
