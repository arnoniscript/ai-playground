export type UserRole = 'admin' | 'tester' | 'client' | 'qa' | 'manager';
export type UserStatus = 'active' | 'pending_invite' | 'blocked' | 'pending_approval';
export type AccessControlType = 'open' | 'email_restricted' | 'explicit_authorization';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  invited_at: string | null;
  invited_by: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at?: string;
  last_login?: string | null;
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
  access_control_type: AccessControlType;
  evaluation_goal: number;
  linked_course_id: string | null;
  course_required: boolean;
  is_paid: boolean;
  payment_type: 'per_hour' | 'per_task' | 'per_goal' | null;
  payment_value: number | null;
  max_time_per_task: number | null;
  tasks_for_goal: number | null;
  models?: ModelConfiguration[];
  questions?: Question[];
  counters?: EvaluationCounter[];
  linked_course?: {
    id: string;
    title: string;
    description: string | null;
    is_published: boolean;
  } | null;
  user_course_progress?: {
    user_id: string;
    course_id: string;
    started_at: string;
    completed: boolean;
    completed_at: string | null;
    current_step_id: string | null;
  } | null;
  course_access_blocked?: boolean;
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

export interface PlaygroundAuthorizedUser {
  id: string;
  playground_id: string;
  user_id: string;
  authorized_by: string | null;
  authorized_at: string;
  notes: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
  };
  authorizer?: {
    email: string;
    full_name: string | null;
  };
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

// Course System Types

export interface Course {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  user_progress?: {
    course_id: string;
    completed_at: string | null;
  } | null;
}

export interface CourseStep {
  id: string;
  course_id: string;
  order_index: number;
  title: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  has_evaluation: boolean;
  evaluation_required: boolean;
  min_score: number | null;
  max_attempts: number | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationQuestion {
  id: string;
  step_id: string;
  order_index: number;
  question_text: string;
  question_image_url: string | null;
  question_video_url: string | null;
  question_audio_url: string | null;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
}

export interface UserCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  current_step_id: string | null;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface UserStepAttempt {
  id: string;
  user_id: string;
  step_id: string;
  attempt_number: number;
  score: number;
  total_questions: number;
  passed: boolean;
  answers: Array<{
    question_id: string;
    selected_option_id: string;
    is_correct: boolean;
  }>;
  attempted_at: string;
}

// Extended types with relations

export interface CourseWithSteps extends Course {
  steps: CourseStepWithEvaluation[];
}

export interface CourseStepWithEvaluation extends CourseStep {
  questions: EvaluationQuestionWithOptions[];
}

export interface EvaluationQuestionWithOptions extends EvaluationQuestion {
  options: QuestionOption[];
}

export interface UserCourseProgressWithDetails extends UserCourseProgress {
  course: Course;
  current_step?: CourseStep;
  attempts: UserStepAttempt[];
}

// Metrics types

export interface CourseMetrics {
  course_id: string;
  course_title: string;
  total_enrollments: number;
  total_completions: number;
  completion_rate: number;
  average_score: number;
  step_metrics: StepMetrics[];
}

export interface StepMetrics {
  step_id: string;
  step_title: string;
  step_order: number;
  total_attempts: number;
  unique_users: number;
  average_score: number;
  pass_rate: number;
  average_attempts_to_pass: number;
}

export interface UserCourseMetrics {
  user_id: string;
  user_email: string;
  user_name: string | null;
  course_id: string;
  started_at: string;
  completed_at: string | null;
  completed: boolean;
  current_step_order: number;
  total_steps: number;
  step_attempts: Array<{
    step_id: string;
    step_title: string;
    attempts: number;
    best_score: number;
  }>;
}

// QA Earnings types

export type EarningStatus = 'under_review' | 'ready_for_payment' | 'paid' | 'rejected';
export type PaymentType = 'per_hour' | 'per_task' | 'per_goal';

export interface QAEarning {
  id: string;
  user_id: string;
  playground_id: string;
  evaluation_id: string;
  task_name: string;
  submitted_at: string;
  time_spent_seconds: number;
  amount: number;
  status: EarningStatus;
  paid_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  playgrounds?: {
    name: string;
  };
  users?: {
    email: string;
    full_name: string | null;
  };
}

export interface QAEarningSummary {
  user_id: string;
  total_tasks: number;
  under_review_count: number;
  under_review_amount: number;
  ready_for_payment_count: number;
  ready_for_payment_amount: number;
  paid_count: number;
  paid_amount: number;
  rejected_count: number;
  rejected_amount: number;
  total_earned: number;
}
    total_questions: number;
    passed: boolean;
  }>;
}
