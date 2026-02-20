"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import TimeTracker from "@/components/time-tracker";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  Playground,
  Question,
  NextCurationConversation,
  CurationConversation,
} from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Format seconds to mm:ss or hh:mm:ss
function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Format datetime to readable string
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Transcript message component
function TranscriptMessage({
  message,
}: {
  message: { role: string; message?: string; text?: string; content?: string };
}) {
  const isAgent = message.role === "agent" || message.role === "assistant";
  const text = message.message || message.text || message.content || "";

  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isAgent ? "bg-gray-100 text-gray-900" : "bg-blue-600 text-white"
        }`}
      >
        <p className="text-xs font-semibold mb-0.5 opacity-70">
          {isAgent ? "Agente" : "Usuário"}
        </p>
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

export default function CurationEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const playgroundId = params.id as string;

  const [playground, setPlayground] = useState<Playground | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<NextCurationConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const sessionIdRef = useRef(uuidv4());
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [noMoreConversations, setNoMoreConversations] = useState(false);

  // Admin: date_range mode management
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [conversations, setConversations] = useState<CurationConversation[]>(
    [],
  );
  const [syncing, setSyncing] = useState(false);
  const [syncDateStart, setSyncDateStart] = useState("");
  const [syncDateEnd, setSyncDateEnd] = useState("");

  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    fetchPlaygroundData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playgroundId]);

  const fetchPlaygroundData = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/playgrounds/${playgroundId}`);
      const data = response.data.data;

      if (data.type !== "curation") {
        alert("Este não é um playground de curadoria");
        router.push("/dashboard");
        return;
      }

      if (data.course_access_blocked) {
        router.push(`/courses/${data.linked_course_id}`);
        return;
      }

      const qs: Question[] = data.questions || [];
      setPlayground(data);
      setQuestions(qs);

      // Check if user is admin
      const userStr =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setIsAdmin(user.role === "admin");

          // If admin and date_range mode, load conversations
          if (user.role === "admin" && data.curation_mode === "date_range") {
            await fetchConversations();
          }
        } catch {}
      }

      await fetchNextConversation(qs);
    } catch (error: any) {
      console.error("Error loading playground:", error);
      alert(error.response?.data?.error || "Erro ao carregar playground");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await api.get(`/curation/conversations/${playgroundId}`);
      setConversations(response.data.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchNextConversation = async (qsOverride?: Question[]) => {
    try {
      setLoadingNext(true);
      setNoMoreConversations(false);

      const response = await api.get(
        `/curation/next-conversation/${playgroundId}`,
      );

      if (response.data && response.data.conversation_record_id) {
        setCurrentConversation(response.data);

        // Reset answers and initialize booleans as "false"
        const qs = qsOverride ?? questions;
        const initialAnswers: Record<string, any> = {};
        qs.forEach((q) => {
          if (q.question_type === "boolean") initialAnswers[q.id] = "false";
        });
        setAnswers(initialAnswers);
      } else {
        setNoMoreConversations(true);
        setCurrentConversation(null);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNoMoreConversations(true);
        setCurrentConversation(null);
      } else {
        console.error("Error fetching next conversation:", error);
        alert("Erro ao buscar próxima conversa");
      }
    } finally {
      setLoadingNext(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!currentConversation || !playground) return;

    const unansweredRequired = questions.filter(
      (q) => q.required && !answers[q.id],
    );
    if (unansweredRequired.length > 0) {
      alert("Por favor, responda todas as perguntas obrigatórias");
      return;
    }

    try {
      setSubmitting(true);

      // Generate a unique session_id per conversation evaluation
      const currentSessionId = sessionIdRef.current;

      // Submit evaluation answers
      const evaluationData = {
        session_id: currentSessionId,
        time_spent_seconds: timeSpentRef.current,
        answers: questions.map((q) => {
          const answer =
            answers[q.id] !== undefined ? String(answers[q.id]) : "";
          if (q.question_type === "select" || q.question_type === "boolean") {
            return { question_id: q.id, answer_value: answer };
          }
          return { question_id: q.id, answer_text: answer };
        }),
      };

      await api.post(
        `/playgrounds/${playgroundId}/evaluations`,
        evaluationData,
      );

      // Record the evaluation in curation_evaluations
      await api.post("/curation/record-evaluation", {
        conversation_record_id: currentConversation.conversation_record_id,
        session_id: currentSessionId,
      });

      // Generate a fresh session_id for the next conversation
      sessionIdRef.current = uuidv4();
      timeSpentRef.current = 0;
      await fetchNextConversation();
    } catch (error: any) {
      console.error("Error submitting evaluation:", error);
      alert(error.response?.data?.error || "Erro ao submeter avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    if (!playground) return;

    const agentId = playground.curation_agent_id;
    if (!agentId) {
      alert("Agent ID não configurado");
      return;
    }

    try {
      setSyncing(true);
      const response = await api.post(
        `/curation/sync-conversations/${playgroundId}`,
        {
          agent_id: agentId,
          date_start: syncDateStart
            ? new Date(syncDateStart).toISOString()
            : playground.curation_date_start,
          date_end: syncDateEnd
            ? new Date(syncDateEnd).toISOString()
            : playground.curation_date_end,
          passes_per_conversation:
            playground.curation_passes_per_conversation || 1,
        },
      );

      alert(
        `Sincronizado! ${response.data.synced_count} conversas processadas.`,
      );
      await fetchConversations();
    } catch (error: any) {
      console.error("Error syncing:", error);
      alert(error.response?.data?.error || "Erro ao sincronizar conversas");
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectAll = async (selected: boolean) => {
    try {
      await api.put(`/curation/conversations/${playgroundId}/select-all`, {
        selected,
      });
      setConversations((prev) => prev.map((c) => ({ ...c, selected })));
    } catch (error) {
      console.error("Error updating selection:", error);
    }
  };

  const handleToggleSelection = async (
    conversationId: string,
    selected: boolean,
  ) => {
    try {
      await api.put(`/curation/conversations/${playgroundId}/selection`, {
        conversation_ids: [conversationId],
        selected,
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId ? { ...c, selected } : c,
        ),
      );
    } catch (error) {
      console.error("Error updating selection:", error);
    }
  };

  // Render transcript
  const renderTranscript = (transcript: any) => {
    if (!transcript) {
      return (
        <div className="bg-gray-50 border rounded-lg p-6 text-center">
          <p className="text-gray-500">Transcrição não disponível</p>
        </div>
      );
    }

    // Handle different transcript formats from ElevenLabs
    let messages: any[] = [];
    if (Array.isArray(transcript)) {
      messages = transcript;
    } else if (transcript.messages && Array.isArray(transcript.messages)) {
      messages = transcript.messages;
    } else if (typeof transcript === "string") {
      return (
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-sm whitespace-pre-wrap">{transcript}</p>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="bg-gray-50 border rounded-lg p-6 text-center">
          <p className="text-gray-500">Transcrição vazia</p>
        </div>
      );
    }

    return (
      <div className="bg-white border rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-1">
        {messages.map((msg: any, index: number) => (
          <TranscriptMessage key={index} message={msg} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600">Carregando playground...</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-5xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Voltar para Dashboard
            </button>

            <h1 className="text-3xl font-bold">{playground?.name}</h1>
            {playground?.description && (
              <p className="text-gray-600 mt-2">{playground.description}</p>
            )}
          </div>

          {/* Support Text */}
          {playground?.support_text && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 whitespace-pre-wrap">
                {playground.support_text}
              </p>
            </div>
          )}

          {/* Admin Sync Panel (date_range mode) */}
          {isAdmin && playground?.curation_mode === "date_range" && (
            <div className="mb-6">
              <button
                onClick={() => setShowSyncPanel(!showSyncPanel)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mb-3"
              >
                {showSyncPanel
                  ? "Fechar Painel de Gerenciamento"
                  : "🔧 Gerenciar Conversas"}
              </button>

              {showSyncPanel && (
                <div className="bg-white border-2 border-purple-200 rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-semibold text-purple-900">
                    Painel de Gerenciamento de Conversas
                  </h3>

                  {/* Sync Controls */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-purple-900">
                      Sincronizar Conversas
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Data/Hora Inicial
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            syncDateStart ||
                            (playground.curation_date_start
                              ? new Date(playground.curation_date_start)
                                  .toISOString()
                                  .slice(0, 16)
                              : "")
                          }
                          onChange={(e) => setSyncDateStart(e.target.value)}
                          max={new Date().toISOString().slice(0, 16)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Data/Hora Final
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            syncDateEnd ||
                            (playground.curation_date_end
                              ? new Date(playground.curation_date_end)
                                  .toISOString()
                                  .slice(0, 16)
                              : "")
                          }
                          onChange={(e) => setSyncDateEnd(e.target.value)}
                          max={new Date().toISOString().slice(0, 16)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {syncing
                        ? "Sincronizando..."
                        : "🔄 Sincronizar Conversas"}
                    </button>
                  </div>

                  {/* Conversations Table */}
                  {conversations.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          Conversas ({conversations.length})
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelectAll(true)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            Selecionar todos
                          </button>
                          <button
                            onClick={() => handleSelectAll(false)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                          >
                            Desmarcar todos
                          </button>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="p-3 text-left w-10">
                                <input
                                  type="checkbox"
                                  checked={conversations.every(
                                    (c) => c.selected,
                                  )}
                                  onChange={(e) =>
                                    handleSelectAll(e.target.checked)
                                  }
                                  className="w-4 h-4"
                                />
                              </th>
                              <th className="p-3 text-left">Conversation ID</th>
                              <th className="p-3 text-left">Duração</th>
                              <th className="p-3 text-left">Data/Hora</th>
                              <th className="p-3 text-left">Status</th>
                              <th className="p-3 text-left">Passes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {conversations.map((conv) => (
                              <tr
                                key={conv.id}
                                className={`hover:bg-gray-50 ${
                                  !conv.selected ? "opacity-50 bg-gray-100" : ""
                                }`}
                              >
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    checked={conv.selected}
                                    onChange={(e) =>
                                      handleToggleSelection(
                                        conv.conversation_id,
                                        e.target.checked,
                                      )
                                    }
                                    className="w-4 h-4"
                                  />
                                </td>
                                <td className="p-3 font-mono text-xs">
                                  <span
                                    title={`Clique para copiar: ${conv.conversation_id}`}
                                    className="cursor-pointer hover:text-blue-600 hover:underline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        conv.conversation_id,
                                      );
                                      alert("ID copiado!");
                                    }}
                                  >
                                    {conv.conversation_id.substring(0, 16)}...
                                  </span>
                                </td>
                                <td className="p-3">
                                  {formatDuration(conv.duration_seconds)}
                                </td>
                                <td className="p-3">
                                  {formatDateTime(conv.call_datetime)}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      conv.call_status === "success"
                                        ? "bg-green-100 text-green-800"
                                        : conv.call_status === "failed" ||
                                            conv.call_status === "error"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {conv.call_status || "—"}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {conv.current_passes}/{conv.max_passes}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 text-sm text-gray-600">
                        {conversations.filter((c) => c.selected).length} de{" "}
                        {conversations.length} conversas selecionadas para
                        curadoria
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Time Tracker */}
          <TimeTracker
            isPaid={playground?.is_paid || false}
            onTimeUpdate={(seconds) => {
              timeSpentRef.current = seconds;
            }}
          />

          {/* Main Content */}
          {noMoreConversations ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-12 text-center">
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Parabéns!
              </h2>
              <p className="text-green-700">
                Você completou todas as conversas disponíveis neste playground.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Voltar para Dashboard
              </button>
            </div>
          ) : loadingNext ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">
                  Carregando próxima conversa...
                </p>
              </div>
            </div>
          ) : !currentConversation ? (
            <div className="bg-gray-50 border rounded-lg p-12 text-center">
              <p className="text-gray-600">
                Nenhuma conversa disponível no momento.
              </p>
              <button
                onClick={() => fetchNextConversation()}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Conversation Info */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Informações da Conversa
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Conversation ID
                    </p>
                    <p className="text-sm font-mono font-medium truncate">
                      {currentConversation.conversation_id}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Duração</p>
                    <p className="text-sm font-medium">
                      {formatDuration(currentConversation.duration_seconds)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Data/Hora</p>
                    <p className="text-sm font-medium">
                      {formatDateTime(currentConversation.call_datetime)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p
                      className={`text-sm font-medium ${
                        currentConversation.call_status === "success"
                          ? "text-green-600"
                          : currentConversation.call_status === "failed" ||
                              currentConversation.call_status === "error"
                            ? "text-red-600"
                            : "text-gray-600"
                      }`}
                    >
                      {currentConversation.call_status || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Encerramento</p>
                    <p className="text-sm font-medium text-gray-700">
                      {currentConversation.call_termination_reason || "—"}
                    </p>
                  </div>
                </div>

                {/* Audio Player */}
                {currentConversation.conversation_id && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">
                      🔊 Áudio da Conversa
                    </p>
                    <audio
                      controls
                      className="w-full"
                      src={`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "")}/curation/audio/${currentConversation.conversation_id}?token=${token}`}
                    >
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                  </div>
                )}

                {/* Transcript */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    📝 Transcrição da Conversa
                  </p>
                  {renderTranscript(currentConversation.transcript)}
                </div>
              </div>

              {/* Questions */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Perguntas de Avaliação
                </h2>

                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border-b pb-6 last:border-b-0"
                    >
                      <label className="block text-sm font-medium mb-2">
                        {index + 1}. {question.question_text}
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>

                      {question.question_type === "select" &&
                      question.options ? (
                        <select
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={question.required}
                        >
                          <option value="">Selecione uma opção</option>
                          {question.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : question.question_type === "boolean" ? (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={answers[question.id] === "true"}
                            onChange={(e) =>
                              handleAnswerChange(
                                question.id,
                                e.target.checked ? "true" : "false",
                              )
                            }
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {answers[question.id] === "true" ? "Sim" : "Não"}
                          </span>
                        </label>
                      ) : (
                        <textarea
                          value={answers[question.id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          required={question.required}
                          placeholder="Digite sua resposta..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enviando..." : "Enviar Avaliação"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
