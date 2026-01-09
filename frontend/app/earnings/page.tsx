"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { QAEarning, QAEarningSummary } from "@/lib/types";

interface TaskAnswer {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: string | null;
  questions: {
    question_text: string;
    question_type: string;
    options: Array<{ label: string; value: string }> | null;
  };
}

interface TaskDetails {
  earning: QAEarning;
  answers: TaskAnswer[];
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<QAEarning[]>([]);
  const [summary, setSummary] = useState<QAEarningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "under_review" | "ready_for_payment" | "paid" | "rejected"
  >("all");
  const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch earnings
      const earningsRes = await api.get("/earnings", {
        params: filter !== "all" ? { status: filter } : {},
      });
      setEarnings(earningsRes.data.data || []);

      // Fetch summary
      const summaryRes = await api.get("/earnings/summary");
      setSummary(summaryRes.data.data);
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const viewTask = async (earningId: string) => {
    try {
      setLoadingTask(true);
      const response = await api.get(`/earnings/${earningId}/answers`);
      setSelectedTask(response.data.data);
    } catch (error) {
      console.error("Failed to fetch task details:", error);
      alert("Erro ao carregar detalhes da task");
    } finally {
      setLoadingTask(false);
    }
  };

  const closeModal = () => {
    setSelectedTask(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      under_review: "bg-yellow-100 text-yellow-800",
      ready_for_payment: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    const labels: Record<string, string> = {
      under_review: "Em Análise",
      ready_for_payment: "Pronto para Pagamento",
      paid: "Pago",
      rejected: "Rejeitado",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Meus Ganhos</h1>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Em Análise
                </h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(summary.under_review_amount)}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {summary.under_review_count} tasks
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Pronto p/ Pagamento
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(summary.ready_for_payment_amount)}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {summary.ready_for_payment_count} tasks
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  Pago
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(summary.paid_amount)}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {summary.paid_count} tasks
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-purple-800 mb-2">
                  Total Ganho
                </h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(summary.total_earned)}
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  {summary.total_tasks} tasks
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("under_review")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "under_review"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Em Análise
            </button>
            <button
              onClick={() => setFilter("ready_for_payment")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "ready_for_payment"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pronto p/ Pagamento
            </button>
            <button
              onClick={() => setFilter("paid")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "paid"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pago
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "rejected"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Rejeitado
            </button>
          </div>

          {/* Earnings Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tempo Gasto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {earnings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Nenhum ganho encontrado
                    </td>
                  </tr>
                ) : (
                  earnings.map((earning) => (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {earning.task_name}
                        </div>
                        {earning.playgrounds && (
                          <div className="text-sm text-gray-500">
                            {earning.playgrounds.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {earning.users?.full_name || "Sem nome"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {earning.users?.email || "Sem email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(earning.submitted_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(earning.time_spent_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(earning.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(earning.status)}
                        {earning.status === "rejected" &&
                          earning.rejected_reason && (
                            <div className="text-xs text-red-600 mt-1">
                              {earning.rejected_reason}
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {earning.paid_at
                          ? new Date(earning.paid_at).toLocaleDateString(
                              "pt-BR"
                            )
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => viewTask(earning.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          disabled={loadingTask}
                        >
                          Ver Task
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Task Details Modal */}
          {selectedTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Detalhes da Task
                    </h2>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Nome:</span>{" "}
                        {selectedTask.earning.users?.full_name || "Sem nome"}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span>{" "}
                        {selectedTask.earning.users?.email || "Sem email"}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Task:</span>{" "}
                        {selectedTask.earning.task_name}
                      </p>
                      {selectedTask.earning.playgrounds && (
                        <p className="text-gray-600">
                          <span className="font-medium">Playground:</span>{" "}
                          {selectedTask.earning.playgrounds.name}
                        </p>
                      )}
                      <p className="text-gray-600">
                        <span className="font-medium">Data:</span>{" "}
                        {new Date(
                          selectedTask.earning.submitted_at
                        ).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Tempo gasto:</span>{" "}
                        {formatTime(selectedTask.earning.time_spent_seconds)}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Valor:</span>{" "}
                        {formatCurrency(selectedTask.earning.amount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Respostas do Usuário
                  </h3>

                  {selectedTask.answers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Nenhuma resposta encontrada
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {selectedTask.answers.map((answer, index) => (
                        <div
                          key={answer.id}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                        >
                          <div className="mb-3">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              Pergunta {index + 1}
                            </span>
                            <p className="text-gray-900 font-medium mt-1">
                              {answer.questions.question_text}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              Resposta
                            </span>
                            {answer.questions.question_type === "select" ? (
                              <div className="mt-1">
                                {answer.questions.options?.find(
                                  (opt) => opt.value === answer.answer_value
                                )?.label ||
                                  answer.answer_value ||
                                  "Sem resposta"}
                              </div>
                            ) : (
                              <div className="mt-1 bg-white p-3 rounded border border-gray-200">
                                {answer.answer_text || "Sem resposta"}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
