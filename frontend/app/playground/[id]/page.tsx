"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import { ModelEmbed } from "@/components/model-embed";
import { EvaluationForm } from "@/components/evaluation-form";
import { CourseDrawer } from "@/components/course-drawer";
import TimeTracker from "@/components/time-tracker";
import api from "@/lib/api";
import { Playground, ModelConfiguration, Question } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export default function PlaygroundEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [playground, setPlayground] = useState<Playground | null>(null);
  const [models, setModels] = useState<ModelConfiguration[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(uuidv4());
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [contentAlignment, setContentAlignment] = useState<
    "left" | "center" | "right"
  >("center");
  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    fetchPlaygroundData();
  }, [playgroundId]);

  const fetchPlaygroundData = async () => {
    try {
      const response = await api.get(`/playgrounds/${playgroundId}`);
      const data = response.data.data;

      // Check if course is required and not completed
      if (data.course_access_blocked) {
        router.push(`/courses/${data.linked_course_id}`);
        return;
      }

      // Backend now returns flattened structure
      setPlayground(data);
      setModels(data.models || []);
      setQuestions(data.questions || []);

      // For A/B testing, randomly select first model
      if (
        data.type === "ab_testing" &&
        data.models &&
        data.models.length >= 2
      ) {
        const randomModel = await getNextModel();
        setSelectedModel(randomModel);
      } else if (data.models && data.models.length > 0) {
        setSelectedModel(data.models[0].model_key);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch playground:", error);
      setLoading(false);
    }
  };

  const getNextModel = async (): Promise<string> => {
    try {
      const response = await api.get(`/playgrounds/${playgroundId}/next-model`);
      return response.data.data.model_key;
    } catch (error) {
      console.error("Failed to get next model:", error);
      return models[0]?.model_key || "";
    }
  };

  const handleSubmitEvaluation = async (answers: any[]) => {
    try {
      const timeSpent = playground?.is_paid ? timeSpentRef.current : undefined;

      console.log("Submitting evaluation:", {
        is_paid: playground?.is_paid,
        time_spent_seconds: timeSpent,
        playground_id: playgroundId,
      });

      await api.post(`/playgrounds/${playgroundId}/evaluations`, {
        model_key: selectedModel,
        session_id: sessionId,
        time_spent_seconds: timeSpent,
        answers: answers.map((answer) => ({
          question_id: answer.question_id,
          answer_text: answer.answer_text,
          answer_value: answer.answer_value,
        })),
      });

      // For A/B testing with 2 models, show second model
      if (playground?.type === "ab_testing" && currentStep === 0) {
        // Get next model for second evaluation
        const nextModel = await getNextModel();
        setSelectedModel(nextModel);
        setCurrentStep(1);
        // Reset timer for second evaluation
        timeSpentRef.current = 0;
      } else {
        // Done - redirect to thank you or dashboard
        router.push("/dashboard?evaluated=true");
      }
    } catch (error: any) {
      console.error("Failed to submit evaluation:", error);
      alert(error.response?.data?.error || "Erro ao enviar avaliação");
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

  if (!playground || !selectedModel) {
    return (
      <AuthGuard>
        <Layout>
          <div className="max-w-2xl mx-auto text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Playground não encontrado
            </h2>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const currentModel = models.find((m) => m.model_key === selectedModel);
  const currentQuestions = questions.filter(
    (q) => q.model_key === selectedModel || q.model_key === null
  );

  const getAlignmentClass = () => {
    switch (contentAlignment) {
      case "left":
        return "mr-auto ml-0";
      case "right":
        return "ml-auto mr-0";
      default:
        return "mx-auto";
    }
  };

  return (
    <AuthGuard>
      <Layout>
        {/* Time Tracker */}
        {playground?.is_paid && (
          <TimeTracker
            isPaid={true}
            onTimeUpdate={(seconds) => {
              timeSpentRef.current = seconds;
            }}
          />
        )}

        {/* Alignment Controls */}
        <div className="fixed top-20 right-4 z-30 bg-white shadow-lg rounded-lg p-2 flex gap-1">
          <button
            onClick={() => setContentAlignment("left")}
            className={`p-2 rounded transition-colors ${
              contentAlignment === "left"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Alinhar à esquerda"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h10M4 18h7"
              />
            </svg>
          </button>
          <button
            onClick={() => setContentAlignment("center")}
            className={`p-2 rounded transition-colors ${
              contentAlignment === "center"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Centralizar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M8 12h8M9 18h6"
              />
            </svg>
          </button>
          <button
            onClick={() => setContentAlignment("right")}
            className={`p-2 rounded transition-colors ${
              contentAlignment === "right"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title="Alinhar à direita"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M10 12h10M13 18h7"
              />
            </svg>
          </button>
        </div>

        <div
          className={`max-w-4xl space-y-8 transition-all duration-300 ${getAlignmentClass()}`}
        >
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {playground.name}
            </h1>
            {playground.description && (
              <p className="text-gray-600 mb-4">{playground.description}</p>
            )}

            {/* Payment info */}
            {playground.is_paid && playground.payment_type && (
              <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">💰</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">
                      Playground Remunerado
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          R$ {playground.payment_value?.toFixed(2)}
                        </span>
                        <span className="text-sm text-green-700">
                          {playground.payment_type === "per_hour" &&
                            "por hora trabalhada"}
                          {playground.payment_type === "per_task" &&
                            "por task completada"}
                          {playground.payment_type === "per_goal" &&
                            `ao completar ${playground.tasks_for_goal} tasks`}
                        </span>
                      </div>
                      {playground.payment_type === "per_hour" &&
                        playground.max_time_per_task && (
                          <p className="text-sm text-green-800">
                            ⏱️ Tempo máximo pago:{" "}
                            <span className="font-semibold">
                              {playground.max_time_per_task} minutos por task
                            </span>
                          </p>
                        )}
                      <div className="bg-white bg-opacity-60 rounded p-2 mt-2">
                        <p className="text-xs text-green-800">
                          <strong>ℹ️ Como funciona:</strong> O tempo é contado
                          apenas quando esta aba está ativa. Se você mudar de
                          aba ou minimizar o navegador, o timer pausa
                          automaticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Course info badge */}
            {playground.linked_course && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span
                  className={`px-3 py-1 rounded-full font-medium ${
                    playground.user_course_progress?.completed
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {playground.user_course_progress?.completed
                    ? "✓ Curso Concluído"
                    : "📚 Curso Disponível"}
                </span>
                <span className="text-gray-600">
                  {playground.linked_course.title} • Use a aba lateral
                </span>
              </div>
            )}

            {playground.type === "ab_testing" && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                  Teste A/B
                </span>
                <span>Avaliação {currentStep + 1} de 2</span>
              </div>
            )}

            {playground.support_text && (
              <div
                className="mt-4 p-4 bg-gray-50 rounded-lg prose max-w-none"
                dangerouslySetInnerHTML={{ __html: playground.support_text }}
              />
            )}
          </div>

          {/* Model Embed */}
          {currentModel && (
            <ModelEmbed
              embedCode={currentModel.embed_code}
              modelKey={currentModel.model_key}
              modelName={currentModel.model_name}
            />
          )}

          {/* Evaluation Form */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Questionário de Avaliação
            </h2>
            <EvaluationForm
              questions={currentQuestions}
              onSubmit={handleSubmitEvaluation}
            />
          </div>
        </div>

        {/* Course Drawer - Always present when course is linked */}
        {playground.linked_course && (
          <CourseDrawer
            courseId={playground.linked_course.id}
            courseTitle={playground.linked_course.title}
            isCompleted={playground.user_course_progress?.completed || false}
          />
        )}
      </Layout>
    </AuthGuard>
  );
}
