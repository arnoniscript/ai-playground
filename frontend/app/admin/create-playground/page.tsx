"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";

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

export default function CreatePlaygroundPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Playground basic info
  const [name, setName] = useState("");
  const [type, setType] = useState<PlaygroundType>("ab_testing");
  const [description, setDescription] = useState("");
  const [supportText, setSupportText] = useState("");

  // Models
  const [models, setModels] = useState<ModelInput[]>([
    { key: "", embedCode: "" },
  ]);

  // Questions
  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      id: crypto.randomUUID(),
      text: "",
      type: "select",
      required: true,
      options: [""],
    },
  ]);

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
        id: crypto.randomUUID(),
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
