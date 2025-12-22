"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesAdminApi } from "@/lib/api";
import type {
  CourseStep,
  EvaluationQuestionWithOptions,
  QuestionOption,
} from "@/lib/types";

interface StepEditorProps {
  courseId: string;
  stepId?: string;
}

interface QuestionForm {
  order_index: number;
  question_text: string;
  question_image_url: string;
  question_video_url: string;
  question_audio_url: string;
  options: Array<{
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }>;
}

export default function StepEditor({ courseId, stepId }: StepEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!stepId);
  const [saving, setSaving] = useState(false);

  // Step data
  const [orderIndex, setOrderIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [hasEvaluation, setHasEvaluation] = useState(false);
  const [evaluationRequired, setEvaluationRequired] = useState(false);
  const [minScore, setMinScore] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number | "">("");

  // Questions
  const [questions, setQuestions] = useState<EvaluationQuestionWithOptions[]>(
    []
  );
  const [editingQuestion, setEditingQuestion] = useState<QuestionForm | null>(
    null
  );

  useEffect(() => {
    if (stepId) {
      loadStep();
    }
  }, [stepId]);

  const loadStep = async () => {
    try {
      setLoading(true);
      const response = await coursesAdminApi.get(courseId);
      const step = response.data.data.steps.find((s) => s.id === stepId);

      if (step) {
        setOrderIndex(step.order_index);
        setTitle(step.title);
        setContent(step.content || "");
        setImageUrl(step.image_url || "");
        setVideoUrl(step.video_url || "");
        setAudioUrl(step.audio_url || "");
        setHasEvaluation(step.has_evaluation);
        setEvaluationRequired(step.evaluation_required);
        setMinScore(step.min_score || 0);
        setMaxAttempts(step.max_attempts || "");
        setQuestions(step.questions || []);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao carregar step");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async () => {
    if (!title.trim()) {
      alert("O título é obrigatório");
      return;
    }

    try {
      setSaving(true);
      const data = {
        order_index: orderIndex,
        title,
        content: content || null,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        audio_url: audioUrl || null,
        has_evaluation: hasEvaluation,
        evaluation_required: evaluationRequired,
        min_score: minScore || null,
        max_attempts: maxAttempts || null,
      };

      if (stepId) {
        await coursesAdminApi.updateStep(courseId, stepId, data);
        alert("Step atualizado com sucesso!");
      } else {
        const response = await coursesAdminApi.addStep(courseId, data);
        router.push(
          `/admin/courses/${courseId}/steps/${response.data.data.id}/edit`
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar step");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      order_index: questions.length,
      question_text: "",
      question_image_url: "",
      question_video_url: "",
      question_audio_url: "",
      options: [
        { option_text: "", is_correct: false, order_index: 0 },
        { option_text: "", is_correct: false, order_index: 1 },
      ],
    });
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion || !stepId) return;

    if (!editingQuestion.question_text.trim()) {
      alert("O texto da pergunta é obrigatório");
      return;
    }

    if (editingQuestion.options.length < 2) {
      alert("São necessárias pelo menos 2 opções");
      return;
    }

    if (!editingQuestion.options.some((opt) => opt.is_correct)) {
      alert("Pelo menos uma opção deve ser marcada como correta");
      return;
    }

    try {
      await coursesAdminApi.addQuestion(courseId, stepId, editingQuestion);
      setEditingQuestion(null);
      loadStep();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar questão");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Deletar esta questão?")) return;

    try {
      await coursesAdminApi.deleteQuestion(courseId, stepId!, questionId);
      loadStep();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao deletar questão");
    }
  };

  const addOption = () => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: [
        ...editingQuestion.options,
        {
          option_text: "",
          is_correct: false,
          order_index: editingQuestion.options.length,
        },
      ],
    });
  };

  const removeOption = (index: number) => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: editingQuestion.options.filter((_, i) => i !== index),
    });
  };

  const updateOption = (index: number, field: string, value: any) => {
    if (!editingQuestion) return;
    const newOptions = [...editingQuestion.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Voltar para o curso
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {stepId ? "Editar Step" : "Criar Novo Step"}
        </h1>
      </div>

      {/* Step Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações do Step</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordem *
            </label>
            <input
              type="number"
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
              className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ordem de exibição (0, 1, 2...)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Título do step"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Texto explicativo do step"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL da Imagem
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Vídeo
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Áudio
              </label>
              <input
                type="url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-4">Configurações de Avaliação</h3>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasEvaluation"
                checked={hasEvaluation}
                onChange={(e) => setHasEvaluation(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="hasEvaluation"
                className="ml-2 text-sm text-gray-700"
              >
                Este step tem avaliação
              </label>
            </div>

            {hasEvaluation && (
              <>
                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    id="evaluationRequired"
                    checked={evaluationRequired}
                    onChange={(e) => setEvaluationRequired(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="evaluationRequired"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Avaliação obrigatória (usuário deve passar para continuar)
                  </label>
                </div>

                {evaluationRequired && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pontuação mínima para passar
                    </label>
                    <input
                      type="number"
                      value={minScore}
                      onChange={(e) =>
                        setMinScore(parseInt(e.target.value) || 0)
                      }
                      className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                )}

                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de tentativas (deixe vazio para ilimitado)
                  </label>
                  <input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) =>
                      setMaxAttempts(
                        e.target.value ? parseInt(e.target.value) : ""
                      )
                    }
                    className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    placeholder="Ilimitado"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSaveStep}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Step"}
          </button>
        </div>
      </div>

      {/* Questions */}
      {stepId && hasEvaluation && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Questões da Avaliação</h2>
            {!editingQuestion && (
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                + Adicionar Questão
              </button>
            )}
          </div>

          {/* Question Form */}
          {editingQuestion && (
            <div className="border-2 border-blue-500 rounded-lg p-4 mb-4 bg-blue-50">
              <h3 className="font-semibold mb-3">Nova Questão</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pergunta *
                  </label>
                  <textarea
                    value={editingQuestion.question_text}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        question_text: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite a pergunta"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Imagem
                    </label>
                    <input
                      type="url"
                      value={editingQuestion.question_image_url}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          question_image_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Vídeo
                    </label>
                    <input
                      type="url"
                      value={editingQuestion.question_video_url}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          question_video_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Áudio
                    </label>
                    <input
                      type="url"
                      value={editingQuestion.question_audio_url}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          question_audio_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Opções *
                    </label>
                    <button
                      onClick={addOption}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      + Adicionar opção
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editingQuestion.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) =>
                            updateOption(index, "option_text", e.target.value)
                          }
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder={`Opção ${index + 1}`}
                        />
                        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white">
                          <input
                            type="checkbox"
                            checked={option.is_correct}
                            onChange={(e) =>
                              updateOption(
                                index,
                                "is_correct",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-green-600"
                          />
                          <span className="text-sm">Correta</span>
                        </label>
                        {editingQuestion.options.length > 2 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveQuestion}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Salvar Questão
                  </button>
                  <button
                    onClick={() => setEditingQuestion(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Questions List */}
          {questions.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              Nenhuma questão criada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-blue-600">
                        Questão {index + 1}
                      </span>
                      <p className="text-gray-800 mt-1">
                        {question.question_text}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="ml-4 px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50 text-sm"
                    >
                      Deletar
                    </button>
                  </div>

                  <div className="ml-4 mt-3 space-y-1">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-2 text-sm ${
                          option.is_correct
                            ? "text-green-700 font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        <span>{optIndex + 1}.</span>
                        <span>{option.option_text}</span>
                        {option.is_correct && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                            Correta
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
