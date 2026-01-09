"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { QAEarning } from "@/lib/types";

interface EvaluationAnswer {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: string | null;
  rating: number | null;
  questions: {
    question_text: string;
    question_type: string;
    options: Array<{ label: string; value: string }> | null;
  };
}

export default function RewardsHistoryPage() {
  const [earnings, setEarnings] = useState<QAEarning[]>([]);
  const [filteredEarnings, setFilteredEarnings] = useState<QAEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<EvaluationAnswer[]>(
    []
  );
  const [selectedEarning, setSelectedEarning] = useState<QAEarning | null>(
    null
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchEarnings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    earnings,
    statusFilter,
    searchTerm,
    dateFromFilter,
    dateToFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/earnings", {
        params: { limit: 1000 },
      });
      setEarnings(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...earnings];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.playground_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filters
    if (dateFromFilter) {
      filtered = filtered.filter(
        (e) => new Date(e.submitted_at) >= new Date(dateFromFilter)
      );
    }
    if (dateToFilter) {
      filtered = filtered.filter(
        (e) => new Date(e.submitted_at) <= new Date(dateToFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.submitted_at).getTime();
        const dateB = new Date(b.submitted_at).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
    });

    setFilteredEarnings(filtered);
  };

  const openAnswersModal = async (earning: QAEarning) => {
    try {
      setSelectedEarning(earning);
      setModalOpen(true);
      const res = await api.get(`/earnings/${earning.id}/answers`);
      setSelectedAnswers(res.data.data.answers || []);
    } catch (error) {
      console.error("Failed to fetch answers:", error);
      alert("Erro ao carregar respostas");
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}min ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      under_review: "bg-yellow-100 text-yellow-800",
      ready_for_payment: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    const labels: Record<string, string> = {
      under_review: "Em Revisão",
      ready_for_payment: "Aprovado",
      paid: "Pago",
      rejected: "Rejeitado",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
    setDateFromFilter("");
    setDateToFilter("");
    setSortBy("date");
    setSortOrder("desc");
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Histórico de Recompensas
            </h1>
            <p className="text-gray-600">
              Visualize todas as suas tasks e ganhos
            </p>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpar Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="under_review">Em Revisão</option>
                  <option value="ready_for_payment">Aprovado</option>
                  <option value="paid">Pago</option>
                  <option value="rejected">Rejeitado</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Task, ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar Por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "amount")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="date">Data</option>
                  <option value="amount">Valor</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordem
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "asc" | "desc")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="desc">Decrescente</option>
                  <option value="asc">Crescente</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-semibold">{filteredEarnings.length}</span>{" "}
              de <span className="font-semibold">{earnings.length}</span>{" "}
              registros
            </div>
          </div>

          {/* Earnings Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tempo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEarnings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredEarnings.map((earning) => (
                      <tr key={earning.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {earning.task_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {earning.id.substring(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(earning.submitted_at).toLocaleDateString(
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(earning.time_spent_seconds)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openAnswersModal(earning)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver Respostas
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Answers Modal */}
        {modalOpen && selectedEarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Respostas da Task
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEarning.task_name} •{" "}
                    {formatCurrency(selectedEarning.amount)}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
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
                {/* Earning Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Data:</span>{" "}
                      <span className="font-medium">
                        {new Date(
                          selectedEarning.submitted_at
                        ).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tempo:</span>{" "}
                      <span className="font-medium">
                        {formatTime(selectedEarning.time_spent_seconds)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>{" "}
                      {getStatusBadge(selectedEarning.status)}
                    </div>
                    <div>
                      <span className="text-gray-600">Valor:</span>{" "}
                      <span className="font-semibold text-green-700">
                        {formatCurrency(selectedEarning.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <h4 className="font-semibold text-gray-900 mb-4">
                  Suas Respostas:
                </h4>
                {selectedAnswers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Carregando respostas...
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedAnswers.map((answer, index) => (
                      <div key={answer.id} className="border rounded-lg p-4">
                        <div className="font-medium text-gray-900 mb-2">
                          {index + 1}. {answer.questions.question_text}
                        </div>
                        <div className="bg-blue-50 rounded p-3">
                          {answer.questions.question_type === "select" ? (
                            <p className="text-blue-900 font-medium">
                              {answer.answer_value ||
                                answer.answer_text ||
                                "Sem resposta"}
                            </p>
                          ) : (
                            <p className="text-blue-900">
                              {answer.answer_text ||
                                answer.answer_value ||
                                "Sem resposta"}
                            </p>
                          )}
                          {answer.rating && (
                            <p className="text-sm text-blue-700 mt-1">
                              Nota: {answer.rating}/5 ⭐
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
