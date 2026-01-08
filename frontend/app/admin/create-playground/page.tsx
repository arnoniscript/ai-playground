"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";

// Force dynamic rendering
export const dynamic = "force-dynamic";

type PlaygroundType = "ab_testing" | "tuning";
type QuestionType = "select" | "input_string";

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
              }))
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
              }))
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
    value: string
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
    value: any
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
    value: string
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

    if (models.some((m) => !m.key.trim() || !m.embedCode.trim())) {
      setError("Todos os modelos precisam de chave e código embed");
      return;
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
            q.options.some((o) => !o.trim()))
      )
    ) {
      setError("Perguntas de seleção precisam de pelo menos uma opção válida");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create playground with models and questions in single request
      const playgroundResponse = await api.post("/admin/playgrounds", {
        name,
        type,
        description: description || undefined,
        support_text: supportText || undefined,
        evaluation_goal: evaluationGoal,
        linked_course_id: linkedCourseId || null,
        course_required: courseRequired,
        restricted_emails: isPrivate ? selectedEmails : null,
        models: models.map((m) => ({
          model_key: m.key,
          model_name: m.key, // Using key as name for now
          embed_code: m.embedCode,
          max_evaluations: 1000, // Default value
        })),
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

      // Authorize selected clients (independent of private/public status)
      if (authorizedClientIds.length > 0) {
        try {
          await Promise.all(
            authorizedClientIds.map((userId) =>
              api.post(`/admin/playgrounds/${playgroundId}/authorized-users`, {
                user_id: userId,
                notes: "Autorizado durante criação do playground",
              })
            )
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
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {type === "ab_testing"
                      ? "Usuários avaliam 2 modelos e escolhem o melhor"
                      : "Usuários avaliam 1 modelo múltiplas vezes"}
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
                                      (email) => email !== user.email
                                    )
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
                                      (id) => id !== client.id
                                    )
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

            {/* Models */}
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
                                e.target.value as QuestionType
                              )
                            }
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="select">Múltipla Escolha</option>
                            <option value="input_string">Texto Aberto</option>
                          </select>
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
                                  e.target.checked
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
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Criando..." : "Criar Playground"}
              </button>
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
