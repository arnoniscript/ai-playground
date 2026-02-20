import { z } from 'zod';

// Auth Schemas
export const SignupRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const VerifyOTPSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6),
});

// Playground Schemas
export const CreatePlaygroundSchema = z.object({
  name: z.string().min(3).max(255),
  type: z.enum(['ab_testing', 'tuning', 'data_labeling', 'curation']),
  description: z.string().optional(),
  support_text: z.string().optional(), // Can contain HTML
  restricted_emails: z.array(z.string().email()).optional().nullable(),
  evaluation_goal: z.union([z.number().int().positive().min(1), z.literal(0)]).optional().nullable(),
  linked_course_id: z.string().uuid().optional().nullable(),
  course_required: z.boolean().optional().default(false),
  is_paid: z.boolean().optional().default(false),
  payment_type: z.enum(['per_hour', 'per_task', 'per_goal']).optional().nullable(),
  payment_value: z.number().positive().optional().nullable(),
  max_time_per_task: z.number().int().positive().optional().nullable(),
  tasks_for_goal: z.number().int().positive().optional().nullable(),
  tools: z.array(z.object({
    type: z.string(),
    enabled: z.boolean(),
    config: z.any().optional(),
  })).optional().default([]),
  repetitions_per_task: z.number().int().positive().optional().nullable(),
  auto_calculate_evaluations: z.boolean().optional().nullable(),
  // Curation specific fields
  curation_mode: z.enum(['continuous', 'date_range']).optional().nullable(),
  curation_agent_id: z.string().optional().nullable(),
  curation_date_start: z.string().optional().nullable(),
  curation_date_end: z.string().optional().nullable(),
  curation_passes_per_conversation: z.number().int().positive().optional().nullable(),
  models: z.array(z.object({
    model_key: z.string(),
    model_name: z.string(),
    embed_code: z.string(),
    max_evaluations: z.number().int().positive(),
  })).optional().default([]),
  questions: z.array(z.object({
    model_key: z.string().optional().nullable(),
    question_text: z.string(),
    question_type: z.enum(['select', 'input_string', 'boolean']),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional(),
    order_index: z.number().int(),
    required: z.boolean().default(true),
  })).optional().default([]),
});

export const UpdatePlaygroundSchema = CreatePlaygroundSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// Evaluation Schemas
export const SubmitEvaluationSchema = z.object({
  session_id: z.string().uuid(),
  model_key: z.string().optional(), // Optional for data_labeling playgrounds
  time_spent_seconds: z.number().int().min(0).optional(),
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    answer_text: z.string().optional(),
    answer_value: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
  })),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type VerifyOTPRequest = z.infer<typeof VerifyOTPSchema>;
export type CreatePlaygroundRequest = z.infer<typeof CreatePlaygroundSchema>;
export type UpdatePlaygroundRequest = z.infer<typeof UpdatePlaygroundSchema>;
export type SubmitEvaluationRequest = z.infer<typeof SubmitEvaluationSchema>;
