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
  type: z.enum(['ab_testing', 'tuning']),
  description: z.string().optional(),
  support_text: z.string().optional(), // Can contain HTML
  restricted_emails: z.array(z.string().email()).optional(),
  models: z.array(z.object({
    model_key: z.string(),
    model_name: z.string(),
    embed_code: z.string(),
    max_evaluations: z.number().int().positive(),
  })),
  questions: z.array(z.object({
    model_key: z.string().optional(),
    question_text: z.string(),
    question_type: z.enum(['select', 'input_string']),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional(),
    order_index: z.number().int(),
    required: z.boolean().default(true),
  })),
});

export const UpdatePlaygroundSchema = CreatePlaygroundSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// Evaluation Schemas
export const SubmitEvaluationSchema = z.object({
  session_id: z.string().uuid(),
  model_key: z.string(),
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
