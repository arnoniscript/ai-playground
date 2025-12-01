"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import { ModelEmbed } from "@/components/model-embed";
import { EvaluationForm } from "@/components/evaluation-form";
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

  useEffect(() => {
    fetchPlaygroundData();
  }, [playgroundId]);

  const fetchPlaygroundData = async () => {
    try {
      const response = await api.get(`/playgrounds/${playgroundId}`);
      const data = response.data.data;

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
      await api.post(`/playgrounds/${playgroundId}/evaluations`, {
        model_key: selectedModel,
        session_id: sessionId,
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

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {playground.name}
            </h1>
            {playground.description && (
              <p className="text-gray-600 mb-4">{playground.description}</p>
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
      </Layout>
    </AuthGuard>
  );
}
