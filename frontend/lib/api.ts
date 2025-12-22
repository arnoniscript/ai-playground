import axios from 'axios';
import type {
  Course,
  CourseWithSteps,
  CourseStep,
  EvaluationQuestionWithOptions,
  UserCourseProgress,
  UserStepAttempt,
  CourseMetrics,
  UserCourseMetrics,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Course API functions

// Admin functions
export const coursesAdminApi = {
  // List all courses
  list: () => api.get<{ data: Course[] }>('/admin/courses'),

  // Get course with steps and questions
  get: (id: string) => api.get<{ data: CourseWithSteps }>(`/admin/courses/${id}`),

  // Create course
  create: (data: { title: string; description?: string; is_published?: boolean }) =>
    api.post<{ data: Course }>('/admin/courses', data),

  // Update course
  update: (id: string, data: Partial<Course>) =>
    api.put<{ data: Course }>(`/admin/courses/${id}`, data),

  // Delete course
  delete: (id: string) => api.delete(`/admin/courses/${id}`),

  // Add step
  addStep: (courseId: string, data: Partial<CourseStep>) =>
    api.post<{ data: CourseStep }>(`/admin/courses/${courseId}/steps`, data),

  // Update step
  updateStep: (courseId: string, stepId: string, data: Partial<CourseStep>) =>
    api.put<{ data: CourseStep }>(`/admin/courses/${courseId}/steps/${stepId}`, data),

  // Delete step
  deleteStep: (courseId: string, stepId: string) =>
    api.delete(`/admin/courses/${courseId}/steps/${stepId}`),

  // Add question
  addQuestion: (
    courseId: string,
    stepId: string,
    data: {
      order_index: number;
      question_text: string;
      question_image_url?: string;
      question_video_url?: string;
      question_audio_url?: string;
      options: Array<{ option_text: string; is_correct: boolean; order_index: number }>;
    }
  ) =>
    api.post<{ data: EvaluationQuestionWithOptions }>(
      `/admin/courses/${courseId}/steps/${stepId}/questions`,
      data
    ),

  // Update question
  updateQuestion: (
    courseId: string,
    stepId: string,
    questionId: string,
    data: Partial<{
      order_index: number;
      question_text: string;
      question_image_url?: string;
      question_video_url?: string;
      question_audio_url?: string;
      options: Array<{ option_text: string; is_correct: boolean; order_index: number }>;
    }>
  ) =>
    api.put<{ data: EvaluationQuestionWithOptions }>(
      `/admin/courses/${courseId}/steps/${stepId}/questions/${questionId}`,
      data
    ),

  // Delete question
  deleteQuestion: (courseId: string, stepId: string, questionId: string) =>
    api.delete(`/admin/courses/${courseId}/steps/${stepId}/questions/${questionId}`),
};

// User functions
export const coursesApi = {
  // List published courses
  list: () => api.get<{ data: Course[] }>('/courses'),

  // Get course details
  get: (id: string) =>
    api.get<{ data: { course: CourseWithSteps; progress: UserCourseProgress | null } }>(
      `/courses/${id}`
    ),

  // Start course
  start: (id: string) => api.post<{ data: UserCourseProgress }>(`/courses/${id}/start`),

  // Submit evaluation
  submitEvaluation: (
    courseId: string,
    stepId: string,
    answers: Array<{ question_id: string; selected_option_id: string }>
  ) =>
    api.post<{
      data: { attempt: UserStepAttempt; passed: boolean; score: number; total_questions: number };
    }>(`/courses/${courseId}/steps/${stepId}/submit`, { answers }),

  // Complete step
  completeStep: (courseId: string, stepId: string) =>
    api.post<{ data: UserCourseProgress; next_step?: CourseStep; course_completed?: boolean }>(
      `/courses/${courseId}/steps/${stepId}/complete`
    ),

  // Get progress
  getProgress: (courseId: string) =>
    api.get<{ data: { progress: UserCourseProgress; attempts: UserStepAttempt[] } }>(
      `/courses/${courseId}/progress`
    ),

  // Get step attempts
  getStepAttempts: (courseId: string, stepId: string) =>
    api.get<{ data: UserStepAttempt[] }>(`/courses/${courseId}/steps/${stepId}/attempts`),
};

// Metrics functions
export const coursesMetricsApi = {
  // Get course metrics
  getCourseMetrics: (courseId: string) =>
    api.get<{ data: CourseMetrics }>(`/admin/courses/${courseId}/metrics`),

  // Get all users metrics for a course
  getCourseUsers: (courseId: string) =>
    api.get<{ data: UserCourseMetrics[] }>(`/admin/courses/${courseId}/users`),

  // Get specific user metrics
  getUserMetrics: (courseId: string, userId: string) =>
    api.get<{ data: UserCourseMetrics }>(`/admin/courses/${courseId}/users/${userId}`),

  // Get step metrics
  getStepMetrics: (courseId: string, stepId: string) =>
    api.get<{
      data: {
        step: CourseStep;
        metrics: {
          total_attempts: number;
          unique_users: number;
          average_score: number;
          pass_rate: number;
        };
        attempts: UserStepAttempt[];
      };
    }>(`/admin/courses/${courseId}/steps/${stepId}/metrics`),
};
