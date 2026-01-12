"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import {
  ParentTask,
  ParentTaskWithEvaluations,
  DataLabelingMetrics,
  ParentTaskStatus,
  FileType,
} from "@/lib/types";

export default function DataLabelingConsolidationPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [parentTasks, setParentTasks] = useState<ParentTask[]>([]);
  const [metrics, setMetrics] = useState<DataLabelingMetrics | null>(null);
  const [selectedTask, setSelectedTask] = useState<ParentTask | null>(null);
  const [taskDetails, setTaskDetails] =
    useState<ParentTaskWithEvaluations | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Consolidation modal state
  const [showConsolidationModal, setShowConsolidationModal] = useState(false);
  const [consolidationAction, setConsolidationAction] = useState<
    "consolidate" | "return_to_pipe" | "ignore"
  >("consolidate");
  const [adminNotes, setAdminNotes] = useState("");
  const [extraRepetitions, setExtraRepetitions] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // New consolidation states
  const [ignoreReason, setIgnoreReason] = useState("");
  const [consolidationStep, setConsolidationStep] = useState<
    "choose_action" | "compose_dataset" | "ignore" | "return_to_pipe"
  >("choose_action");
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<
      string,
      {
        answer_value?: string;
        answer_text?: string;
        source_evaluation_id?: string;
        is_custom?: boolean;
      }
    >
  >({});

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ParentTaskStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Expanded answers state for open-ended questions
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [showIndividualEvaluations, setShowIndividualEvaluations] =
    useState(false);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Reconsolidation state
  const [isReconsolidating, setIsReconsolidating] = useState(false);

  const toggleExpandQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Get all unique questions from all evaluations
  const getAllUniqueQuestions = () => {
    if (!taskDetails?.evaluations) return [];

    const questionsMap = new Map();
    taskDetails.evaluations.forEach((evaluation) => {
      evaluation.answers?.forEach((answer) => {
        if (!questionsMap.has(answer.question_id)) {
          questionsMap.set(answer.question_id, {
            question_id: answer.question_id,
            question_text: answer.question_text,
            question_type: answer.question_type,
          });
        }
      });
    });

    return Array.from(questionsMap.values());
  };

  // Calculate statistics for each question across ALL evaluations
  const calculateQuestionStats = (questionId: string, questionType: string) => {
    if (!taskDetails?.evaluations) return null;

    console.log("Total evaluations:", taskDetails.evaluations.length);
    console.log("All evaluations:", taskDetails.evaluations);

    // Collect ALL answers for this question from ALL evaluations
    const answers = taskDetails.evaluations
      .flatMap(
        (e) => e.answers?.filter((a) => a.question_id === questionId) || []
      )
      .filter((a) => a?.answer);

    if (answers.length === 0) return null;

    if (questionType === "boolean") {
      console.log("Boolean answers for question:", questionId, answers);
      // Count answers from ALL evaluations, treating null/undefined as false
      const allEvaluationAnswers = taskDetails.evaluations.map((e) => {
        const answer = e.answers?.find((a) => a.question_id === questionId);
        return answer?.answer === "true" ? "true" : "false";
      });
      console.log(
        "All evaluation answers (null treated as false):",
        allEvaluationAnswers
      );

      const trueCount = allEvaluationAnswers.filter((a) => a === "true").length;
      const falseCount = allEvaluationAnswers.length - trueCount;
      return {
        true: {
          count: trueCount,
          percentage: (trueCount / allEvaluationAnswers.length) * 100,
        },
        false: {
          count: falseCount,
          percentage: (falseCount / allEvaluationAnswers.length) * 100,
        },
      };
    }

    if (questionType === "select") {
      const counts: Record<string, number> = {};
      answers.forEach((a) => {
        const value = a.answer || "Não respondido";
        counts[value] = (counts[value] || 0) + 1;
      });
      return Object.entries(counts).map(([value, count]) => ({
        value,
        count,
        percentage: (count / answers.length) * 100,
      }));
    }

    // For input_string, return all answers with evaluation info
    return taskDetails.evaluations
      .map((evaluation) => {
        const answer = evaluation.answers?.find(
          (a) => a.question_id === questionId
        );
        if (answer?.answer) {
          return {
            answer: answer.answer,
            user_name: evaluation.user_name,
            user_email: evaluation.user_email,
            evaluated_at: evaluation.evaluated_at,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  useEffect(() => {
    loadData();
  }, [playgroundId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load parent tasks
      const tasksResponse = await api.get(
        `/data-labeling/parent-tasks/${playgroundId}`
      );
      setParentTasks(tasksResponse.data || []);

      // Load metrics
      const metricsResponse = await api.get(
        `/data-labeling/metrics/${playgroundId}`
      );
      setMetrics(metricsResponse.data);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetails = async (task: ParentTask) => {
    try {
      setLoadingDetails(true);
      setSelectedTask(task);

      const response = await api.get(`/data-labeling/consolidation/${task.id}`);
      setTaskDetails(response.data);
    } catch (error) {
      console.error("Error loading task details:", error);
      alert("Erro ao carregar detalhes da task");
    } finally {
      setLoadingDetails(false);
    }
  };

  const openConsolidationModal = (reconsolidate = false) => {
    setIsReconsolidating(reconsolidate);
    setConsolidationStep("choose_action");
    setConsolidationAction("consolidate");
    setAdminNotes("");
    setIgnoreReason("");
    setExtraRepetitions(1);
    setSelectedAnswers({});
    setShowConsolidationModal(true);
  };

  const handleDeconsolidate = async () => {
    if (!selectedTask) return;

    if (
      !confirm(
        "Deseja realmente desconsolidar esta task? Ela voltará ao status ativo e poderá ser reconsolidada."
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/data-labeling/deconsolidate", {
        parent_task_id: selectedTask.id,
      });

      alert("Task desconsolidada com sucesso!");
      setSelectedTask(null);
      setTaskDetails(null);
      loadData();
    } catch (error: any) {
      console.error("Error deconsolidating task:", error);
      alert(error.response?.data?.error || "Erro ao desconsolidar task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConsolidate = async () => {
    if (!selectedTask || !taskDetails) return;

    try {
      setSubmitting(true);

      if (consolidationAction === "ignore") {
        if (!ignoreReason.trim()) {
          alert("Por favor, forneça uma justificativa para ignorar a task");
          return;
        }

        await api.post("/data-labeling/consolidate", {
          parent_task_id: selectedTask.id,
          action: "ignore",
          ignore_reason: ignoreReason,
        });

        alert("Task ignorada com sucesso!");
      } else if (consolidationAction === "consolidate") {
        // Validate all questions have answers
        const allQuestions = getAllUniqueQuestions();
        const missingAnswers = allQuestions.filter(
          (q) => !selectedAnswers[q.question_id]
        );

        if (missingAnswers.length > 0) {
          alert(
            `Por favor, selecione ou crie respostas para todas as perguntas (${missingAnswers.length} faltando)`
          );
          return;
        }

        // Build consolidated_answers array
        const consolidated_answers = allQuestions.map((q) => {
          const selected = selectedAnswers[q.question_id];
          return {
            question_id: q.question_id,
            answer_value: selected.answer_value,
            answer_text: selected.answer_text,
            source_evaluation_id: selected.source_evaluation_id,
          };
        });

        await api.post("/data-labeling/consolidate", {
          parent_task_id: selectedTask.id,
          action: "consolidate",
          consolidated_answers,
          admin_notes: adminNotes,
        });

        alert("Task consolidada com sucesso!");
      } else if (consolidationAction === "return_to_pipe") {
        if (extraRepetitions < 1) {
          alert("Número de repetições extras deve ser pelo menos 1");
          return;
        }

        await api.post("/data-labeling/consolidate", {
          parent_task_id: selectedTask.id,
          action: "return_to_pipe",
          admin_notes: adminNotes,
          extra_repetitions: extraRepetitions,
        });

        alert("Task retornada para pipe com sucesso!");
      }

      setShowConsolidationModal(false);
      setSelectedTask(null);
      setTaskDetails(null);
      loadData();
    } catch (error: any) {
      console.error("Error consolidating task:", error);
      alert(error.response?.data?.error || "Erro ao processar task");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = parentTasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = task.file_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getFileIcon = (fileType: FileType) => {
    switch (fileType) {
      case "image":
        return "🖼️";
      case "pdf":
        return "📄";
      case "text":
        return "📝";
      default:
        return "📁";
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExport = async (format: "json" | "csv" | "xlsx") => {
    try {
      setExporting(true);

      const response = await api.get(
        `/data-labeling/export-consolidated/${playgroundId}`,
        {
          params: { format },
          responseType: format === "json" ? "json" : "blob",
        }
      );

      if (format === "json") {
        // Download JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dataset-consolidado-${playgroundId}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download CSV or XLSX
        const blob = new Blob([response.data], {
          type:
            format === "csv"
              ? "text/csv"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dataset-consolidado-${playgroundId}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      setShowExportModal(false);
    } catch (error: any) {
      console.error("Error exporting dataset:", error);
      alert(error.response?.data?.error || "Erro ao exportar dataset");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Carregando dados de consolidação...
              </p>
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
              <h1 className="text-3xl font-bold">Consolidação de Tasks</h1>
              <p className="text-gray-600 mt-1">
                Revise e gerencie as tasks de rotulação
              </p>
            </div>
            {metrics?.consolidated_parent_tasks === 0 ? (
              <div className="text-right">
                <div className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg flex items-center gap-2 cursor-not-allowed">
                  <span>📊</span>
                  <span>Exportar Dataset</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  É necessário ter pelo menos 1 task consolidada
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <span>📊</span>
                <span>Exportar Dataset</span>
              </button>
            )}
          </div>

          {/* Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <div className="text-sm text-gray-600">Total de Tasks</div>
                <div className="text-2xl font-bold">
                  {metrics.total_parent_tasks}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600">Tasks Ativas</div>
                <div className="text-2xl font-bold text-blue-700">
                  {metrics.active_parent_tasks}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600">Consolidadas</div>
                <div className="text-2xl font-bold text-green-700">
                  {metrics.consolidated_parent_tasks}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-600">Retornadas</div>
                <div className="text-2xl font-bold text-yellow-700">
                  {metrics.returned_parent_tasks}
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {metrics && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Progresso de Avaliações
                </span>
                <span className="text-sm text-gray-600">
                  {metrics.completed_evaluations} /{" "}
                  {metrics.total_expected_evaluations}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${metrics.completion_percentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {metrics.completion_percentage.toFixed(1)}% completo
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Buscar por nome de arquivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as ParentTaskStatus | "all")
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks List */}
            <div className="bg-white border rounded-lg">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">
                  Tasks ({filteredTasks.length})
                </h2>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhuma task encontrada
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedTask?.id === task.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => loadTaskDetails(task)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="text-2xl flex-shrink-0">
                            {getFileIcon(task.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {task.file_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {task.current_repetitions} /{" "}
                              {task.max_repetitions + task.extra_repetitions}{" "}
                              avaliações
                            </div>
                            {task.extra_repetitions > 0 && (
                              <div className="text-xs text-yellow-600 mt-1">
                                +{task.extra_repetitions} extras
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(task.status)}
                        </div>
                      </div>

                      {task.admin_notes && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <strong>Nota:</strong> {task.admin_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Task Details */}
            <div className="bg-white border rounded-lg">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Detalhes da Task</h2>
              </div>
              <div className="p-4">
                {!selectedTask ? (
                  <div className="text-center text-gray-500 py-12">
                    Selecione uma task para ver os detalhes
                  </div>
                ) : loadingDetails ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando...</p>
                  </div>
                ) : taskDetails ? (
                  <div className="space-y-6">
                    {/* File Preview */}
                    <div className="border rounded-lg overflow-hidden">
                      {taskDetails.file_type === "image" ? (
                        <img
                          src={taskDetails.file_url}
                          alt={taskDetails.file_name}
                          className="w-full max-h-96 object-contain bg-gray-50"
                        />
                      ) : taskDetails.file_type === "pdf" ? (
                        <div className="p-8 bg-gray-50 text-center">
                          <div className="text-6xl mb-4">📄</div>
                          <a
                            href={taskDetails.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Abrir PDF
                          </a>
                        </div>
                      ) : (
                        <div className="p-8 bg-gray-50 text-center">
                          <div className="text-6xl mb-4">📝</div>
                          <a
                            href={taskDetails.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Abrir arquivo de texto
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Evaluations - Tabs for Consolidated vs Individual */}
                    <div>
                      <div className="flex gap-4 mb-4 border-b">
                        <button
                          onClick={() => setShowIndividualEvaluations(false)}
                          className={`px-4 py-2 font-medium transition-colors ${
                            !showIndividualEvaluations
                              ? "text-blue-600 border-b-2 border-blue-600"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          📊 Análise Consolidada
                        </button>
                        <button
                          onClick={() => setShowIndividualEvaluations(true)}
                          className={`px-4 py-2 font-medium transition-colors ${
                            showIndividualEvaluations
                              ? "text-blue-600 border-b-2 border-blue-600"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          👥 Avaliações Individuais (
                          {taskDetails.evaluations?.length || 0})
                        </button>
                      </div>

                      {taskDetails.evaluations &&
                      taskDetails.evaluations.length > 0 ? (
                        <>
                          {/* Consolidated View */}
                          {!showIndividualEvaluations && (
                            <div className="space-y-6">
                              {getAllUniqueQuestions().map((question, idx) => {
                                const stats = calculateQuestionStats(
                                  question.question_id,
                                  question.question_type
                                );
                                const isExpanded = expandedQuestions.has(
                                  question.question_id
                                );

                                return (
                                  <div
                                    key={question.question_id}
                                    className="border rounded-lg p-4"
                                  >
                                    <div className="font-medium mb-3">
                                      {idx + 1}. {question.question_text}
                                      <span className="ml-2 text-xs text-gray-500">
                                        (
                                        {question.question_type === "boolean"
                                          ? "Booleano"
                                          : question.question_type === "select"
                                          ? "Múltipla escolha"
                                          : "Texto aberto"}
                                        )
                                      </span>
                                    </div>

                                    {/* Boolean Questions - Bar Chart */}
                                    {question.question_type === "boolean" &&
                                      stats &&
                                      !Array.isArray(stats) &&
                                      "true" in stats && (
                                        <div className="space-y-3">
                                          <div>
                                            <div className="flex justify-between text-sm mb-1">
                                              <span className="text-green-600 font-medium">
                                                ✓ Sim
                                              </span>
                                              <span className="text-green-600">
                                                {stats.true.count} (
                                                {stats.true.percentage.toFixed(
                                                  1
                                                )}
                                                %)
                                              </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-6">
                                              <div
                                                className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                                                style={{
                                                  width: `${stats.true.percentage}%`,
                                                }}
                                              >
                                                {stats.true.percentage > 10 &&
                                                  `${stats.true.percentage.toFixed(
                                                    0
                                                  )}%`}
                                              </div>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="flex justify-between text-sm mb-1">
                                              <span className="text-red-600 font-medium">
                                                ✗ Não
                                              </span>
                                              <span className="text-red-600">
                                                {stats.false.count} (
                                                {stats.false.percentage.toFixed(
                                                  1
                                                )}
                                                %)
                                              </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-6">
                                              <div
                                                className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                                                style={{
                                                  width: `${stats.false.percentage}%`,
                                                }}
                                              >
                                                {stats.false.percentage > 10 &&
                                                  `${stats.false.percentage.toFixed(
                                                    0
                                                  )}%`}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                    {/* Select Questions - Bar Chart */}
                                    {question.question_type === "select" &&
                                      Array.isArray(stats) &&
                                      stats.length > 0 &&
                                      stats[0] != null &&
                                      "value" in stats[0] && (
                                        <div className="space-y-3">
                                          {stats.map((option: any, optIdx) => (
                                            <div key={optIdx}>
                                              <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium">
                                                  {option.value}
                                                </span>
                                                <span className="text-gray-600">
                                                  {option.count} (
                                                  {option.percentage.toFixed(1)}
                                                  %)
                                                </span>
                                              </div>
                                              <div className="w-full bg-gray-200 rounded-full h-6">
                                                <div
                                                  className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                                                  style={{
                                                    width: `${option.percentage}%`,
                                                  }}
                                                >
                                                  {option.percentage > 10 &&
                                                    `${option.percentage.toFixed(
                                                      0
                                                    )}%`}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    {/* Open-ended Questions - Expandable List */}
                                    {question.question_type ===
                                      "input_string" &&
                                      Array.isArray(stats) &&
                                      stats.length > 0 &&
                                      stats[0] &&
                                      "answer" in stats[0] && (
                                        <div>
                                          <button
                                            onClick={() =>
                                              toggleExpandQuestion(
                                                question.question_id
                                              )
                                            }
                                            className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-between"
                                          >
                                            <span className="font-medium">
                                              {stats.length} resposta
                                              {stats.length !== 1 && "s"}
                                            </span>
                                            <span className="text-xl">
                                              {isExpanded ? "−" : "+"}
                                            </span>
                                          </button>

                                          {isExpanded && (
                                            <div className="mt-3 space-y-2">
                                              {stats.map(
                                                (
                                                  item: any,
                                                  itemIdx: number
                                                ) => (
                                                  <div
                                                    key={itemIdx}
                                                    className="bg-gray-50 rounded p-3 border-l-4 border-blue-500"
                                                  >
                                                    <div className="text-sm text-gray-700 mb-2">
                                                      {item.answer}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      {item.user_name ||
                                                        item.user_email}{" "}
                                                      •{" "}
                                                      {formatDate(
                                                        item.evaluated_at
                                                      )}
                                                    </div>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Individual Evaluations View */}
                          {showIndividualEvaluations && (
                            <div className="space-y-4">
                              {taskDetails.evaluations.map(
                                (evaluation, idx) => (
                                  <div
                                    key={idx}
                                    className="border rounded-lg p-4"
                                  >
                                    <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                      <div>
                                        <div className="font-medium text-lg">
                                          {evaluation.user_name ||
                                            evaluation.user_email}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {formatDate(evaluation.evaluated_at)}
                                        </div>
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Avaliação #{idx + 1}
                                      </div>
                                    </div>

                                    {evaluation.answers &&
                                      evaluation.answers.length > 0 && (
                                        <div className="space-y-3">
                                          {evaluation.answers.map(
                                            (answer, answerIdx) => (
                                              <div
                                                key={answerIdx}
                                                className="bg-gray-50 rounded p-3"
                                              >
                                                <div className="text-sm font-medium mb-2">
                                                  {answer.question_text}
                                                </div>
                                                <div className="text-sm text-gray-700">
                                                  {answer.question_type ===
                                                  "boolean" ? (
                                                    <span
                                                      className={
                                                        answer.answer === "true"
                                                          ? "text-green-600 font-medium"
                                                          : "text-red-600 font-medium"
                                                      }
                                                    >
                                                      {answer.answer === "true"
                                                        ? "✓ Sim"
                                                        : "✗ Não"}
                                                    </span>
                                                  ) : (
                                                    answer.answer
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          Nenhuma avaliação ainda
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                      {selectedTask.status === "active" && (
                        <button
                          onClick={() => openConsolidationModal(false)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          📊 Consolidar Task
                        </button>
                      )}

                      {selectedTask.status === "consolidated" && (
                        <>
                          <button
                            onClick={handleDeconsolidate}
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                          >
                            ↶ Desconsolidar
                          </button>
                          <button
                            onClick={() => openConsolidationModal(true)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            🔄 Reconsolidar
                          </button>
                        </>
                      )}

                      {selectedTask.status === "returned_to_pipe" && (
                        <button
                          onClick={() => openConsolidationModal(false)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          📊 Consolidar Task
                        </button>
                      )}

                      {selectedTask.status === "ignored" && (
                        <button
                          onClick={() => openConsolidationModal(true)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          🔄 Reconsolidar Task
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Consolidation Modal */}
        {showConsolidationModal && taskDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
              {/* Step 1: Choose Action */}
              {consolidationStep === "choose_action" && (
                <>
                  <h2 className="text-2xl font-bold mb-6">
                    {isReconsolidating
                      ? "Reconsolidar Task"
                      : "Consolidar Task"}
                  </h2>
                  {isReconsolidating && (
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm text-blue-700">
                      ℹ️ Esta task já foi consolidada anteriormente. Você pode
                      escolher uma nova ação.
                    </div>
                  )}
                  <p className="text-gray-600 mb-6">
                    Escolha como deseja proceder com esta task:
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        setConsolidationAction("consolidate");
                        setConsolidationStep("compose_dataset");
                      }}
                      className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 text-left transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">✅</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Compor Dataset
                          </h3>
                          <p className="text-sm text-gray-600">
                            Selecionar respostas das avaliações existentes ou
                            criar novas respostas consolidadas para incluir no
                            dataset final.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setConsolidationAction("ignore");
                        setConsolidationStep("ignore");
                      }}
                      className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 text-left transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">🚫</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Ignorar Task
                          </h3>
                          <p className="text-sm text-gray-600">
                            Esta task não servirá para o dataset. Você precisa
                            fornecer uma justificativa.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setConsolidationAction("return_to_pipe");
                        setConsolidationStep("return_to_pipe");
                      }}
                      className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 text-left transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">↻</div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Retornar para Pipe
                          </h3>
                          <p className="text-sm text-gray-600">
                            Enviar esta task de volta para avaliação com
                            repetições extras.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setShowConsolidationModal(false)}
                      className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Compose Dataset */}
              {consolidationStep === "compose_dataset" && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                      Compor Resposta Consolidada
                    </h2>
                    <button
                      onClick={() => setConsolidationStep("choose_action")}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ← Voltar
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Para cada pergunta, selecione uma resposta existente ou crie
                    uma nova:
                  </p>

                  <div className="space-y-6 mb-6">
                    {getAllUniqueQuestions().map((question, idx) => {
                      const questionStats = calculateQuestionStats(
                        question.question_id,
                        question.question_type
                      );
                      const selected = selectedAnswers[question.question_id];

                      return (
                        <div
                          key={question.question_id}
                          className="border rounded-lg p-4"
                        >
                          <h3 className="font-bold mb-3">
                            {idx + 1}. {question.question_text} (
                            {question.question_type})
                          </h3>

                          {/* Show existing evaluation answers */}
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-gray-700">
                              Respostas das Avaliações:
                            </p>
                            {taskDetails.evaluations.map(
                              (evaluation, evalIdx) => {
                                const answer = evaluation.answers?.find(
                                  (a) => a.question_id === question.question_id
                                );
                                if (!answer) return null;

                                const displayAnswer =
                                  question.question_type === "boolean"
                                    ? answer.answer === "true"
                                      ? "✓ Sim"
                                      : "✗ Não"
                                    : answer.answer;

                                const isSelected =
                                  selected?.source_evaluation_id ===
                                    evaluation.session_id &&
                                  !selected?.is_custom;

                                return (
                                  <label
                                    key={evalIdx}
                                    className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-all ${
                                      isSelected
                                        ? "bg-green-50 border-green-500"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`answer-${question.question_id}`}
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedAnswers((prev) => ({
                                          ...prev,
                                          [question.question_id]: {
                                            answer_value:
                                              question.question_type ===
                                                "boolean" ||
                                              question.question_type ===
                                                "select"
                                                ? answer.answer
                                                : undefined,
                                            answer_text:
                                              question.question_type ===
                                              "input_string"
                                                ? answer.answer
                                                : undefined,
                                            source_evaluation_id:
                                              evaluation.session_id,
                                            is_custom: false,
                                          },
                                        }));
                                      }}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {displayAnswer}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Por{" "}
                                        {evaluation.user_name ||
                                          evaluation.user_email}{" "}
                                        em {formatDate(evaluation.evaluated_at)}
                                      </div>
                                    </div>
                                  </label>
                                );
                              }
                            )}
                          </div>

                          {/* Custom answer option */}
                          <div className="border-t pt-4">
                            <label
                              className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-all ${
                                selected?.is_custom
                                  ? "bg-blue-50 border-blue-500"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`answer-${question.question_id}`}
                                checked={selected?.is_custom || false}
                                onChange={() => {
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [question.question_id]: {
                                      answer_value:
                                        question.question_type === "boolean"
                                          ? "false"
                                          : question.question_type === "select"
                                          ? ""
                                          : undefined,
                                      answer_text:
                                        question.question_type ===
                                        "input_string"
                                          ? ""
                                          : undefined,
                                      is_custom: true,
                                    },
                                  }));
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-2">
                                  ✏️ Criar nova resposta
                                </p>

                                {selected?.is_custom && (
                                  <div className="mt-2">
                                    {question.question_type === "boolean" ? (
                                      <select
                                        value={selected.answer_value || "false"}
                                        onChange={(e) => {
                                          setSelectedAnswers((prev) => ({
                                            ...prev,
                                            [question.question_id]: {
                                              ...prev[question.question_id],
                                              answer_value: e.target.value,
                                            },
                                          }));
                                        }}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="true">Sim</option>
                                        <option value="false">Não</option>
                                      </select>
                                    ) : question.question_type ===
                                      "input_string" ? (
                                      <textarea
                                        value={selected.answer_text || ""}
                                        onChange={(e) => {
                                          setSelectedAnswers((prev) => ({
                                            ...prev,
                                            [question.question_id]: {
                                              ...prev[question.question_id],
                                              answer_text: e.target.value,
                                            },
                                          }));
                                        }}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Digite a resposta personalizada..."
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={selected.answer_value || ""}
                                        onChange={(e) => {
                                          setSelectedAnswers((prev) => ({
                                            ...prev,
                                            [question.question_id]: {
                                              ...prev[question.question_id],
                                              answer_value: e.target.value,
                                            },
                                          }));
                                        }}
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Digite a resposta personalizada..."
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional admin notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Notas do Admin (opcional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Observações sobre a consolidação..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConsolidationStep("choose_action")}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConsolidate}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {submitting ? "Consolidando..." : "✓ Consolidar e Salvar"}
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Ignore Task */}
              {consolidationStep === "ignore" && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Ignorar Task</h2>
                    <button
                      onClick={() => setConsolidationStep("choose_action")}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ← Voltar
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Esta task será marcada como ignorada e não fará parte do
                    dataset final.
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Justificativa *
                    </label>
                    <textarea
                      value={ignoreReason}
                      onChange={(e) => setIgnoreReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={4}
                      placeholder="Por que esta task está sendo ignorada? (qualidade ruim, dados incorretos, etc.)"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConsolidationStep("choose_action")}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConsolidate}
                      disabled={submitting || !ignoreReason.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {submitting ? "Processando..." : "🚫 Ignorar Task"}
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Return to Pipe */}
              {consolidationStep === "return_to_pipe" && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Retornar para Pipe</h2>
                    <button
                      onClick={() => setConsolidationStep("choose_action")}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ← Voltar
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Esta task voltará para o pipe e poderá ser avaliada
                    novamente.
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Anotações (opcional)
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        rows={3}
                        placeholder="Por que esta task está sendo retornada?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Repetições extras *
                      </label>
                      <input
                        type="number"
                        value={extraRepetitions}
                        onChange={(e) =>
                          setExtraRepetitions(parseInt(e.target.value) || 1)
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        min="1"
                        max="50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Quantas vezes a mais esta task deve ser avaliada
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConsolidationStep("choose_action")}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleConsolidate}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {submitting ? "Processando..." : "↻ Retornar para Pipe"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">
                Exportar Dataset Consolidado
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  ℹ️ O que será exportado:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Apenas tasks com status "Consolidada"</li>
                  <li>Tasks ignoradas NÃO serão incluídas</li>
                  <li>Tasks retornadas ao pipe NÃO serão incluídas</li>
                  <li>
                    Total:{" "}
                    <strong>
                      {metrics?.consolidated_parent_tasks || 0} tasks
                    </strong>{" "}
                    no dataset
                  </li>
                </ul>
              </div>
              <p className="text-gray-600 mb-6">
                Selecione o formato de exportação:
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleExport("json")}
                  disabled={exporting}
                  className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div className="text-left">
                      <div className="font-semibold">JSON</div>
                      <div className="text-xs text-gray-500">
                        Formato estruturado com todas as propriedades
                      </div>
                    </div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  onClick={() => handleExport("csv")}
                  disabled={exporting}
                  className="w-full px-4 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div className="text-left">
                      <div className="font-semibold">CSV</div>
                      <div className="text-xs text-gray-500">
                        Tabela compatível com Excel
                      </div>
                    </div>
                  </div>
                  <span>→</span>
                </button>

                <button
                  onClick={() => handleExport("xlsx")}
                  disabled={exporting}
                  className="w-full px-4 py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📈</span>
                    <div className="text-left">
                      <div className="font-semibold">XLSX</div>
                      <div className="text-xs text-gray-500">
                        Excel nativo com formatação
                      </div>
                    </div>
                  </div>
                  <span>→</span>
                </button>
              </div>

              {exporting && (
                <div className="mb-4 p-3 bg-blue-50 rounded text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-blue-600">Gerando arquivo...</p>
                </div>
              )}

              <button
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Layout>
    </AdminGuard>
  );
}
