"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { QAEarning } from "@/lib/types";

export default function AdminEarningsPage() {
  const [earnings, setEarnings] = useState<QAEarning[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "under_review" | "ready_for_payment" | "paid" | "rejected"
  >("all");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedEarning, setSelectedEarning] = useState<QAEarning | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch earnings
      const earningsRes = await api.get("/earnings/admin", {
        params: filter !== "all" ? { status: filter } : {},
      });
      setEarnings(earningsRes.data.data || []);

      // Fetch stats
      const statsRes = await api.get("/earnings/admin/stats");
      setStats(statsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/earnings/admin/${id}/approve`);
      alert("Earning aprovado com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Failed to approve earning:", error);
      alert("Erro ao aprovar earning");
    }
  };

  const handlePay = async (id: string) => {
    if (!confirm("Tem certeza que deseja marcar como pago?")) return;

    try {
      await api.put(`/earnings/admin/${id}/pay`);
      alert("Earning marcado como pago!");
      fetchData();
    } catch (error) {
      console.error("Failed to pay earning:", error);
      alert("Erro ao marcar como pago");
    }
  };

  const openRejectModal = (earning: QAEarning) => {
    setSelectedEarning(earning);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedEarning || !rejectReason.trim()) {
      alert("Por favor, informe o motivo da rejeição");
      return;
    }

    try {
      await api.put(`/earnings/admin/${selectedEarning.id}/reject`, {
        reason: rejectReason,
      });
      alert("Earning rejeitado");
      setRejectModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to reject earning:", error);
      alert("Erro ao rejeitar earning");
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Gerenciar Earnings
          </h1>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Em Análise
                </h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(stats.under_review.total)}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {stats.under_review.count} earnings
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Pronto p/ Pagamento
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(stats.ready_for_payment.total)}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {stats.ready_for_payment.count} earnings
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  Pagos (Total)
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(stats.paid.total)}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {stats.paid.count} earnings
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
                    QA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task/Playground
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
                {earnings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Nenhum earning encontrado
                    </td>
                  </tr>
                ) : (
                  earnings.map((earning) => (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {earning.users && (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {earning.users.full_name || "Sem nome"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {earning.users.email}
                            </div>
                          </div>
                        )}
                      </td>
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {earning.status === "under_review" && (
                            <>
                              <button
                                onClick={() => handleApprove(earning.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => openRejectModal(earning)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {earning.status === "ready_for_payment" && (
                            <button
                              onClick={() => handlePay(earning.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Marcar como Pago
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reject Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Rejeitar Earning
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Informe o motivo da rejeição:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
                rows={4}
                placeholder="Motivo da rejeição..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
