"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface PlaygroundMetrics {
  playground_id: string;
  playground_name: string;
  playground_type: string;
  is_active: boolean;
  evaluation_goal: number;
  total_evaluations: number;
  unique_testers: number;
  avg_evaluations_per_tester: number;
  model_metrics: {
    model_key: string;
    total_evaluations: number;
    avg_rating?: number;
  }[];
}

interface QuestionMetrics {
  question_id: string;
  question_text: string;
  question_type: string;
  total_responses: number;
  option_distribution?: {
    option: string;
    count: number;
    percentage: number;
  }[];
}

interface OpenResponse {
  question_text: string;
  answer_text: string;
  model_key: string;
  created_at: string;
}

interface EvaluationItem {
  session_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  model_key: string;
  created_at: string;
  evaluation_count: number;
}

interface EvaluationDetail {
  session_id: string;
  user_email: string;
  user_name: string | null;
  model_key: string;
  created_at: string;
  responses: {
    question_id: string;
    question_text: string;
    question_type: string;
    answer_text: string | null;
    answer_value: string | null;
    answer_label: string | null;
    rating: number | null;
  }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function PlaygroundMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [metrics, setMetrics] = useState<PlaygroundMetrics | null>(null);
  const [questionMetrics, setQuestionMetrics] = useState<QuestionMetrics[]>([]);
  const [openResponses, setOpenResponses] = useState<OpenResponse[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<EvaluationItem[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<EvaluationDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMetrics();
  }, [playgroundId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch playground info
      const playgroundRes = await api.get(`/admin/playgrounds/${playgroundId}`);
      const playground = playgroundRes.data.data;

      // Fetch all metrics from admin endpoint
      const metricsRes = await api.get(
        `/admin/playgrounds/${playgroundId}/metrics`
      );
      const data = metricsRes.data.data;

      // Build metrics object from counters
      const playgroundMetrics: PlaygroundMetrics = {
        playground_id: playgroundId,
        playground_name: playground.name,
        playground_type: playground.type,
        is_active: playground.is_active,
        evaluation_goal: playground.evaluation_goal || 100,
        total_evaluations: data.stats.totalEvaluations || 0,
        unique_testers: data.stats.uniqueTesters || 0,
        avg_evaluations_per_tester:
          data.stats.uniqueTesters > 0
            ? data.stats.totalEvaluations / data.stats.uniqueTesters
            : 0,
        model_metrics:
          data.counters?.map((c: any) => ({
            model_key: c.model_key,
            total_evaluations: c.current_count,
          })) || [],
      };

      setMetrics(playgroundMetrics);
      setQuestionMetrics(data.questionMetrics || []);
      setOpenResponses(data.openResponses || []);
      setEvaluationsList(data.evaluationsList || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluationDetails = async (sessionId: string) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(
        `/admin/playgrounds/${playgroundId}/evaluations/${sessionId}`
      );
      setSelectedEvaluation(response.data.data);
    } catch (err: any) {
      console.error("Failed to fetch evaluation details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Carregando métricas...</p>
            </div>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  if (error || !metrics) {
    return (
      <AdminGuard>
        <Layout>
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error || "Métricas não encontradas"}
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="mt-4 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{metrics.playground_name}</h1>
              <p className="text-gray-600 mt-1">
                Tipo:{" "}
                {metrics.playground_type === "a_b_testing"
                  ? "Teste A/B"
                  : "Ajuste"}{" "}
                • Status: {metrics.is_active ? "Ativo" : "Inativo"}
              </p>
            </div>
            <button
              onClick={() => router.push(`/admin/playground/${playgroundId}`)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Editar Playground
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Total de Avaliações</p>
              <p className="text-3xl font-bold">
                {metrics.total_evaluations}{" "}
                <span className="text-lg text-gray-500">
                  de {metrics.evaluation_goal}
                </span>
              </p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Progresso</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (metrics.total_evaluations / metrics.evaluation_goal) *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-2xl font-bold min-w-[60px]">
                  {Math.round(
                    (metrics.total_evaluations / metrics.evaluation_goal) * 100
                  )}
                  %
                </p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Avaliadores Únicos</p>
              <p className="text-3xl font-bold">{metrics.unique_testers}</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">
                Média de Avaliações/Usuário
              </p>
              <p className="text-3xl font-bold">
                {metrics.avg_evaluations_per_tester?.toFixed(1) || "0"}
              </p>
            </div>
          </div>

          {/* Model Performance */}
          {metrics.model_metrics && metrics.model_metrics.length > 0 && (
            <section className="bg-white border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Desempenho por Modelo
              </h2>

              <div className="mb-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.model_metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model_key" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="total_evaluations"
                      fill="#0088FE"
                      name="Avaliações"
                    />
                    {metrics.model_metrics.some((m) => m.avg_rating) && (
                      <Bar
                        dataKey="avg_rating"
                        fill="#00C49F"
                        name="Nota Média"
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.model_metrics.map((model) => (
                  <div key={model.model_key} className="border rounded p-4">
                    <h3 className="font-medium mb-2">{model.model_key}</h3>
                    <p className="text-sm text-gray-600">
                      Avaliações:{" "}
                      <span className="font-semibold">
                        {model.total_evaluations}
                      </span>
                    </p>
                    {model.avg_rating && (
                      <p className="text-sm text-gray-600">
                        Nota Média:{" "}
                        <span className="font-semibold">
                          {model.avg_rating.toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Question Analytics */}
          {questionMetrics.length > 0 && (
            <section className="bg-white border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Análise de Perguntas
              </h2>

              <div className="space-y-6">
                {questionMetrics.map((question) => (
                  <div
                    key={question.question_id}
                    className="border rounded p-4"
                  >
                    <h3 className="font-medium mb-3">
                      {question.question_text}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Total de respostas: {question.total_responses}
                    </p>

                    {question.option_distribution &&
                      question.option_distribution.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Pie Chart */}
                          <div>
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={question.option_distribution}
                                  dataKey="count"
                                  nameKey="option"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={(entry) =>
                                    `${entry.percentage.toFixed(0)}%`
                                  }
                                >
                                  {question.option_distribution.map(
                                    (_, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                      />
                                    )
                                  )}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Table */}
                          <div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Opção</th>
                                  <th className="text-right py-2">Respostas</th>
                                  <th className="text-right py-2">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {question.option_distribution.map(
                                  (opt, idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b last:border-0"
                                    >
                                      <td className="py-2">{opt.option}</td>
                                      <td className="text-right">
                                        {opt.count}
                                      </td>
                                      <td className="text-right">
                                        {opt.percentage.toFixed(1)}%
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {question.question_type === "input_string" && (
                      <p className="text-sm text-gray-500 italic">
                        Respostas abertas disponíveis na seção abaixo
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Open Responses */}
          {openResponses.length > 0 && (
            <section className="bg-white border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Respostas Abertas ({openResponses.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Pergunta</th>
                      <th className="text-left py-3 px-4">Resposta</th>
                      <th className="text-left py-3 px-4">Modelo</th>
                      <th className="text-left py-3 px-4">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openResponses.map((response, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 max-w-xs">
                          {response.question_text}
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <div className="max-h-20 overflow-y-auto">
                            {response.answer_text}
                          </div>
                        </td>
                        <td className="py-3 px-4">{response.model_key}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {new Date(response.created_at).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {openResponses.length >= 100 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Mostrando as 100 respostas mais recentes
                </p>
              )}
            </section>
          )}

          {/* Individual Evaluations */}
          {evaluationsList.length > 0 && (
            <section className="bg-white border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Avaliações Individuais ({evaluationsList.length})
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Usuário</th>
                      <th className="text-left py-3 px-4">Modelo</th>
                      <th className="text-left py-3 px-4">Data</th>
                      <th className="text-left py-3 px-4">Respostas</th>
                      <th className="text-left py-3 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationsList.map((evaluation) => (
                      <tr
                        key={evaluation.session_id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {evaluation.user_name || evaluation.user_email}
                            </div>
                            {evaluation.user_name && (
                              <div className="text-xs text-gray-500">
                                {evaluation.user_email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{evaluation.model_key}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {new Date(evaluation.created_at).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {evaluation.evaluation_count} respostas
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() =>
                              fetchEvaluationDetails(evaluation.session_id)
                            }
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Evaluation Details Modal */}
          {selectedEvaluation && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedEvaluation(null)}
            >
              <div
                className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        Detalhes da Avaliação
                      </h2>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Usuário:</strong>{" "}
                          {selectedEvaluation.user_name ||
                            selectedEvaluation.user_email}
                        </p>
                        {selectedEvaluation.user_name && (
                          <p>
                            <strong>Email:</strong>{" "}
                            {selectedEvaluation.user_email}
                          </p>
                        )}
                        <p>
                          <strong>Modelo:</strong>{" "}
                          {selectedEvaluation.model_key}
                        </p>
                        <p>
                          <strong>Data:</strong>{" "}
                          {new Date(
                            selectedEvaluation.created_at
                          ).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEvaluation(null)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">
                      Respostas
                    </h3>
                    {selectedEvaluation.responses.map((response, idx) => (
                      <div key={idx} className="border rounded p-4">
                        <p className="font-medium mb-2">
                          {idx + 1}. {response.question_text}
                        </p>
                        <div className="text-sm text-gray-700 pl-4">
                          {response.question_type === "select" ? (
                            <p>
                              <strong>Resposta:</strong>{" "}
                              {response.answer_label || response.answer_value}
                            </p>
                          ) : response.question_type === "input_string" ? (
                            <p>
                              <strong>Resposta:</strong> {response.answer_text}
                            </p>
                          ) : null}
                          {response.rating && (
                            <p className="mt-1">
                              <strong>Avaliação:</strong> {response.rating}/5
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedEvaluation(null)}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {metrics.total_evaluations === 0 && (
            <div className="bg-gray-50 border rounded-lg p-12 text-center">
              <p className="text-lg text-gray-600">
                Nenhuma avaliação realizada ainda
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Compartilhe o link do playground com avaliadores para começar a
                coletar dados
              </p>
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
