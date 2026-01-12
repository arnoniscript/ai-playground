"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import TimeTracker from "@/components/time-tracker";
import { PdfViewer } from "@/components/pdf-viewer";
import api from "@/lib/api";
import { Playground, Question, NextParentTask, FileType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export default function DataLabelingEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [playground, setPlayground] = useState<Playground | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentTask, setCurrentTask] = useState<NextParentTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNextTask, setLoadingNextTask] = useState(false);
  const [sessionId] = useState(uuidv4());
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [noMoreTasks, setNoMoreTasks] = useState(false);
  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    fetchPlaygroundData();
  }, [playgroundId]);

  const fetchPlaygroundData = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/playgrounds/${playgroundId}`);
      const data = response.data.data;

      // Check if it's actually a data_labeling playground
      if (data.type !== "data_labeling") {
        alert("Este não é um playground de rotulação de dados");
        router.push("/dashboard");
        return;
      }

      // Check if course is required and not completed
      if (data.course_access_blocked) {
        router.push(`/courses/${data.linked_course_id}`);
        return;
      }

      setPlayground(data);
      setQuestions(data.questions || []);

      // Fetch next available task
      await fetchNextTask();
    } catch (error: any) {
      console.error("Error loading playground:", error);
      alert(error.response?.data?.error || "Erro ao carregar playground");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchNextTask = async () => {
    try {
      setLoadingNextTask(true);
      setNoMoreTasks(false);

      const response = await api.get(
        `/data-labeling/next-task/${playgroundId}`
      );

      if (response.data && response.data.parent_task_id) {
        setCurrentTask(response.data);
        // Reset answers and initialize boolean questions to "false"
        const initialAnswers: Record<string, any> = {};
        questions.forEach((q) => {
          if (q.question_type === "boolean") {
            initialAnswers[q.id] = "false";
          }
        });
        setAnswers(initialAnswers);
      } else {
        setNoMoreTasks(true);
        setCurrentTask(null);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNoMoreTasks(true);
        setCurrentTask(null);
      } else {
        console.error("Error fetching next task:", error);
        alert("Erro ao buscar próxima task");
      }
    } finally {
      setLoadingNextTask(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!currentTask || !playground) return;

    // Validate required questions
    const unansweredRequired = questions.filter(
      (q) => q.required && !answers[q.id]
    );

    if (unansweredRequired.length > 0) {
      alert("Por favor, responda todas as perguntas obrigatórias");
      return;
    }

    try {
      setSubmitting(true);

      // Submit evaluation with task answers
      const evaluationData = {
        session_id: sessionId,
        parent_task_id: currentTask.parent_task_id,
        playground_id: playgroundId,
        time_spent_seconds: timeSpentRef.current,
        answers: questions.map((q) => {
          const answer =
            answers[q.id] !== undefined ? String(answers[q.id]) : "";

          // For select and boolean questions, use answer_value
          // For input_string questions, use answer_text
          if (q.question_type === "select" || q.question_type === "boolean") {
            return {
              question_id: q.id,
              answer_value: answer,
            };
          } else {
            return {
              question_id: q.id,
              answer_text: answer,
            };
          }
        }),
      };

      await api.post(
        `/playgrounds/${playgroundId}/evaluations`,
        evaluationData
      );

      // Record the parent task evaluation
      await api.post("/data-labeling/record-evaluation", {
        parent_task_id: currentTask.parent_task_id,
        session_id: sessionId,
      });

      // Reset for next task
      timeSpentRef.current = 0;

      // Fetch next task
      await fetchNextTask();
    } catch (error: any) {
      console.error("Error submitting evaluation:", error);
      alert(error.response?.data?.error || "Erro ao submeter avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const getFilePreview = (task: NextParentTask) => {
    switch (task.file_type) {
      case "image":
        return (
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <img
              src={task.file_url}
              alt={task.file_name}
              className="w-full max-h-[500px] object-contain"
            />
          </div>
        );
      case "pdf":
        return (
          <PdfViewer
            parentTaskId={task.parent_task_id}
            fileName={task.file_name}
          />
        );
      case "text":
        return (
          <div className="border rounded-lg p-8 bg-gray-50 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-700 mb-4 font-medium">{task.file_name}</p>
            <a
              href={task.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Abrir arquivo de texto
            </a>
          </div>
        );
      default:
        return (
          <div className="border rounded-lg p-8 bg-gray-50 text-center">
            <p className="text-gray-600">Tipo de arquivo não suportado</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando playground...</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-5xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Voltar para Dashboard
            </button>
            <h1 className="text-3xl font-bold">{playground?.name}</h1>
            {playground?.description && (
              <p className="text-gray-600 mt-2">{playground.description}</p>
            )}
          </div>

          {/* Support Text */}
          {playground?.support_text && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 whitespace-pre-wrap">
                {playground.support_text}
              </p>
            </div>
          )}

          {/* Time Tracker */}
          <TimeTracker
            isPaid={playground?.is_paid || false}
            onTimeUpdate={(seconds) => {
              timeSpentRef.current = seconds;
            }}
          />

          {/* Main Content */}
          {noMoreTasks ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Parabéns!
              </h2>
              <p className="text-green-700">
                Você completou todas as tasks disponíveis neste playground.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Voltar para Dashboard
              </button>
            </div>
          ) : loadingNextTask ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando próxima task...</p>
              </div>
            </div>
          ) : !currentTask ? (
            <div className="bg-gray-50 border rounded-lg p-12 text-center">
              <p className="text-gray-600">
                Nenhuma task disponível no momento.
              </p>
              <button
                onClick={fetchNextTask}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Preview */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Arquivo para análise
                </h2>
                {getFilePreview(currentTask)}
              </div>

              {/* Questions */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Perguntas de Avaliação
                </h2>
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border-b pb-6 last:border-b-0"
                    >
                      <label className="block text-sm font-medium mb-2">
                        {index + 1}. {question.question_text}
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>

                      {question.question_type === "select" &&
                      question.options ? (
                        <select
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={question.required}
                        >
                          <option value="">Selecione uma opção</option>
                          {question.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : question.question_type === "boolean" ? (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={answers[question.id] === "true"}
                            onChange={(e) =>
                              handleAnswerChange(
                                question.id,
                                e.target.checked ? "true" : "false"
                              )
                            }
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {answers[question.id] === "true" ? "Sim" : "Não"}
                          </span>
                        </label>
                      ) : (
                        <textarea
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          required={question.required}
                          placeholder="Digite sua resposta..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enviando..." : "Enviar Avaliação"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
