"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";

// Force dynamic rendering
export const dynamic = "force-dynamic";

type PlaygroundType = "ab_testing" | "tuning" | "data_labeling" | "curation";
type QuestionType = "select" | "input_string" | "boolean";
type CurationMode = "continuous" | "date_range";

interface ModelInput {
  key: string;
  embedCode: string;
}

interface QuestionInput {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

interface PreviewConversation {
  conversation_id: string;
  agent_id: string;
  call_duration_secs: number;
  start_time_unix_secs: number;
  status: string | null;
  call_successful: string | null;
  message_count: number;
  call_summary_title: string | null;
  selected: boolean; // local selection state
}

// Helper function for generating IDs (works in SSR and client)
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for SSR
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function CreatePlaygroundForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDuplicate = searchParams.get("duplicate") === "true";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Playground basic info
  const [name, setName] = useState("");
  const [type, setType] = useState<PlaygroundType>("ab_testing");
  const [description, setDescription] = useState("");
  const [supportText, setSupportText] = useState("");
  const [evaluationGoal, setEvaluationGoal] = useState<number>(100);

  // Course linking
  const [linkedCourseId, setLinkedCourseId] = useState<string>("");
  const [courseRequired, setCourseRequired] = useState<boolean>(false);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);

  // Access control
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Authorized clients (independent of private/public)
  const [authorizedClientIds, setAuthorizedClientIds] = useState<string[]>([]);

  // Payment settings
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<
    "per_hour" | "per_task" | "per_goal"
  >("per_task");
  const [paymentValue, setPaymentValue] = useState<number>(0);
  const [maxTimePerTask, setMaxTimePerTask] = useState<number>(0);
  const [tasksForGoal, setTasksForGoal] = useState<number>(0);

  // Tools settings
  const [enableBrazilianPersonGenerator, setEnableBrazilianPersonGenerator] =
    useState<boolean>(false);
  const [enableRandomSelector, setEnableRandomSelector] =
    useState<boolean>(false);
  const [randomSelectorTitle, setRandomSelectorTitle] = useState<string>("");
  const [randomSelectorItems, setRandomSelectorItems] = useState<string[]>([
    "",
  ]);

  // Data Labeling specific states
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [repetitionsPerTask, setRepetitionsPerTask] = useState<number>(1);
  const [autoCalculateEvaluations, setAutoCalculateEvaluations] =
    useState<boolean>(true);
  const [isUploadingZip, setIsUploadingZip] = useState<boolean>(false);
  const [uploadedTasksCount, setUploadedTasksCount] = useState<number>(0);

  // Curation specific states
  const [curationMode, setCurationMode] = useState<CurationMode>("continuous");
  const [curationAgentId, setCurationAgentId] = useState<string>("");
  const [curationDateStart, setCurationDateStart] = useState<string>("");
  const [curationDateEnd, setCurationDateEnd] = useState<string>("");
  const [curationPassesPerConversation, setCurationPassesPerConversation] =
    useState<number>(1);
  const [isSyncingConversations, setIsSyncingConversations] =
    useState<boolean>(false);
  const [previewConversations, setPreviewConversations] = useState<
    PreviewConversation[]
  >([]);
  const [hasSynced, setHasSynced] = useState<boolean>(false);

  // Models
  const [models, setModels] = useState<ModelInput[]>([
    { key: "", embedCode: "" },
  ]);

  // Questions
  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      id: generateId(),
      text: "",
      type: "select",
      required: true,
      options: [""],
    },
  ]);

  // Load duplicate data on mount if duplicating
  useEffect(() => {
    // Load available courses
    const fetchCourses = async () => {
      try {
        const response = await api.get("/admin/courses");
        const courses = response.data.data || [];
        setAvailableCourses(courses.filter((c: any) => c.is_published));
      } catch (err) {
        console.error("Error loading courses:", err);
      }
    };
    fetchCourses();

    // Load available users
    const fetchUsers = async () => {
      try {
        const response = await api.get("/admin/users");
        setAvailableUsers(response.data.data || []);
      } catch (err) {
        console.error("Error loading users:", err);
      }
    };
    fetchUsers();

    if (isDuplicate) {
      const storedData = localStorage.getItem("duplicatePlayground");
      if (storedData) {
        try {
          const playgroundData = JSON.parse(storedData);

          // Pre-fill basic info
          setName(`${playgroundData.name} (Cópia)`);
          setType(playgroundData.type);
          setDescription(playgroundData.description || "");
          setSupportText(playgroundData.support_text || "");
          setEvaluationGoal(playgroundData.evaluation_goal || 100);

          // Pre-fill models
          if (playgroundData.models && playgroundData.models.length > 0) {
            setModels(
              playgroundData.models.map((m: any) => ({
                key: m.model_key,
                embedCode: m.embed_code,
              })),
            );
          }

          // Pre-fill questions
          if (playgroundData.questions && playgroundData.questions.length > 0) {
            setQuestions(
              playgroundData.questions.map((q: any) => ({
                id: generateId(), // New IDs for duplicated questions
                text: q.question_text,
                type: q.question_type,
                required: q.required,
                options:
                  q.question_type === "select" && q.options
                    ? q.options.map((opt: any) => opt.label)
                    : [""],
              })),
            );
          }

          // Clear localStorage after loading
          localStorage.removeItem("duplicatePlayground");
        } catch (err) {
          console.error("Error loading duplicate data:", err);
        }
      }
    }
  }, [isDuplicate]);

  const addModel = () => {
    setModels([...models, { key: "", embedCode: "" }]);
  };

  const updateModel = (
    index: number,
    field: keyof ModelInput,
    value: string,
  ) => {
    const updated = [...models];
    updated[index][field] = value;
    setModels(updated);
  };

  const removeModel = (index: number) => {
    if (models.length > 1) {
      setModels(models.filter((_, i) => i !== index));
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        text: "",
        type: "select",
        required: true,
        options: [""],
      },
    ]);
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionInput,
    value: any,
  ) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push("");
    setQuestions(updated);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const updated = [...questions];
    updated[questionIndex].options![optionIndex] = value;
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options!.length > 1) {
      updated[questionIndex].options!.splice(optionIndex, 1);
      setQuestions(updated);
    }
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setQuestions(updated);
  };

  // ===== Curation: preview sync =====
  const handlePreviewSync = async () => {
    if (!curationAgentId.trim()) {
      setError("Agent ID é obrigatório para sincronizar");
      return;
    }
    if (!curationDateStart || !curationDateEnd) {
      setError("Datas são obrigatórias para sincronizar");
      return;
    }

    setError("");
    setIsSyncingConversations(true);

    try {
      const response = await api.post("/curation/preview-conversations", {
        agent_id: curationAgentId.trim(),
        date_start: new Date(curationDateStart).toISOString(),
        date_end: new Date(curationDateEnd).toISOString(),
      });

      const convs: PreviewConversation[] = (
        response.data.conversations || []
      ).map((c: any) => ({
        ...c,
        selected: true, // all selected by default
      }));

      setPreviewConversations(convs);
      setHasSynced(true);

      if (convs.length === 0) {
        setError("Nenhuma conversa encontrada no período selecionado");
      }
    } catch (err: any) {
      console.error("Error previewing conversations:", err);
      setError(
        err.response?.data?.error || "Erro ao buscar conversas do ElevenLabs",
      );
    } finally {
      setIsSyncingConversations(false);
    }
  };

  const toggleConversationSelection = (conversationId: string) => {
    setPreviewConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === conversationId
          ? { ...c, selected: !c.selected }
          : c,
      ),
    );
  };

  const toggleAllConversations = (selected: boolean) => {
    setPreviewConversations((prev) => prev.map((c) => ({ ...c, selected })));
  };

  const selectedConversationsCount = previewConversations.filter(
    (c) => c.selected,
  ).length;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDateTime = (unix: number) => {
    if (!unix) return "—";
    return new Date(unix * 1000).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate before setting submitting state
    if (!name.trim()) {
      setError("Nome do playground é obrigatório");
      return;
    }

    if (!evaluationGoal || evaluationGoal < 1) {
      setError("Meta de avaliações deve ser um número positivo");
      return;
    }

    if (type === "ab_testing" && models.length < 2) {
      setError("Testes A/B requerem pelo menos 2 modelos");
      return;
    }

    if (
      type !== "data_labeling" &&
      type !== "curation" &&
      models.some((m) => !m.key.trim() || !m.embedCode.trim())
    ) {
      setError("Todos os modelos precisam de chave e código embed");
      return;
    }

    // Data labeling specific validation
    if (type === "data_labeling") {
      if (zipFiles.length === 0 && uploadedTasksCount === 0) {
        setError(
          "É necessário fazer upload de pelo menos um arquivo ZIP com as tasks",
        );
        return;
      }
      if (repetitionsPerTask < 1) {
        setError("Número de repetições por task deve ser pelo menos 1");
        return;
      }
    }

    // Curation specific validation
    if (type === "curation") {
      if (!curationAgentId.trim()) {
        setError("Agent ID é obrigatório para curadoria");
        return;
      }
      if (curationMode === "date_range") {
        if (!curationDateStart || !curationDateEnd) {
          setError(
            "Data inicial e final são obrigatórias para curadoria com range de datas",
          );
          return;
        }
        const start = new Date(curationDateStart);
        const end = new Date(curationDateEnd);
        const now = new Date();
        if (start > now || end > now) {
          setError("As datas devem ser no passado");
          return;
        }
        if (start >= end) {
          setError("Data inicial deve ser anterior à data final");
          return;
        }
        if (curationPassesPerConversation < 1) {
          setError("Vezes por conversa deve ser pelo menos 1");
          return;
        }
        if (!hasSynced) {
          setError("Sincronize as conversas antes de criar o playground");
          return;
        }
        if (selectedConversationsCount === 0) {
          setError(
            "Selecione pelo menos uma conversa para o pipeline de curadoria",
          );
          return;
        }
      }
    }

    if (questions.some((q) => !q.text.trim())) {
      setError("Todas as perguntas precisam de texto");
      return;
    }

    if (
      questions.some(
        (q) =>
          q.type === "select" &&
          (!q.options ||
            q.options.length === 0 ||
            q.options.some((o) => !o.trim())),
      )
    ) {
      setError("Perguntas de seleção precisam de pelo menos uma opção válida");
      return;
    }

    // Validate payment settings
    if (isPaid) {
      if (!paymentValue || paymentValue <= 0) {
        setError("Valor de pagamento deve ser maior que zero");
        return;
      }
      if (
        paymentType === "per_hour" &&
        (!maxTimePerTask || maxTimePerTask <= 0)
      ) {
        setError("Tempo máximo por task é obrigatório para pagamento por hora");
        return;
      }
      if (paymentType === "per_goal" && (!tasksForGoal || tasksForGoal <= 0)) {
        setError(
          "Número de tasks para meta é obrigatório para pagamento por meta",
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build tools array
      const tools: any[] = [];

      if (enableBrazilianPersonGenerator) {
        tools.push({ type: "generate_brazilian_person", enabled: true });
      }

      if (
        enableRandomSelector &&
        randomSelectorTitle &&
        randomSelectorItems.filter((i) => i.trim()).length > 0
      ) {
        tools.push({
          type: "random_selector",
          enabled: true,
          config: {
            title: randomSelectorTitle,
            items: randomSelectorItems.filter((i) => i.trim()),
          },
        });
      }

      console.log("=== CREATING PLAYGROUND ===");
      console.log("Tools array being sent:", tools);
      console.log(
        "enableBrazilianPersonGenerator:",
        enableBrazilianPersonGenerator,
      );
      console.log("enableRandomSelector:", enableRandomSelector);
      console.log("randomSelectorTitle:", randomSelectorTitle);
      console.log("randomSelectorItems:", randomSelectorItems);

      // Create playground with models and questions in single request
      const playgroundResponse = await api.post("/admin/playgrounds", {
        name,
        type,
        description: description || undefined,
        support_text: supportText || undefined,
        evaluation_goal:
          autoCalculateEvaluations && type === "data_labeling"
            ? 0
            : evaluationGoal,
        linked_course_id: linkedCourseId || null,
        course_required: courseRequired,
        restricted_emails: isPrivate ? selectedEmails : null,
        is_paid: isPaid,
        payment_type: isPaid ? paymentType : null,
        payment_value: isPaid ? paymentValue : null,
        max_time_per_task:
          isPaid && paymentType === "per_hour" ? maxTimePerTask : null,
        tasks_for_goal:
          isPaid && paymentType === "per_goal" ? tasksForGoal : null,
        // Data labeling specific fields
        repetitions_per_task:
          type === "data_labeling" ? repetitionsPerTask : null,
        auto_calculate_evaluations:
          type === "data_labeling" ? autoCalculateEvaluations : false,
        // Curation specific fields
        curation_mode: type === "curation" ? curationMode : null,
        curation_agent_id: type === "curation" ? curationAgentId : null,
        curation_date_start:
          type === "curation" && curationMode === "date_range"
            ? new Date(curationDateStart).toISOString()
            : null,
        curation_date_end:
          type === "curation" && curationMode === "date_range"
            ? new Date(curationDateEnd).toISOString()
            : null,
        curation_passes_per_conversation:
          type === "curation" && curationMode === "date_range"
            ? curationPassesPerConversation
            : null,
        // Pre-selected conversations (date_range curation only)
        curation_conversations:
          type === "curation" && curationMode === "date_range"
            ? previewConversations
                .filter((c) => c.selected)
                .map((c) => ({
                  conversation_id: c.conversation_id,
                  call_duration_secs: c.call_duration_secs,
                  start_time_unix_secs: c.start_time_unix_secs,
                  status: c.status,
                  call_successful: c.call_successful,
                }))
            : undefined,
        tools,
        models:
          type !== "data_labeling" && type !== "curation"
            ? models.map((m) => ({
                model_key: m.key,
                model_name: m.key, // Using key as name for now
                embed_code: m.embedCode,
                max_evaluations: 1000, // Default value
              }))
            : [],
        questions: questions.map((q, index) => ({
          question_text: q.text,
          question_type: q.type,
          required: q.required,
          options:
            q.type === "select"
              ? q
                  .options!.filter((o) => o.trim())
                  .map((opt) => ({
                    label: opt,
                    value: opt.toLowerCase().replace(/\s+/g, "_"),
                  }))
              : undefined,
          order_index: index,
        })),
      });

      const playgroundId = playgroundResponse.data.data.id;
      const responseSyncResult = playgroundResponse.data.sync;

      if (responseSyncResult) {
        console.log(
          `Conversations inserted: ${responseSyncResult.synced_count}`,
        );
      }

      // Upload ZIP file if data_labeling type and file is selected
      if (type === "data_labeling" && zipFiles.length > 0) {
        setIsUploadingZip(true);
        try {
          const formData = new FormData();
          // Add all ZIP files
          zipFiles.forEach((file) => {
            formData.append("zipFiles", file);
          });

          const uploadResponse = await api.post(
            `/data-labeling/upload-zip/${playgroundId}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            },
          );

          setUploadedTasksCount(uploadResponse.data.parent_tasks_count || 0);
        } catch (uploadError: any) {
          console.error("Error uploading ZIP:", uploadError);
          setError(
            `Playground criado, mas erro ao fazer upload do ZIP: ${
              uploadError.response?.data?.error || uploadError.message
            }`,
          );
          setIsUploadingZip(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploadingZip(false);
      }

      // Authorize selected clients (independent of private/public status)
      if (authorizedClientIds.length > 0) {
        try {
          await Promise.all(
            authorizedClientIds.map((userId) =>
              api.post(`/admin/playgrounds/${playgroundId}/authorized-users`, {
                user_id: userId,
                notes: "Autorizado durante criação do playground",
              }),
            ),
          );
        } catch (authError) {
          console.error("Error authorizing clients:", authError);
          // Continue even if authorization fails
        }
      }

      router.push(`/admin/playground/${playgroundId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar playground");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-8">Criar Playground</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Informações Básicas
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome do Playground *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PlaygroundType)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ab_testing">Teste A/B</option>
                    <option value="tuning">Ajuste (Tuning)</option>
                    <option value="data_labeling">Rotulação de Dados</option>
                    <option value="curation">Curadoria</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {type === "ab_testing"
                      ? "Usuários avaliam 2 modelos e escolhem o melhor"
                      : type === "tuning"
                        ? "Usuários avaliam 1 modelo múltiplas vezes"
                        : type === "curation"
                          ? "Curadoria de conversas de agentes ElevenLabs com transcrição e áudio"
                          : "Usuários rotulam arquivos (imagens, PDFs, textos) com perguntas personalizadas"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Texto de Suporte
                  </label>
                  <textarea
                    value={supportText}
                    onChange={(e) => setSupportText(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Instruções ou informações adicionais para os avaliadores"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Meta de Avaliações *
                  </label>
                  <input
                    type="number"
                    value={evaluationGoal}
                    onChange={(e) =>
                      setEvaluationGoal(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número objetivo de avaliações a serem realizadas neste
                    playground
                  </p>
                </div>
              </div>
            </section>

            {/* Course Linking Section */}
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Curso Introdutório (Opcional)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Vincule um curso introdutório que os usuários devem completar
                antes ou durante o uso deste playground.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Curso Vinculado
                  </label>
                  <select
                    value={linkedCourseId}
                    onChange={(e) => setLinkedCourseId(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhum curso vinculado</option>
                    {availableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {linkedCourseId && (
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="courseRequired"
                      checked={courseRequired}
                      onChange={(e) => setCourseRequired(e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <label
                        htmlFor="courseRequired"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Curso obrigatório
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        {courseRequired
                          ? "Usuários DEVEM completar o curso antes de acessar este playground"
                          : "Curso será sugerido mas não é obrigatório"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Configuration Section */}
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Configuração de Remuneração
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Configure se este playground remunera os QAs por suas
                avaliações.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <label
                      htmlFor="isPaid"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Este playground é remunerado
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      QAs receberão pagamento por completar avaliações neste
                      playground
                    </p>
                  </div>
                </div>

                {isPaid && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tipo de Pagamento *
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) =>
                          setPaymentType(
                            e.target.value as
                              | "per_hour"
                              | "per_task"
                              | "per_goal",
                          )
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="per_hour">Por Hora (R$/hora)</option>
                        <option value="per_task">Por Task (R$/task)</option>
                        <option value="per_goal">
                          Por Meta (R$ ao atingir X tasks)
                        </option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {paymentType === "per_hour" &&
                          "QA recebe baseado no tempo ativo gasto na task"}
                        {paymentType === "per_task" &&
                          "QA recebe valor fixo por cada task completada"}
                        {paymentType === "per_goal" &&
                          "QA recebe ao completar um número específico de tasks"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        value={paymentValue}
                        onChange={(e) =>
                          setPaymentValue(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {paymentType === "per_hour" &&
                          "Valor por hora de trabalho"}
                        {paymentType === "per_task" &&
                          "Valor por cada task completada"}
                        {paymentType === "per_goal" &&
                          "Valor total ao atingir a meta"}
                      </p>
                    </div>

                    {paymentType === "per_hour" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Tempo Máximo por Task (minutos) *
                        </label>
                        <input
                          type="number"
                          value={maxTimePerTask}
                          onChange={(e) =>
                            setMaxTimePerTask(parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Limite máximo de tempo pago por task (evita pagamento
                          excessivo)
                        </p>
                      </div>
                    )}

                    {paymentType === "per_goal" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Número de Tasks para Meta *
                        </label>
                        <input
                          type="number"
                          value={tasksForGoal}
                          onChange={(e) =>
                            setTasksForGoal(parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          QA receberá o pagamento ao completar este número de
                          tasks
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        💡 Informações sobre Rastreamento de Tempo
                      </h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>
                          • O tempo é contado apenas quando a aba do playground
                          está ativa
                        </li>
                        <li>
                          • Se o QA mudar de aba ou minimizar o navegador, o
                          timer pausa automaticamente
                        </li>
                        <li>
                          • Isso garante que apenas o tempo efetivamente
                          trabalhado seja contabilizado
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Tools Configuration Section */}
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Ferramentas</h2>
              <p className="text-sm text-gray-600 mb-4">
                Habilite ferramentas auxiliares que aparecerão no playground
                para ajudar nos testes.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="enableBrazilianPersonGenerator"
                    checked={enableBrazilianPersonGenerator}
                    onChange={(e) =>
                      setEnableBrazilianPersonGenerator(e.target.checked)
                    }
                    className="mt-1"
                  />
                  <div>
                    <label
                      htmlFor="enableBrazilianPersonGenerator"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Gerador de Pessoa Brasileira
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Gera automaticamente dados fictícios de uma pessoa
                      brasileira (nome, CPF válido, data de nascimento, sexo,
                      telefone com DDD) para serem usados nos testes
                    </p>
                  </div>
                </div>

                {enableBrazilianPersonGenerator && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      ✅ Dados Gerados Incluem:
                    </h4>
                    <ul className="text-xs text-green-800 space-y-1">
                      <li>• Nome completo compatível com o sexo</li>
                      <li>
                        • CPF válido (algoritmo oficial da Receita Federal)
                      </li>
                      <li>• Data de nascimento (pessoa entre 18-70 anos)</li>
                      <li>• Sexo biológico (Masculino/Feminino)</li>
                      <li>• Telefone celular com DDD brasileiro</li>
                    </ul>
                    <p className="text-xs text-green-700 mt-2 font-medium">
                      Os dados aparecerão automaticamente abaixo da descrição do
                      playground com aviso de que são fictícios.
                    </p>
                  </div>
                )}

                {/* Random Selector Tool */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="enableRandomSelector"
                      checked={enableRandomSelector}
                      onChange={(e) =>
                        setEnableRandomSelector(e.target.checked)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="enableRandomSelector"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Seletor Aleatório
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Exibe um item aleatório de uma lista personalizada. Útil
                        para sortear cenários, perfis, situações, etc.
                      </p>
                    </div>
                  </div>

                  {enableRandomSelector && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Título da Seção *
                        </label>
                        <input
                          type="text"
                          value={randomSelectorTitle}
                          onChange={(e) =>
                            setRandomSelectorTitle(e.target.value)
                          }
                          placeholder="Ex: Perfil do Cliente, Cenário de Teste, Produto"
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required={enableRandomSelector}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Este título aparecerá no playground (não "Seletor
                          Aleatório")
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Lista de Itens *
                        </label>
                        <div className="space-y-2">
                          {randomSelectorItems.map((item, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                  const newItems = [...randomSelectorItems];
                                  newItems[index] = e.target.value;
                                  setRandomSelectorItems(newItems);
                                }}
                                placeholder={`Item ${index + 1}`}
                                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              {randomSelectorItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRandomSelectorItems(
                                      randomSelectorItems.filter(
                                        (_, i) => i !== index,
                                      ),
                                    );
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRandomSelectorItems([...randomSelectorItems, ""])
                          }
                          className="mt-2 px-4 py-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                        >
                          + Adicionar Item
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          Um item será escolhido aleatoriamente e exibido no
                          playground
                        </p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-purple-900 mb-2">
                          🎲 Como Funciona:
                        </h4>
                        <ul className="text-xs text-purple-800 space-y-1">
                          <li>
                            • Um item da lista será sorteado aleatoriamente
                          </li>
                          <li>
                            • O item escolhido será exibido abaixo da descrição
                          </li>
                          <li>
                            • O título personalizado aparecerá acima do item
                          </li>
                          <li>
                            • Cada usuário verá um item diferente (aleatório)
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Access Control Section */}
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Controle de Acesso</h2>
              <p className="text-sm text-gray-600 mb-4">
                Por padrão, playgrounds são públicos. Torne privado para
                restringir acesso.
              </p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => {
                      setIsPrivate(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedEmails([]);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <label
                      htmlFor="isPrivate"
                      className="text-sm font-medium cursor-pointer"
                    >
                      🔒 Playground Privado
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Apenas usuários selecionados poderão acessar
                    </p>
                  </div>
                </div>

                {isPrivate && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Usuários com Acesso
                    </label>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                      {availableUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Carregando usuários...
                        </p>
                      ) : (
                        availableUsers.map((user) => (
                          <label
                            key={user.email}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmails.includes(user.email)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmails([
                                    ...selectedEmails,
                                    user.email,
                                  ]);
                                } else {
                                  setSelectedEmails(
                                    selectedEmails.filter(
                                      (email) => email !== user.email,
                                    ),
                                  );
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">
                                {user.email}
                              </span>
                              {user.role === "admin" && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedEmails.length > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        {selectedEmails.length} usuário(s) selecionado(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Authorized Clients Section */}
            <section className="bg-white border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                👥 Clients Autorizados (Opcional)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Selecione clients específicos que podem acessar este playground.{" "}
                <strong>
                  Funciona mesmo com playground público - Clients somente tem
                  acesso a playgrounds expressamente vinculados a eles, mesmo
                  que sejam públicos.
                </strong>
              </p>

              <div className="space-y-4">
                {availableUsers.filter((u) => u.role === "client").length ===
                0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="font-medium mb-2">
                      Nenhum client cadastrado ainda.
                    </p>
                    <p className="text-xs">
                      Para autorizar clients específicos, primeiro convide-os
                      através do{" "}
                      <a
                        href="/admin/users"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                      >
                        menu de gerenciamento de usuários
                      </a>
                      .
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      {availableUsers
                        .filter((u) => u.role === "client")
                        .map((client) => (
                          <label
                            key={client.id}
                            className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={authorizedClientIds.includes(client.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAuthorizedClientIds([
                                    ...authorizedClientIds,
                                    client.id,
                                  ]);
                                } else {
                                  setAuthorizedClientIds(
                                    authorizedClientIds.filter(
                                      (id) => id !== client.id,
                                    ),
                                  );
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {client.full_name || client.email}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                  client
                                </span>
                              </div>
                              {client.full_name && (
                                <span className="text-xs text-gray-500">
                                  {client.email}
                                </span>
                              )}
                            </div>
                          </label>
                        ))}
                    </div>
                    {authorizedClientIds.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          ✓ {authorizedClientIds.length} client(s)
                          selecionado(s) terão acesso a este playground
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Data Labeling Configuration */}
            {type === "data_labeling" && (
              <section className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  📂 Configuração de Rotulação de Dados
                </h2>

                <div className="space-y-6">
                  {/* ZIP Upload */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Upload de Arquivos (ZIP)
                    </h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Faça upload de arquivos ZIP contendo imagens (.jpg, .png,
                      .gif), PDFs (.pdf) ou arquivos de texto (.txt). Cada
                      arquivo se tornará uma task principal.
                      <br />
                      <span className="font-medium">
                        Limites: Máx. 50MB por arquivo • Máx. 500MB no total
                      </span>
                    </p>

                    <div className="space-y-3">
                      <input
                        type="file"
                        accept=".zip"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

                          // Validate individual file size (50MB max)
                          const invalidFiles = files.filter(
                            (f) => f.size > 50 * 1024 * 1024,
                          );
                          if (invalidFiles.length > 0) {
                            alert(
                              `Os seguintes arquivos excedem 50MB:\n${invalidFiles.map((f) => f.name).join("\n")}`,
                            );
                            e.target.value = "";
                            return;
                          }

                          // Validate total size (500MB max)
                          const totalSize = files.reduce(
                            (sum, f) => sum + f.size,
                            0,
                          );
                          if (totalSize > 500 * 1024 * 1024) {
                            alert(
                              `Tamanho total dos arquivos (${(totalSize / 1024 / 1024).toFixed(2)}MB) excede o limite de 500MB`,
                            );
                            e.target.value = "";
                            return;
                          }

                          setZipFiles(files);
                        }}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {zipFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>
                              {zipFiles.length} arquivo(s) selecionado(s)
                            </span>
                            <span className="text-gray-600">
                              Total:{" "}
                              {(
                                zipFiles.reduce((sum, f) => sum + f.size, 0) /
                                1024 /
                                1024
                              ).toFixed(2)}{" "}
                              MB
                            </span>
                          </div>
                          {zipFiles.map((file, index) => (
                            <div
                              key={index}
                              className="bg-white border border-green-300 rounded p-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">✓</span>
                                <span className="text-sm font-medium">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setZipFiles(
                                    zipFiles.filter((_, i) => i !== index),
                                  )
                                }
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {uploadedTasksCount > 0 && (
                        <div className="bg-green-50 border border-green-300 rounded p-3">
                          <p className="text-sm text-green-800">
                            ✓ {uploadedTasksCount} task(s) principais carregadas
                            com sucesso!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Repetitions Configuration */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Repetições por Task *
                    </label>
                    <input
                      type="number"
                      value={repetitionsPerTask}
                      onChange={(e) =>
                        setRepetitionsPerTask(parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="100"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Quantas vezes cada task principal será avaliada por
                      diferentes usuários (mesmo usuário não pode avaliar a
                      mesma task duas vezes)
                    </p>
                  </div>

                  {/* Auto Calculate Evaluations */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="autoCalculateEval"
                      checked={autoCalculateEvaluations}
                      onChange={(e) =>
                        setAutoCalculateEvaluations(e.target.checked)
                      }
                      className="mt-1"
                    />
                    <div>
                      <label
                        htmlFor="autoCalculateEval"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Calcular meta de avaliações automaticamente
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Se marcado, a meta será: (número de tasks) × (repetições
                        por task)
                      </p>
                    </div>
                  </div>

                  {/* Manual Evaluation Goal (if auto calculate is off) */}
                  {!autoCalculateEvaluations && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Meta de Avaliações *
                      </label>
                      <input
                        type="number"
                        value={evaluationGoal}
                        onChange={(e) =>
                          setEvaluationGoal(parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Dica:</strong> Após criar o playground, você
                      poderá acessar o painel de consolidação para revisar as
                      respostas e decidir se consolida cada task ou retorna para
                      avaliação adicional.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Curation Configuration */}
            {type === "curation" && (
              <section className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  🎧 Configuração de Curadoria
                </h2>

                <div className="space-y-6">
                  {/* Agent Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Agent ID (ElevenLabs) *
                    </label>
                    <input
                      type="text"
                      value={curationAgentId}
                      onChange={(e) => {
                        setCurationAgentId(e.target.value);
                        // Reset sync state when agent changes
                        if (hasSynced) {
                          setHasSynced(false);
                          setPreviewConversations([]);
                        }
                      }}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="agent_xxxx..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ID do agente ElevenLabs cujas conversas serão avaliadas
                    </p>
                  </div>

                  {/* Curation Mode */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Modo de Curadoria *
                    </label>
                    <select
                      value={curationMode}
                      onChange={(e) => {
                        setCurationMode(e.target.value as CurationMode);
                        setHasSynced(false);
                        setPreviewConversations([]);
                      }}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="continuous">Contínua</option>
                      <option value="date_range">Range de Datas</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {curationMode === "continuous"
                        ? "Busca aleatoriamente uma conversa cada vez que o avaliador abre o playground"
                        : "Permite selecionar um intervalo de datas e sincronizar as conversas"}
                    </p>
                  </div>

                  {/* Date Range Fields (only for date_range mode) */}
                  {curationMode === "date_range" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Data/Hora Inicial *
                          </label>
                          <input
                            type="datetime-local"
                            value={curationDateStart}
                            onChange={(e) => {
                              setCurationDateStart(e.target.value);
                              if (hasSynced) {
                                setHasSynced(false);
                                setPreviewConversations([]);
                              }
                            }}
                            max={new Date().toISOString().slice(0, 16)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Data/Hora Final *
                          </label>
                          <input
                            type="datetime-local"
                            value={curationDateEnd}
                            onChange={(e) => {
                              setCurationDateEnd(e.target.value);
                              if (hasSynced) {
                                setHasSynced(false);
                                setPreviewConversations([]);
                              }
                            }}
                            max={new Date().toISOString().slice(0, 16)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      {/* Sync Button */}
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handlePreviewSync}
                          disabled={
                            isSyncingConversations ||
                            !curationAgentId.trim() ||
                            !curationDateStart ||
                            !curationDateEnd
                          }
                          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                        >
                          {isSyncingConversations
                            ? "🔄 Buscando conversas..."
                            : hasSynced
                              ? "🔄 Re-sincronizar"
                              : "🔄 Sincronizar Conversas"}
                        </button>
                        {hasSynced && (
                          <span className="text-sm text-gray-600">
                            {previewConversations.length} conversas encontradas
                            · {selectedConversationsCount} selecionadas
                          </span>
                        )}
                      </div>

                      {/* Conversations Table */}
                      {hasSynced && previewConversations.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                            <h3 className="font-medium text-sm">
                              Conversas do Período
                            </h3>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => toggleAllConversations(true)}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Selecionar Todas
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleAllConversations(false)}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Desmarcar Todas
                              </button>
                            </div>
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left w-10">
                                    <input
                                      type="checkbox"
                                      checked={
                                        selectedConversationsCount ===
                                        previewConversations.length
                                      }
                                      onChange={(e) =>
                                        toggleAllConversations(e.target.checked)
                                      }
                                      className="rounded"
                                    />
                                  </th>
                                  <th className="px-4 py-2 text-left">ID</th>
                                  <th className="px-4 py-2 text-left">
                                    Duração
                                  </th>
                                  <th className="px-4 py-2 text-left">
                                    Status
                                  </th>
                                  <th className="px-4 py-2 text-left">
                                    Data/Hora
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {previewConversations.map((conv) => (
                                  <tr
                                    key={conv.conversation_id}
                                    className={`hover:bg-gray-50 cursor-pointer ${
                                      conv.selected
                                        ? "bg-white"
                                        : "bg-gray-100 opacity-60"
                                    }`}
                                    onClick={() =>
                                      toggleConversationSelection(
                                        conv.conversation_id,
                                      )
                                    }
                                  >
                                    <td className="px-4 py-2">
                                      <input
                                        type="checkbox"
                                        checked={conv.selected}
                                        onChange={() =>
                                          toggleConversationSelection(
                                            conv.conversation_id,
                                          )
                                        }
                                        className="rounded"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      <span
                                        title={`Clique para copiar: ${conv.conversation_id}`}
                                        className="cursor-pointer hover:text-blue-600 hover:underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(
                                            conv.conversation_id,
                                          );
                                          const el = e.currentTarget;
                                          const original = el.textContent;
                                          el.textContent = "Copiado!";
                                          setTimeout(
                                            () =>
                                              (el.textContent = original || ""),
                                            1000,
                                          );
                                        }}
                                      >
                                        {conv.conversation_id.slice(0, 12)}...
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">
                                      {formatDuration(conv.call_duration_secs)}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          conv.call_successful === "success"
                                            ? "bg-green-100 text-green-800"
                                            : conv.call_successful === "failure"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {conv.call_successful ||
                                          conv.status ||
                                          "—"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">
                                      {formatDateTime(
                                        conv.start_time_unix_secs,
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500">
                            {selectedConversationsCount} de{" "}
                            {previewConversations.length} conversas selecionadas
                            para o pipeline
                          </div>
                        </div>
                      )}

                      {hasSynced && previewConversations.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Nenhuma conversa encontrada neste período.
                            Verifique o Agent ID e o intervalo de datas.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Passes Per Conversation (for date_range mode) */}
                  {curationMode === "date_range" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Vezes por conversa no pipe *
                      </label>
                      <input
                        type="number"
                        value={curationPassesPerConversation}
                        onChange={(e) =>
                          setCurationPassesPerConversation(
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="100"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Quantas vezes cada conversa passará pelo pipe de
                        avaliação (nunca repetindo o mesmo avaliador)
                      </p>
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      {curationMode === "continuous" ? (
                        <>
                          🔄 <strong>Modo Contínuo:</strong> Cada vez que um
                          avaliador abrir o playground, receberá aleatoriamente
                          uma conversa. A mesma conversa pode aparecer para
                          diferentes avaliadores, mas nunca para o mesmo.
                        </>
                      ) : (
                        <>
                          📋 <strong>Modo Range de Datas:</strong> Sincronize as
                          conversas acima e selecione quais entrarão no pipeline
                          de curadoria. Transcrição e áudio serão carregados sob
                          demanda ao abrir cada conversa.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Models */}
            {type !== "data_labeling" && type !== "curation" && (
              <section className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    Modelos {type === "ab_testing" ? "(mínimo 2)" : ""}
                  </h2>
                  <button
                    type="button"
                    onClick={addModel}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + Adicionar Modelo
                  </button>
                </div>

                <div className="space-y-4">
                  {models.map((model, index) => (
                    <div key={index} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">Modelo {index + 1}</h3>
                        {models.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeModel(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Chave do Modelo *
                          </label>
                          <input
                            type="text"
                            value={model.key}
                            onChange={(e) =>
                              updateModel(index, "key", e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ex: model_a, gpt_4, etc"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Código Embed Eleven Labs *
                          </label>
                          <textarea
                            value={model.embedCode}
                            onChange={(e) =>
                              updateModel(index, "embedCode", e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={4}
                            placeholder='<elevenlabs-convai agent-id="..."></elevenlabs-convai>'
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Questions */}
            <section className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Perguntas</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Adicionar Pergunta
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((question, qIndex) => (
                  <div key={question.id} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Pergunta {qIndex + 1}</h3>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveQuestion(qIndex, "up")}
                            disabled={qIndex === 0}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(qIndex, "down")}
                            disabled={qIndex === questions.length - 1}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Texto da Pergunta *
                        </label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) =>
                            updateQuestion(qIndex, "text", e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Tipo *
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) =>
                              updateQuestion(
                                qIndex,
                                "type",
                                e.target.value as QuestionType,
                              )
                            }
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="select">Múltipla Escolha</option>
                            <option value="input_string">Texto Aberto</option>
                            <option value="boolean">Sim/Não (Checkbox)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {question.type === "boolean" &&
                              "Pergunta booleana com checkbox true/false"}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Obrigatória?
                          </label>
                          <label className="flex items-center mt-2">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) =>
                                updateQuestion(
                                  qIndex,
                                  "required",
                                  e.target.checked,
                                )
                              }
                              className="mr-2"
                            />
                            Sim
                          </label>
                        </div>
                      </div>

                      {question.type === "select" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">
                              Opções *
                            </label>
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                            >
                              + Opção
                            </button>
                          </div>

                          <div className="space-y-2">
                            {question.options?.map((option, oIndex) => (
                              <div key={oIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) =>
                                    updateOption(qIndex, oIndex, e.target.value)
                                  }
                                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={`Opção ${oIndex + 1}`}
                                  required
                                />
                                {question.options!.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    className="px-3 py-2 text-red-500 hover:text-red-700"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Submit */}
            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (type === "curation" &&
                    curationMode === "date_range" &&
                    (!hasSynced || selectedConversationsCount === 0))
                }
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting
                  ? isUploadingZip
                    ? "Fazendo upload..."
                    : "Criando..."
                  : type === "curation" &&
                      curationMode === "date_range" &&
                      hasSynced
                    ? `Criar Playground (${selectedConversationsCount} conversas)`
                    : "Criar Playground"}
              </button>
              {type === "curation" &&
                curationMode === "date_range" &&
                !hasSynced && (
                  <span className="text-sm text-amber-600">
                    ⚠️ Sincronize e selecione as conversas antes
                  </span>
                )}
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </AdminGuard>
  );
}

export default function CreatePlaygroundPage() {
  return (
    <Suspense
      fallback={
        <AdminGuard>
          <Layout>
            <div className="max-w-4xl mx-auto p-6">
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Carregando...</p>
                </div>
              </div>
            </div>
          </Layout>
        </AdminGuard>
      }
    >
      <CreatePlaygroundForm />
    </Suspense>
  );
}
