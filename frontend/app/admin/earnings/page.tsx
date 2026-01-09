"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { QAEarning } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";

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

export default function AdminEarningsPage() {
  const { user } = useAuthStore();
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
  const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  // Advanced filters
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPlaygroundId, setSelectedPlaygroundId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [groupByUser, setGroupByUser] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);

  // Data for filters
  const [users, setUsers] = useState<any[]>([]);
  const [playgrounds, setPlaygrounds] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filter, selectedUserId, selectedPlaygroundId, dateFrom, dateTo]);

  useEffect(() => {
    if (showBankInfo && groupByUser && earnings.length > 0) {
      const userIds = Array.from(new Set(earnings.map((e) => e.user_id)));
      fetchBankAccounts(userIds);
    }
  }, [showBankInfo, groupByUser, earnings]);

  const fetchFilterData = async () => {
    try {
      // Fetch users for filter
      const usersRes = await api.get("/admin/users");
      const qaUsers = (usersRes.data.data || []).filter((u: any) => u.is_qa);
      setUsers(qaUsers);

      // Fetch playgrounds for filter
      const playgroundsRes = await api.get("/admin/playgrounds");
      setPlaygrounds(playgroundsRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch filter data:", error);
    }
  };

  const fetchBankAccounts = async (userIds: string[]) => {
    try {
      const accounts: Record<string, any> = {};
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const res = await api.get(`/bank-accounts/admin/user/${userId}`);
            if (res.data.data) {
              accounts[userId] = res.data.data;
            }
          } catch (error) {
            // User might not have bank account yet
          }
        })
      );
      setBankAccounts(accounts);
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build params
      const params: any = {
        limit: 1000, // Get all for grouping
      };

      if (filter !== "all") {
        params.status = filter;
      }
      if (selectedUserId) {
        params.user_id = selectedUserId;
      }
      if (selectedPlaygroundId) {
        params.playground_id = selectedPlaygroundId;
      }
      if (dateFrom) {
        params.from_date = dateFrom;
      }
      if (dateTo) {
        params.to_date = dateTo;
      }

      // Fetch earnings
      const earningsRes = await api.get("/earnings/admin", { params });
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

  const viewTask = async (earning: QAEarning) => {
    try {
      setLoadingTask(true);
      const response = await api.get(`/earnings/admin/${earning.id}/answers`);
      setSelectedTask(response.data.data);
    } catch (error) {
      console.error("Failed to fetch task details:", error);
      alert("Erro ao carregar detalhes da task");
    } finally {
      setLoadingTask(false);
    }
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
  };

  const getGroupedEarnings = () => {
    const grouped: {
      [key: string]: { user: any; earnings: QAEarning[]; total: number };
    } = {};

    earnings.forEach((earning) => {
      const userId = earning.user_id;
      if (!grouped[userId]) {
        grouped[userId] = {
          user: { ...earning.users, id: earning.user_id },
          earnings: [],
          total: 0,
        };
      }
      grouped[userId].earnings.push(earning);
      grouped[userId].total += Number(earning.amount);
    });

    return Object.values(grouped);
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

  const exportToPDF = async () => {
    try {
      const pdfMake = (await import("pdfmake/build/pdfmake")).default;
      const pdfFonts = await import("pdfmake/build/vfs_fonts");
      (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts.vfs;

      // Get current user info from auth store
      const adminName = user?.full_name || user?.email || "Admin";

      const now = new Date();
      const dateTime = now.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });

      // Prepare data based on grouping
      let tableBody: any[] = [];
      let totalAmount = 0;

      if (groupByUser) {
        // Grouped view
        const grouped = getGroupedEarnings();

        grouped.forEach((group) => {
          // Group header with user name
          tableBody.push([
            {
              text: group.user?.full_name || "Sem nome",
              bold: true,
              fontSize: 12,
              colSpan: 4,
              fillColor: "#1976d2",
              color: "white",
              margin: [5, 8, 5, 8],
            },
            {},
            {},
            {},
          ]);

          // Add personal and banking info if showBankInfo is enabled
          if (showBankInfo) {
            const personalInfo: string[] = [];
            const bankingInfo: string[] = [];

            // Personal data
            if (group.user?.email)
              personalInfo.push(`Email: ${group.user.email}`);
            if (group.user?.document_number)
              personalInfo.push(`Documento: ${group.user.document_number}`);
            if (group.user?.nationality)
              personalInfo.push(`Nacionalidade: ${group.user.nationality}`);
            if (group.user?.phone)
              personalInfo.push(`Telefone: ${group.user.phone}`);
            if (group.user?.birth_date) {
              personalInfo.push(
                `Nascimento: ${new Date(
                  group.user.birth_date
                ).toLocaleDateString("pt-BR")}`
              );
            }

            // Banking data
            const bankAccount = bankAccounts[group.user?.id];
            if (bankAccount) {
              bankingInfo.push(
                `Status: ${
                  bankAccount.status === "approved"
                    ? "✓ Aprovado"
                    : bankAccount.status === "pending"
                    ? "⏳ Pendente"
                    : "✗ Rejeitado"
                }`
              );

              if (bankAccount.account_type === "brazilian") {
                bankingInfo.push("Tipo: Conta Brasileira");
                if (bankAccount.agency)
                  bankingInfo.push(`Agência: ${bankAccount.agency}`);
                if (bankAccount.account_number)
                  bankingInfo.push(`Conta: ${bankAccount.account_number}`);
                if (bankAccount.pix_key)
                  bankingInfo.push(`PIX: ${bankAccount.pix_key}`);
              } else {
                bankingInfo.push("Tipo: Conta Internacional");
                if (bankAccount.bank_name)
                  bankingInfo.push(`Banco: ${bankAccount.bank_name}`);
                if (bankAccount.iban)
                  bankingInfo.push(`IBAN: ${bankAccount.iban}`);
                if (bankAccount.swift_code)
                  bankingInfo.push(`SWIFT: ${bankAccount.swift_code}`);
              }
            }

            // Add info rows
            if (personalInfo.length > 0 || bankingInfo.length > 0) {
              tableBody.push([
                {
                  colSpan: 4,
                  fillColor: "#f5f5f5",
                  margin: [5, 5, 5, 5],
                  table: {
                    widths: ["50%", "50%"],
                    body: [
                      [
                        {
                          stack: [
                            {
                              text: "👤 Dados Pessoais",
                              bold: true,
                              fontSize: 10,
                              margin: [0, 0, 0, 3],
                            },
                            ...(personalInfo.length > 0
                              ? personalInfo.map((info) => ({
                                  text: info,
                                  fontSize: 8,
                                  margin: [0, 1, 0, 1],
                                }))
                              : [
                                  {
                                    text: "Não cadastrados",
                                    fontSize: 8,
                                    italics: true,
                                    color: "#999",
                                  },
                                ]),
                          ],
                          border: [false, false, true, false],
                          margin: [0, 0, 5, 0],
                        },
                        {
                          stack: [
                            {
                              text: "💳 Dados Bancários",
                              bold: true,
                              fontSize: 10,
                              margin: [0, 0, 0, 3],
                            },
                            ...(bankingInfo.length > 0
                              ? bankingInfo.map((info) => ({
                                  text: info,
                                  fontSize: 8,
                                  margin: [0, 1, 0, 1],
                                }))
                              : [
                                  {
                                    text: "Não cadastrados",
                                    fontSize: 8,
                                    italics: true,
                                    color: "#999",
                                  },
                                ]),
                          ],
                          border: [false, false, false, false],
                          margin: [5, 0, 0, 0],
                        },
                      ],
                    ],
                  },
                  layout: "noBorders",
                },
                {},
                {},
                {},
              ]);
            }
          }

          // Column headers for this group
          tableBody.push([
            { text: "Task", bold: true, fontSize: 9, fillColor: "#e3f2fd" },
            { text: "Data", bold: true, fontSize: 9, fillColor: "#e3f2fd" },
            { text: "Tempo", bold: true, fontSize: 9, fillColor: "#e3f2fd" },
            { text: "Valor", bold: true, fontSize: 9, fillColor: "#e3f2fd" },
          ]);

          // Group earnings
          group.earnings.forEach((earning, idx) => {
            tableBody.push([
              {
                text: earning.task_name,
                fontSize: 9,
                fillColor: idx % 2 === 0 ? "#fafafa" : "white",
              },
              {
                text: new Date(earning.submitted_at).toLocaleDateString(
                  "pt-BR"
                ),
                fontSize: 9,
                fillColor: idx % 2 === 0 ? "#fafafa" : "white",
              },
              {
                text: formatTime(earning.time_spent_seconds),
                fontSize: 9,
                fillColor: idx % 2 === 0 ? "#fafafa" : "white",
              },
              {
                text: formatCurrency(earning.amount),
                fontSize: 9,
                fillColor: idx % 2 === 0 ? "#fafafa" : "white",
                alignment: "right",
              },
            ]);
            totalAmount += earning.amount;
          });

          // Group total
          tableBody.push([
            {
              text: "Subtotal",
              bold: true,
              fontSize: 10,
              colSpan: 3,
              alignment: "right",
              fillColor: "#e8eaf6",
              margin: [0, 5, 0, 5],
            },
            {},
            {},
            {
              text: formatCurrency(group.total),
              bold: true,
              fontSize: 10,
              fillColor: "#e8eaf6",
              alignment: "right",
              margin: [0, 5, 0, 5],
            },
          ]);

          // Separator
          tableBody.push([
            {
              text: "",
              colSpan: 4,
              border: [false, false, false, true],
              borderColor: ["", "", "", "#ccc"],
              margin: [0, 10, 0, 10],
            },
            {},
            {},
            {},
          ]);
        });
      } else {
        // Normal view
        earnings.forEach((earning, idx) => {
          tableBody.push([
            {
              text: earning.users?.full_name || "Sem nome",
              fontSize: 9,
              fillColor: idx % 2 === 0 ? "#fafafa" : "white",
            },
            {
              text: earning.task_name,
              fontSize: 9,
              fillColor: idx % 2 === 0 ? "#fafafa" : "white",
            },
            {
              text: new Date(earning.submitted_at).toLocaleDateString("pt-BR"),
              fontSize: 9,
              fillColor: idx % 2 === 0 ? "#fafafa" : "white",
            },
            {
              text: formatTime(earning.time_spent_seconds),
              fontSize: 9,
              fillColor: idx % 2 === 0 ? "#fafafa" : "white",
            },
            {
              text: formatCurrency(earning.amount),
              fontSize: 9,
              fillColor: idx % 2 === 0 ? "#fafafa" : "white",
              alignment: "right",
            },
          ]);
          totalAmount += earning.amount;
        });
      }

      // Add total row
      if (groupByUser) {
        tableBody.push([
          {
            text: "TOTAL GERAL",
            bold: true,
            fontSize: 12,
            colSpan: 3,
            alignment: "right",
            fillColor: "#1565c0",
            color: "white",
            margin: [0, 8, 0, 8],
          },
          {},
          {},
          {
            text: formatCurrency(totalAmount),
            bold: true,
            fontSize: 12,
            fillColor: "#1565c0",
            color: "white",
            alignment: "right",
            margin: [0, 8, 0, 8],
          },
        ]);
      } else {
        tableBody.push([
          {
            text: "TOTAL GERAL",
            bold: true,
            fontSize: 12,
            colSpan: 4,
            alignment: "right",
            fillColor: "#1565c0",
            color: "white",
            margin: [0, 8, 0, 8],
          },
          {},
          {},
          {},
          {
            text: formatCurrency(totalAmount),
            bold: true,
            fontSize: 12,
            fillColor: "#1565c0",
            color: "white",
            alignment: "right",
            margin: [0, 8, 0, 8],
          },
        ]);
      }

      // Build filter description
      const filterDesc: string[] = [];
      if (filter !== "all") {
        const filterLabels: Record<string, string> = {
          under_review: "Em Análise",
          ready_for_payment: "Pronto para Pagamento",
          paid: "Pago",
          rejected: "Rejeitado",
        };
        filterDesc.push(`Status: ${filterLabels[filter]}`);
      }
      if (selectedUserId) {
        const user = users.find((u) => u.id === selectedUserId);
        filterDesc.push(`Usuário: ${user?.full_name || user?.email}`);
      }
      if (selectedPlaygroundId) {
        const pg = playgrounds.find((p) => p.id === selectedPlaygroundId);
        filterDesc.push(`Playground: ${pg?.name}`);
      }
      if (dateFrom) {
        filterDesc.push(
          `De: ${new Date(dateFrom).toLocaleDateString("pt-BR")}`
        );
      }
      if (dateTo) {
        filterDesc.push(`Até: ${new Date(dateTo).toLocaleDateString("pt-BR")}`);
      }

      const docDefinition: any = {
        pageSize: "A4",
        pageOrientation: "landscape",
        pageMargins: [40, 90, 40, 60],
        header: (currentPage: number, pageCount: number) => {
          return {
            margin: [40, 20, 40, 10],
            stack: [
              {
                columns: [
                  {
                    stack: [
                      { text: "Relatório de Earnings", style: "header" },
                      {
                        text: showBankInfo
                          ? "Dados Pessoais e Bancários Incluídos"
                          : "Resumo Financeiro",
                        style: "headerSubtitle",
                        color: "#666",
                      },
                    ],
                    width: "*",
                  },
                  {
                    stack: [
                      {
                        text: `Página ${currentPage}/${pageCount}`,
                        style: "pageNumber",
                        alignment: "right",
                      },
                      {
                        text: `${dateTime}`,
                        style: "metadata",
                        alignment: "right",
                      },
                      {
                        text: `Admin: ${adminName}`,
                        style: "metadata",
                        alignment: "right",
                      },
                    ],
                    width: "auto",
                  },
                ],
              },
              {
                text:
                  filterDesc.length > 0
                    ? `📊 ${filterDesc.join(" • ")}`
                    : "📊 Todos os earnings",
                style: "filterInfo",
                margin: [0, 5, 0, 0],
              },
              {
                canvas: [
                  {
                    type: "line",
                    x1: 0,
                    y1: 5,
                    x2: 762,
                    y2: 5,
                    lineWidth: 2,
                    lineColor: "#1976d2",
                  },
                ],
              },
            ],
          };
        },
        footer: (currentPage: number, pageCount: number) => {
          return {
            margin: [40, 15, 40, 0],
            columns: [
              {
                text: "AI Marisa Playground - Sistema de Gestão de Pagamentos",
                fontSize: 8,
                color: "#666",
                width: "*",
              },
              {
                text: `${currentPage}/${pageCount}`,
                fontSize: 8,
                color: "#666",
                alignment: "right",
                width: "auto",
              },
            ],
          };
        },
        content: [
          {
            table: {
              headerRows: 1,
              widths: groupByUser ? ["*", "*", 80, 80] : [120, "*", 80, 80, 80],
              body: [
                // Header row
                groupByUser
                  ? [
                      { text: "Task/Usuário", style: "tableHeader" },
                      { text: "Data", style: "tableHeader" },
                      { text: "Tempo", style: "tableHeader" },
                      { text: "Valor", style: "tableHeader" },
                    ]
                  : [
                      { text: "QA", style: "tableHeader" },
                      { text: "Task", style: "tableHeader" },
                      { text: "Data", style: "tableHeader" },
                      { text: "Tempo", style: "tableHeader" },
                      { text: "Valor", style: "tableHeader" },
                    ],
                ...tableBody,
              ],
            },
            layout: {
              fillColor: (rowIndex: number) => {
                return rowIndex === 0 ? "#1976d2" : null;
              },
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => "#e0e0e0",
              vLineColor: () => "#e0e0e0",
            },
          },
        ],
        styles: {
          header: {
            fontSize: 20,
            bold: true,
            color: "#1976d2",
            margin: [0, 0, 0, 2],
          },
          headerSubtitle: {
            fontSize: 10,
            color: "#666",
            italics: true,
          },
          filterInfo: {
            fontSize: 9,
            color: "#424242",
            background: "#f5f5f5",
          },
          pageNumber: {
            fontSize: 9,
            bold: true,
            color: "#1976d2",
          },
          metadata: {
            fontSize: 8,
            color: "#666",
            margin: [0, 1, 0, 0],
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: "white",
            fillColor: "#1976d2",
            alignment: "left",
            margin: [5, 5, 5, 5],
          },
        },
      };

      pdfMake
        .createPdf(docDefinition)
        .download(`earnings-report-${now.getTime()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
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
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Exportar PDF
              </button>
            </div>

            {/* Status Filters */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuário
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os usuários</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Playground
                </label>
                <select
                  value={selectedPlaygroundId}
                  onChange={(e) => setSelectedPlaygroundId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os playgrounds</option>
                  {playgrounds.map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Group By User Checkbox */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="groupByUser"
                  checked={groupByUser}
                  onChange={(e) => {
                    setGroupByUser(e.target.checked);
                    if (!e.target.checked) {
                      setShowBankInfo(false);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="groupByUser"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Agrupar por usuário
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showBankInfo"
                  checked={showBankInfo}
                  onChange={(e) => setShowBankInfo(e.target.checked)}
                  disabled={!groupByUser}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="showBankInfo"
                  className={`text-sm font-medium cursor-pointer ${
                    groupByUser ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  Ver informações financeiras
                </label>
              </div>
            </div>
          </div>

          {/* Earnings Table or Grouped View */}
          {groupByUser ? (
            /* Grouped by User View */
            <div className="space-y-4">
              {getGroupedEarnings().map((group) => {
                if (showBankInfo) {
                  console.log("[Render] Estado de bankAccounts:", bankAccounts);
                  console.log("[Render] Group user:", group.user);
                  console.log("[Render] Group user ID:", group.user?.id);
                  console.log(
                    "[Render] BankAccount para esse user:",
                    bankAccounts[group.user?.id]
                  );
                }
                return (
                  <div
                    key={group.user?.email || "unknown"}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    {/* User Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {group.user?.full_name || "Sem nome"}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {group.user?.email || "Sem email"}
                              </p>
                            </div>

                            {showBankInfo && (
                              <div className="ml-6 pl-6 border-l-2 border-gray-300">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                                      👤 Dados Pessoais
                                    </span>
                                  </div>
                                  <div className="space-y-0.5">
                                    {group.user?.document_number && (
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Documento:
                                        </span>{" "}
                                        {group.user.document_number}
                                      </p>
                                    )}
                                    {group.user?.nationality && (
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Nacionalidade:
                                        </span>{" "}
                                        {group.user.nationality}
                                      </p>
                                    )}
                                    {group.user?.phone && (
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Telefone:
                                        </span>{" "}
                                        {group.user.phone}
                                      </p>
                                    )}
                                    {group.user?.birth_date && (
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Nascimento:
                                        </span>{" "}
                                        {new Date(
                                          group.user.birth_date
                                        ).toLocaleDateString("pt-BR")}
                                      </p>
                                    )}
                                    {!group.user?.document_number &&
                                      !group.user?.nationality &&
                                      !group.user?.phone &&
                                      !group.user?.birth_date && (
                                        <p className="text-xs text-gray-500 italic">
                                          Dados não cadastrados
                                        </p>
                                      )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {showBankInfo && bankAccounts[group.user?.id] && (
                              <div className="ml-6 pl-6 border-l-2 border-blue-300">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                      💳 Dados Bancários
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded-full ${
                                        bankAccounts[group.user?.id].status ===
                                        "approved"
                                          ? "bg-green-100 text-green-800"
                                          : bankAccounts[group.user?.id]
                                              .status === "pending"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {bankAccounts[group.user?.id].status ===
                                      "approved"
                                        ? "✓ Aprovado"
                                        : bankAccounts[group.user?.id]
                                            .status === "pending"
                                        ? "⏳ Pendente"
                                        : "✗ Rejeitado"}
                                    </span>
                                  </div>
                                  {bankAccounts[group.user?.id].account_type ===
                                  "brazilian" ? (
                                    <div className="space-y-0.5">
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Tipo:
                                        </span>{" "}
                                        Conta Brasileira
                                      </p>
                                      {bankAccounts[group.user?.id].agency && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Agência:
                                          </span>{" "}
                                          {bankAccounts[group.user?.id].agency}
                                        </p>
                                      )}
                                      {bankAccounts[group.user?.id]
                                        .account_number && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Conta:
                                          </span>{" "}
                                          {
                                            bankAccounts[group.user?.id]
                                              .account_number
                                          }
                                        </p>
                                      )}
                                      {bankAccounts[group.user?.id].pix_key && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Chave PIX:
                                          </span>{" "}
                                          {bankAccounts[group.user?.id].pix_key}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">
                                          Tipo:
                                        </span>{" "}
                                        Conta Internacional
                                      </p>
                                      {bankAccounts[group.user?.id]
                                        .bank_name && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Banco:
                                          </span>{" "}
                                          {
                                            bankAccounts[group.user?.id]
                                              .bank_name
                                          }
                                        </p>
                                      )}
                                      {bankAccounts[group.user?.id].iban && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            IBAN:
                                          </span>{" "}
                                          {bankAccounts[group.user?.id].iban}
                                        </p>
                                      )}
                                      {bankAccounts[group.user?.id]
                                        .swift_code && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            SWIFT:
                                          </span>{" "}
                                          {
                                            bankAccounts[group.user?.id]
                                              .swift_code
                                          }
                                        </p>
                                      )}
                                      {bankAccounts[group.user?.id]
                                        .international_account_number && (
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Conta:
                                          </span>{" "}
                                          {
                                            bankAccounts[group.user?.id]
                                              .international_account_number
                                          }
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {showBankInfo && !bankAccounts[group.user?.id] && (
                              <div className="ml-6 pl-6 border-l-2 border-red-300">
                                <div className="flex items-center gap-2 text-red-600">
                                  <span className="text-xs font-semibold">
                                    ⚠️
                                  </span>
                                  <span className="text-xs font-medium">
                                    Sem dados bancários
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm text-gray-600">
                            Total de Earnings
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            {formatCurrency(group.total)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {group.earnings.length} tasks
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* User's Earnings Table */}
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
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
                        {group.earnings.map((earning) => (
                          <tr key={earning.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
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
                              {new Date(
                                earning.submitted_at
                              ).toLocaleDateString("pt-BR")}
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
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => viewTask(earning)}
                                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                                  disabled={loadingTask}
                                >
                                  Ver
                                </button>
                                {earning.status === "under_review" && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(earning.id)}
                                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                                    >
                                      Aprovar
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(earning)}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                                    >
                                      Rejeitar
                                    </button>
                                  </>
                                )}
                                {earning.status === "ready_for_payment" && (
                                  <button
                                    onClick={() => handlePay(earning.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                                  >
                                    Pagar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {getGroupedEarnings().length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  Nenhum earning encontrado
                </div>
              )}
            </div>
          ) : (
            /* Normal Table View */
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
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => viewTask(earning)}
                              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                              disabled={loadingTask}
                            >
                              Ver Task
                            </button>
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
          )}
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
                    <p className="text-gray-600">
                      <span className="font-medium">Status:</span>{" "}
                      {getStatusBadge(selectedTask.earning.status)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeTaskModal}
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
                  onClick={closeTaskModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

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
