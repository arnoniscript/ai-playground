"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { ParentTask, DataLabelingMetrics, ParentTaskStatus } from "@/lib/types";

export default function DataLabelingMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DataLabelingMetrics | null>(null);
  const [parentTasks, setParentTasks] = useState<ParentTask[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<
    ParentTaskStatus | "all"
  >("all");

  useEffect(() => {
    loadData();
  }, [playgroundId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load metrics
      const metricsResponse = await api.get(
        `/data-labeling/metrics/${playgroundId}`
      );
      setMetrics(metricsResponse.data);

      // Load all parent tasks
      const tasksResponse = await api.get(
        `/data-labeling/parent-tasks/${playgroundId}`
      );
      setParentTasks(tasksResponse.data || []);
    } catch (error) {
      console.error("Error loading metrics:", error);
      alert("Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks =
    selectedStatus === "all"
      ? parentTasks
      : parentTasks.filter((t) => t.status === selectedStatus);

  const getStatusBadge = (status: ParentTaskStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
            Ativa
          </span>
        );
      case "consolidated":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
            Consolidada
          </span>
        );
      case "returned_to_pipe":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
            Retornada
          </span>
        );
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <AdminGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando métricas...</p>
            </div>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Layout>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
              >
                ← Voltar
              </button>
              <h1 className="text-3xl font-bold">Métricas de Rotulação</h1>
              <p className="text-gray-600 mt-1">
                Análise detalhada das tasks de rotulação de dados
              </p>
            </div>
            <button
              onClick={() =>
                router.push(`/admin/playground/${playgroundId}/consolidation`)
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              📋 Consolidar Tasks
            </button>
          </div>

          {/* Overall Metrics */}
          {metrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total de Tasks</div>
                  <div className="text-3xl font-bold">
                    {metrics.total_parent_tasks}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-600">Tasks Ativas</div>
                  <div className="text-3xl font-bold text-blue-700">
                    {metrics.active_parent_tasks}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-600">Consolidadas</div>
                  <div className="text-3xl font-bold text-green-700">
                    {metrics.consolidated_parent_tasks}
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-600">Retornadas</div>
                  <div className="text-3xl font-bold text-yellow-700">
                    {metrics.returned_parent_tasks}
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Progresso Geral</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Avaliações Completadas
                      </span>
                      <span className="text-sm text-gray-600">
                        {metrics.completed_evaluations} /{" "}
                        {metrics.total_expected_evaluations}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.min(
                            metrics.completion_percentage,
                            100
                          )}%`,
                        }}
                      >
                        <span className="text-xs text-white font-bold">
                          {metrics.completion_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {metrics.has_returned_tasks && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Este playground tem tasks retornadas para reavaliação
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tasks List with Metrics */}
          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tasks Individuais</h2>
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(
                      e.target.value as ParentTaskStatus | "all"
                    )
                  }
                  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativas</option>
                  <option value="consolidated">Consolidadas</option>
                  <option value="returned_to_pipe">Retornadas</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Arquivo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Avaliações
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Meta
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                      Progresso
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Nenhuma task encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const totalExpected =
                        task.max_repetitions + task.extra_repetitions;
                      const completionPercentage =
                        totalExpected > 0
                          ? Math.round(
                              (task.current_repetitions / totalExpected) * 100
                            )
                          : 0;

                      return (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {task.file_type === "image"
                                  ? "🖼️"
                                  : task.file_type === "pdf"
                                  ? "📄"
                                  : "📝"}
                              </span>
                              <div>
                                <div className="font-medium truncate max-w-xs">
                                  {task.file_name}
                                </div>
                                {task.admin_notes && (
                                  <div className="text-xs text-yellow-600 truncate max-w-xs">
                                    {task.admin_notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(task.status)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">
                              {task.current_repetitions}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-gray-600">
                              {totalExpected}
                            </span>
                            {task.extra_repetitions > 0 && (
                              <span className="text-xs text-yellow-600 ml-1">
                                (+{task.extra_repetitions})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    completionPercentage >= 100
                                      ? "bg-green-600"
                                      : completionPercentage >= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      completionPercentage,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <span
                                className={`text-sm font-medium ${getCompletionColor(
                                  completionPercentage
                                )}`}
                              >
                                {completionPercentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
