"use client";

import { useState } from "react";
import { Question } from "@/lib/types";

interface EvaluationFormProps {
  questions: Question[];
  onSubmit: (answers: Answer[]) => Promise<void>;
  loading?: boolean;
}

interface Answer {
  question_id: string;
  answer_text?: string;
  answer_value?: string;
}

export function EvaluationForm({
  questions,
  onSubmit,
  loading = false,
}: EvaluationFormProps) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        answer_value: value,
      },
    }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        answer_text: text,
      },
    }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    questions.forEach((question) => {
      if (question.required && !answers[question.id]) {
        newErrors[question.id] = "Este campo é obrigatório";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const answersList = Object.values(answers);
      await onSubmit(answersList);
      // Clear form after successful submit
      setAnswers({});
    } catch (error) {
      console.error("Error submitting evaluation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((question, index) => (
        <div key={question.id} className="bg-white p-6 rounded-lg shadow">
          <label className="block mb-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-lg font-medium text-gray-900">
                {index + 1}. {question.question_text}
                {question.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </span>
            </div>

            {question.question_type === "select" && question.options ? (
              <div className="space-y-2 mt-3">
                {(
                  question.options as Array<{ label: string; value: string }>
                ).map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={
                        answers[question.id]?.answer_value === option.value
                      }
                      onChange={(e) =>
                        handleSelectChange(question.id, e.target.value)
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      disabled={loading || isSubmitting}
                    />
                    <span className="ml-3 text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[question.id]?.answer_text || ""}
                onChange={(e) => handleTextChange(question.id, e.target.value)}
                className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Digite sua resposta aqui..."
                disabled={loading || isSubmitting}
              />
            )}

            {errors[question.id] && (
              <p className="mt-2 text-sm text-red-600">{errors[question.id]}</p>
            )}
          </label>
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
        </button>
      </div>
    </form>
  );
}
