"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
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

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
];

// ─── Types ───────────────────────────────────────────────────

interface QuestionMetric {
  question_id: string;
  question_text: string;
  question_type: string;
  total_responses: number;
  option_distribution:
    | {
        option: string;
        value: string;
        count: number;
        percentage: number;
      }[]
    | null;
}

interface OpenResponse {
  question_id: string;
  question_text: string;
  answer_text: string;
  session_id: string;
  created_at: string;
}

interface ConversationEvaluation {
  curation_evaluation_id: string;
  user_id: string;
  session_id: string;
  user_email: string;
  user_name: string | null;
  created_at: string;
  answers: Record<string, string>; // question_id → answer_value
}

interface ConversationWithEvals {
  id: string;
  conversation_id: string;
  agent_id: string;
  duration_seconds: number | null;
  call_datetime: string | null;
  transcript: any | null;
  audio_url: string | null;
  call_status: string | null;
  call_termination_reason: string | null;
  status: string;
  selected: boolean;
  max_passes: number;
  current_passes: number;
  evaluations: ConversationEvaluation[];
  evaluation_count: number;
  clickup_task_id: string | null;
  clickup_task_url: string | null;
}

interface Stats {
  totalConversations: number;
  selectedConversations: number;
  completedEvaluations: number;
  totalExpectedEvaluations: number;
  completionPercentage: number;
  uniqueTesters: number;
}

interface EvaluationDetailResponse {
  question_id: string;
  question_text: string;
  question_type: string;
  answer_text: string | null;
  answer_value: string | null;
  answer_label: string | null;
  rating: number | null;
}

interface EvaluationDetail {
  session_id: string;
  user_email: string;
  user_name: string | null;
  created_at: string;
  responses: EvaluationDetailResponse[];
}

interface TaskDraft {
  name: string;
  description: string;
  priority: number;
  tags: string[];
  conversation_record_id: string;
  conversation_id: string;
}

interface ClickUpTaskStatus {
  clickup_task_id: string;
  clickup_task_url: string;
  status: string;
  status_color: string;
  name: string;
  priority: any;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgente",
  2: "Alta",
  3: "Normal",
  4: "Baixa",
};

const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-gray-100 text-gray-800",
};

// ─── Component ───────────────────────────────────────────────

export default function CurationMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;
  const { token } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [questionMetrics, setQuestionMetrics] = useState<QuestionMetric[]>([]);
  const [openResponses, setOpenResponses] = useState<OpenResponse[]>([]);
  const [conversations, setConversations] = useState<ConversationWithEvals[]>(
    [],
  );
  const [playgroundName, setPlaygroundName] = useState("");

  // Modal state
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithEvals | null>(null);
  const [selectedEvalDetail, setSelectedEvalDetail] =
    useState<EvaluationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ClickUp task state
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [generatingTask, setGeneratingTask] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [clickupTaskStatus, setClickupTaskStatus] =
    useState<ClickUpTaskStatus | null>(null);
  const [loadingTaskStatus, setLoadingTaskStatus] = useState(false);
  const [taskStatusMap, setTaskStatusMap] = useState<
    Record<string, ClickUpTaskStatus>
  >({});

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [questionFilters, setQuestionFilters] = useState<
    Record<string, string>
  >({});

  // Select-type questions for filter dropdowns
  const selectQuestions = questionMetrics.filter(
    (q) =>
      q.question_type === "select" &&
      q.option_distribution &&
      q.option_distribution.length > 0,
  );

  useEffect(() => {
    fetchData();
  }, [playgroundId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [pgRes, metricsRes] = await Promise.all([
        api.get(`/admin/playgrounds/${playgroundId}`),
        api.get(`/curation/detailed-metrics/${playgroundId}`),
      ]);

      setPlaygroundName(pgRes.data.data.name);
      const d = metricsRes.data.data;
      setStats(d.stats);
      setQuestionMetrics(d.questionMetrics || []);
      setOpenResponses(d.openResponses || []);
      setConversations(d.conversations || []);

      // Fetch ClickUp task statuses for conversations that have tasks
      const withTasks = (d.conversations || []).filter(
        (c: ConversationWithEvals) => c.clickup_task_id,
      );
      if (withTasks.length > 0) {
        fetchAllTaskStatuses(withTasks);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTaskStatuses = async (convs: ConversationWithEvals[]) => {
    const results: Record<string, ClickUpTaskStatus> = {};
    await Promise.allSettled(
      convs.map(async (c) => {
        try {
          const res = await api.get(`/curation/task-status/${c.id}`);
          if (res.data.data) {
            results[c.id] = res.data.data;
          }
        } catch (err) {
          // ignore individual failures
        }
      }),
    );
    setTaskStatusMap(results);
  };

  const openConversationModal = async (conv: ConversationWithEvals) => {
    setSelectedConversation(conv);
    setSelectedEvalDetail(null);
    setTaskDraft(null);
    setShowTaskForm(false);
    setClickupTaskStatus(null);

    // Fetch ClickUp task status if task exists
    if (conv.clickup_task_id) {
      fetchTaskStatus(conv.id);
    }
  };

  const fetchTaskStatus = async (conversationRecordId: string) => {
    try {
      setLoadingTaskStatus(true);
      const res = await api.get(
        `/curation/task-status/${conversationRecordId}`,
      );
      setClickupTaskStatus(res.data.data);
    } catch (err: any) {
      console.error("Failed to fetch task status:", err);
    } finally {
      setLoadingTaskStatus(false);
    }
  };

  const handleGenerateTask = async (conversationRecordId: string) => {
    try {
      setGeneratingTask(true);
      const res = await api.post(
        `/curation/generate-task/${conversationRecordId}`,
      );
      setTaskDraft(res.data.data);
      setShowTaskForm(true);
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert("Já existe uma task criada para esta conversa.");
      } else {
        alert(
          err.response?.data?.error || "Erro ao gerar sugestão de task com IA",
        );
      }
    } finally {
      setGeneratingTask(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskDraft || !selectedConversation) return;
    try {
      setCreatingTask(true);
      const res = await api.post(
        `/curation/create-task/${selectedConversation.id}`,
        {
          name: taskDraft.name,
          description: taskDraft.description,
          priority: taskDraft.priority,
          tags: taskDraft.tags,
        },
      );

      const { clickup_task_id, clickup_task_url } = res.data.data;

      // Update local state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, clickup_task_id, clickup_task_url }
            : c,
        ),
      );
      setSelectedConversation((prev) =>
        prev ? { ...prev, clickup_task_id, clickup_task_url } : prev,
      );

      setShowTaskForm(false);
      setTaskDraft(null);

      // Fetch status for modal and listing
      fetchTaskStatus(selectedConversation.id);
      setTaskStatusMap((prev) => ({
        ...prev,
        [selectedConversation.id]: {
          clickup_task_id: clickup_task_id,
          clickup_task_url: clickup_task_url,
          status: "to do",
          status_color: "#d3d3d3",
          name: taskDraft.name,
          priority: taskDraft.priority,
        },
      }));

      alert("Task criada com sucesso no ClickUp!");
    } catch (err: any) {
      if (err.response?.status === 409) {
        alert("Já existe uma task criada para esta conversa.");
      } else {
        alert(err.response?.data?.error || "Erro ao criar task no ClickUp");
      }
    } finally {
      setCreatingTask(false);
    }
  };

  const fetchEvalDetail = async (sessionId: string) => {
    try {
      setLoadingDetail(true);
      const res = await api.get(
        `/curation/evaluation-detail/${playgroundId}/${sessionId}`,
      );
      setSelectedEvalDetail(res.data.data);
    } catch (err: any) {
      console.error("Failed to fetch evaluation detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const audioUrl = (conversationId: string) =>
    `${API_URL}/curation/audio/${conversationId}?token=${token}`;

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.conversation_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.evaluations.some((e) =>
        e.user_email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    // Question answer filters: conversation matches if ANY of its evaluations
    // has the selected answer for each filtered question
    const activeQuestionFilters = Object.entries(questionFilters).filter(
      ([, v]) => v !== "all",
    );
    const matchesQuestions =
      activeQuestionFilters.length === 0 ||
      c.evaluations.some((ev) =>
        activeQuestionFilters.every(
          ([qId, expectedValue]) => ev.answers?.[qId] === expectedValue,
        ),
      );

    return matchesSearch && matchesStatus && matchesQuestions;
  });

  // ─── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Carregando métricas de curadoria...</p>
            </div>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  if (error || !stats) {
    return (
      <AdminGuard>
        <Layout>
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error || "Métricas não encontradas"}
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
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
              <h1 className="text-3xl font-bold">{playgroundName}</h1>
              <p className="text-gray-600 mt-1">Métricas de Curadoria</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin/playground/${playgroundId}`)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Editar Playground
              </button>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">
                Conversas Selecionadas
              </p>
              <p className="text-3xl font-bold">
                {stats.selectedConversations}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                de {stats.totalConversations} total
              </p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">
                Avaliações Concluídas
              </p>
              <p className="text-3xl font-bold">{stats.completedEvaluations}</p>
              <p className="text-xs text-gray-500 mt-1">
                de {stats.totalExpectedEvaluations} esperadas
              </p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Progresso</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, stats.completionPercentage)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-2xl font-bold min-w-[60px]">
                  {Math.round(stats.completionPercentage)}%
                </p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">Avaliadores Únicos</p>
              <p className="text-3xl font-bold">{stats.uniqueTesters}</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-1">
                Média Aval./Avaliador
              </p>
              <p className="text-3xl font-bold">
                {stats.uniqueTesters > 0
                  ? (stats.completedEvaluations / stats.uniqueTesters).toFixed(
                      1,
                    )
                  : "0"}
              </p>
            </div>
          </div>

          {/* Question Analytics */}
          {questionMetrics.length > 0 && (
            <section className="bg-white border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Análise de Perguntas
              </h2>

              <div className="space-y-8">
                {questionMetrics.map((question) => (
                  <div
                    key={question.question_id}
                    className="border rounded-lg p-5"
                  >
                    <h3 className="font-medium text-lg mb-2">
                      {question.question_text}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Total de respostas: {question.total_responses} • Tipo:{" "}
                      {question.question_type === "select"
                        ? "Seleção"
                        : question.question_type === "input_string"
                          ? "Texto livre"
                          : question.question_type === "boolean"
                            ? "Sim/Não"
                            : question.question_type}
                    </p>

                    {question.option_distribution &&
                      question.option_distribution.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Pie Chart */}
                          <div>
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={question.option_distribution}
                                  dataKey="count"
                                  nameKey="option"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={90}
                                  label={(entry) =>
                                    entry.count > 0
                                      ? `${entry.percentage.toFixed(0)}%`
                                      : ""
                                  }
                                >
                                  {question.option_distribution.map(
                                    (_, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                      />
                                    ),
                                  )}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Bar chart + table */}
                          <div>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={question.option_distribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="option"
                                  tick={{ fontSize: 12 }}
                                  interval={0}
                                  angle={-20}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" name="Respostas">
                                  {question.option_distribution.map(
                                    (_, index) => (
                                      <Cell
                                        key={`bar-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                      />
                                    ),
                                  )}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>

                            <table className="w-full text-sm mt-4">
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
                                      <td className="py-2 flex items-center gap-2">
                                        <span
                                          className="w-3 h-3 rounded-full inline-block"
                                          style={{
                                            backgroundColor:
                                              COLORS[idx % COLORS.length],
                                          }}
                                        ></span>
                                        {opt.option}
                                      </td>
                                      <td className="text-right">
                                        {opt.count}
                                      </td>
                                      <td className="text-right">
                                        {opt.percentage.toFixed(1)}%
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {question.question_type === "input_string" && (
                      <p className="text-sm text-gray-500 italic">
                        Respostas abertas na seção abaixo
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
                      <th className="text-left py-3 px-4">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openResponses.map((resp, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 max-w-xs">
                          {resp.question_text}
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <div className="max-h-20 overflow-y-auto">
                            {resp.answer_text}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatDate(resp.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Conversations Table */}
          <section className="bg-white border rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Avaliações por Conversa ({filteredConversations.length})
              </h2>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                placeholder="Buscar por ID ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm w-64"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="completed">Concluída</option>
                <option value="in_progress">Em andamento</option>
                <option value="pending">Pendente</option>
              </select>
              {selectQuestions.map((q) => (
                <select
                  key={q.question_id}
                  value={questionFilters[q.question_id] || "all"}
                  onChange={(e) =>
                    setQuestionFilters((prev) => ({
                      ...prev,
                      [q.question_id]: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border rounded-lg text-sm max-w-[220px]"
                  title={q.question_text}
                >
                  <option value="all">
                    {q.question_text.length > 25
                      ? q.question_text.substring(0, 25) + "…"
                      : q.question_text}
                    : Todos
                  </option>
                  {q.option_distribution!.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.option}
                    </option>
                  ))}
                </select>
              ))}
              {(Object.values(questionFilters).some((v) => v !== "all") ||
                statusFilter !== "all" ||
                searchTerm) && (
                <button
                  onClick={() => {
                    setQuestionFilters({});
                    setStatusFilter("all");
                    setSearchTerm("");
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Conversation ID</th>
                    <th className="text-left py-3 px-4">Data/Hora</th>
                    <th className="text-left py-3 px-4">Duração</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Encerramento</th>
                    <th className="text-center py-3 px-4">Avaliações</th>
                    <th className="text-left py-3 px-4">Avaliadores</th>
                    <th className="text-center py-3 px-4">ClickUp</th>
                    <th className="text-left py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConversations.map((conv) => (
                    <tr
                      key={conv.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        <span
                          title={`Clique para copiar: ${conv.conversation_id}`}
                          className="cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => {
                            navigator.clipboard.writeText(conv.conversation_id);
                            const el =
                              document.activeElement as HTMLElement | null;
                            if (el) el.blur();
                            alert("ID copiado!");
                          }}
                        >
                          {conv.conversation_id.substring(0, 12)}...
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(conv.call_datetime)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDuration(conv.duration_seconds)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            conv.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : conv.status === "in_progress"
                                ? "bg-yellow-100 text-yellow-800"
                                : conv.status === "pending"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {conv.status === "completed"
                            ? "Concluída"
                            : conv.status === "in_progress"
                              ? "Em andamento"
                              : conv.status === "pending"
                                ? "Pendente"
                                : conv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {conv.call_termination_reason || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold">
                          {conv.evaluation_count}
                        </span>
                        <span className="text-gray-500">
                          /{conv.max_passes}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {conv.evaluations.slice(0, 3).map((ev) => (
                            <div
                              key={ev.curation_evaluation_id}
                              className="text-xs text-gray-600"
                            >
                              {ev.user_email}
                            </div>
                          ))}
                          {conv.evaluations.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{conv.evaluations.length - 3} mais
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {conv.clickup_task_id ? (
                          (() => {
                            const ts = taskStatusMap[conv.id];
                            return (
                              <a
                                href={conv.clickup_task_url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                                style={
                                  ts
                                    ? {
                                        backgroundColor: `${ts.status_color}20`,
                                        color: ts.status_color,
                                      }
                                    : undefined
                                }
                                title={
                                  ts
                                    ? `${ts.name} — ${ts.status}`
                                    : "Abrir task no ClickUp"
                                }
                              >
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      ts?.status_color || "#8b5cf6",
                                  }}
                                />
                                {ts ? ts.status : "📋 Task"}
                              </a>
                            );
                          })()
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openConversationModal(conv)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredConversations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma conversa encontrada
                </div>
              )}
            </div>
          </section>

          {/* Empty State */}
          {stats.completedEvaluations === 0 && questionMetrics.length === 0 && (
            <div className="bg-gray-50 border rounded-lg p-12 text-center">
              <p className="text-lg text-gray-600">
                Nenhuma avaliação realizada ainda
              </p>
              <p className="text-sm text-gray-500 mt-2">
                As métricas aparecerão conforme as avaliações forem concluídas
              </p>
            </div>
          )}
        </div>

        {/* ─── Conversation Detail Modal ─────────────────────────── */}
        {selectedConversation && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedConversation(null);
              setSelectedEvalDetail(null);
            }}
          >
            <div
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      Detalhes da Conversa
                    </h2>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>ID:</strong>{" "}
                        <span className="font-mono">
                          {selectedConversation.conversation_id}
                        </span>
                      </p>
                      <p>
                        <strong>Data/Hora:</strong>{" "}
                        {formatDate(selectedConversation.call_datetime)}
                      </p>
                      <p>
                        <strong>Duração:</strong>{" "}
                        {formatDuration(selectedConversation.duration_seconds)}
                      </p>
                      {selectedConversation.call_status && (
                        <p>
                          <strong>Status da chamada:</strong>{" "}
                          {selectedConversation.call_status}
                        </p>
                      )}
                      {selectedConversation.call_termination_reason && (
                        <p>
                          <strong>Encerramento:</strong>{" "}
                          {selectedConversation.call_termination_reason}
                        </p>
                      )}
                      <p>
                        <strong>Avaliações:</strong>{" "}
                        {selectedConversation.evaluation_count}/
                        {selectedConversation.max_passes}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      setSelectedEvalDetail(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Audio Player */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Áudio</h3>
                  <audio
                    controls
                    className="w-full"
                    src={audioUrl(selectedConversation.conversation_id)}
                  >
                    Seu navegador não suporta o elemento de áudio.
                  </audio>
                </div>

                {/* Transcript */}
                {selectedConversation.transcript &&
                  selectedConversation.transcript.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Transcrição
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto space-y-3">
                        {selectedConversation.transcript.map(
                          (msg: any, idx: number) => {
                            const isAgent =
                              msg.role === "agent" || msg.role === "assistant";
                            return (
                              <div
                                key={idx}
                                className={`flex ${
                                  isAgent ? "justify-start" : "justify-end"
                                }`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                                    isAgent
                                      ? "bg-white border border-gray-200"
                                      : "bg-blue-600 text-white"
                                  }`}
                                >
                                  <div
                                    className={`text-xs font-medium mb-1 ${
                                      isAgent
                                        ? "text-gray-500"
                                        : "text-blue-100"
                                    }`}
                                  >
                                    {isAgent ? "Agente" : "Usuário"}
                                  </div>
                                  <div className="text-sm">
                                    {msg.message || msg.text || msg.content}
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                {/* Evaluations for this conversation */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">
                    Avaliações ({selectedConversation.evaluations.length})
                  </h3>

                  {selectedConversation.evaluations.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      Nenhuma avaliação realizada para esta conversa
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedConversation.evaluations.map((ev) => (
                        <div
                          key={ev.curation_evaluation_id}
                          className="border rounded-lg p-4 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">
                              {ev.user_name || ev.user_email}
                            </div>
                            {ev.user_name && (
                              <div className="text-xs text-gray-500">
                                {ev.user_email}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {formatDate(ev.created_at)}
                            </div>
                          </div>
                          <button
                            onClick={() => fetchEvalDetail(ev.session_id)}
                            disabled={loadingDetail}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loadingDetail &&
                            selectedEvalDetail?.session_id === ev.session_id
                              ? "Carregando..."
                              : "Ver Respostas"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ClickUp Task Section */}
                <div className="mb-6 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">
                    🎫 ClickUp Task
                  </h3>

                  {loadingTaskStatus ? (
                    <div className="text-sm text-gray-500">
                      Carregando status da task...
                    </div>
                  ) : selectedConversation.clickup_task_id &&
                    clickupTaskStatus ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              clickupTaskStatus!.status_color || "#8b5cf6",
                          }}
                        />
                        <span className="font-medium">
                          {clickupTaskStatus!.name || "Task criada"}
                        </span>
                        <span className="text-xs text-gray-500">
                          Status: <strong>{clickupTaskStatus!.status}</strong>
                        </span>
                        {clickupTaskStatus!.priority != null && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[Number(clickupTaskStatus!.priority)] || "bg-gray-100 text-gray-700"}`}
                          >
                            {PRIORITY_LABELS[
                              Number(clickupTaskStatus!.priority)
                            ] || `P${clickupTaskStatus!.priority}`}
                          </span>
                        )}
                      </div>
                      {selectedConversation!.clickup_task_url && (
                        <a
                          href={
                            selectedConversation!.clickup_task_url || undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-purple-700 hover:text-purple-900 font-medium"
                        >
                          Abrir no ClickUp →
                        </a>
                      )}
                    </div>
                  ) : selectedConversation!.clickup_task_id ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-700">
                        Task criada (ID: {selectedConversation!.clickup_task_id}
                        )
                      </p>
                      {selectedConversation!.clickup_task_url && (
                        <a
                          href={
                            selectedConversation!.clickup_task_url || undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                        >
                          Abrir no ClickUp →
                        </a>
                      )}
                    </div>
                  ) : selectedConversation!.evaluation_count > 0 ? (
                    <button
                      onClick={() =>
                        handleGenerateTask(selectedConversation!.id)
                      }
                      disabled={generatingTask}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {generatingTask ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Gerando rascunho com IA...
                        </>
                      ) : (
                        "🎫 Criar Task no ClickUp"
                      )}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Avalie esta conversa primeiro para criar uma task.
                    </p>
                  )}
                </div>

                {/* Evaluation Detail Panel (inside modal) */}
                {selectedEvalDetail && (
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        Respostas de{" "}
                        {selectedEvalDetail.user_name ||
                          selectedEvalDetail.user_email}
                      </h3>
                      <button
                        onClick={() => setSelectedEvalDetail(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Fechar respostas
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      Email: {selectedEvalDetail.user_email} •{" "}
                      {formatDate(selectedEvalDetail.created_at)}
                    </div>
                    <div className="space-y-3">
                      {selectedEvalDetail.responses.map((resp, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                          <p className="font-medium mb-1">
                            {idx + 1}. {resp.question_text}
                          </p>
                          <div className="text-sm text-gray-700 pl-4">
                            {resp.question_type === "select" ? (
                              <p>
                                <strong>Resposta:</strong>{" "}
                                {resp.answer_label || resp.answer_value}
                              </p>
                            ) : resp.question_type === "input_string" ? (
                              <p>
                                <strong>Resposta:</strong> {resp.answer_text}
                              </p>
                            ) : resp.question_type === "boolean" ? (
                              <p>
                                <strong>Resposta:</strong>{" "}
                                {resp.answer_value === "true" ? "Sim" : "Não"}
                              </p>
                            ) : (
                              <p>
                                <strong>Resposta:</strong>{" "}
                                {resp.answer_text || resp.answer_value}
                              </p>
                            )}
                            {resp.rating != null && (
                              <p className="mt-1">
                                <strong>Nota:</strong> {resp.rating}/5
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      setSelectedEvalDetail(null);
                    }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Creation Form Modal */}
        {showTaskForm && taskDraft && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
            onClick={() => {
              setShowTaskForm(false);
              setTaskDraft(null);
            }}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-1">
                  🎫 Criar Task no ClickUp
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Revise e edite os dados gerados pela IA antes de criar a task.
                </p>

                <div className="space-y-4">
                  {/* Task Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Task
                    </label>
                    <input
                      type="text"
                      value={taskDraft.name}
                      onChange={(e) =>
                        setTaskDraft({ ...taskDraft, name: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={taskDraft.description}
                      onChange={(e) =>
                        setTaskDraft({
                          ...taskDraft,
                          description: e.target.value,
                        })
                      }
                      rows={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={taskDraft.priority}
                      onChange={(e) =>
                        setTaskDraft({
                          ...taskDraft,
                          priority: Number(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value={1}>1 — Urgente</option>
                      <option value={2}>2 — Alta</option>
                      <option value={3}>3 — Normal</option>
                      <option value={4}>4 — Baixa</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {taskDraft.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {tag}
                          <button
                            onClick={() =>
                              setTaskDraft({
                                ...taskDraft,
                                tags: taskDraft.tags.filter(
                                  (_: string, i: number) => i !== idx,
                                ),
                              })
                            }
                            className="text-gray-400 hover:text-red-500 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowTaskForm(false);
                      setTaskDraft(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={creatingTask || !taskDraft.name.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {creatingTask ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Criando...
                      </>
                    ) : (
                      "Criar Task"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AdminGuard>
  );
}
