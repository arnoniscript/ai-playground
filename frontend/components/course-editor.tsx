"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesAdminApi } from "@/lib/api";
import type {
  CourseWithSteps,
  CourseStep,
  EvaluationQuestionWithOptions,
} from "@/lib/types";

interface CourseEditorProps {
  courseId?: string;
}

export default function CourseEditor({ courseId }: CourseEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);

  // Course data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [steps, setSteps] = useState<CourseStep[]>([]);

  // UI state
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await coursesAdminApi.get(courseId!);
      const course = response.data.data;
      setTitle(course.title);
      setDescription(course.description || "");
      setIsPublished(course.is_published);
      setSteps(course.steps);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!title.trim()) {
      alert("O título é obrigatório");
      return;
    }

    try {
      setSaving(true);
      if (courseId) {
        await coursesAdminApi.update(courseId, {
          title,
          description,
          is_published: isPublished,
        });
      } else {
        const response = await coursesAdminApi.create({
          title,
          description,
          is_published: isPublished,
        });
        router.push(`/admin/courses/${response.data.data.id}/edit`);
      }
      alert("Curso salvo com sucesso!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar curso");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = () => {
    if (!courseId) {
      alert("Salve o curso primeiro antes de adicionar steps");
      return;
    }
    router.push(`/admin/courses/${courseId}/steps/create`);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/courses")}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Voltar para lista de cursos
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {courseId ? "Editar Curso" : "Criar Novo Curso"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Course Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações do Curso</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do curso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição do curso"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublished" className="ml-2 text-sm text-gray-700">
              Publicar curso (visível para usuários)
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSaveCourse}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Curso"}
          </button>
        </div>
      </div>

      {/* Steps */}
      {courseId && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Steps do Curso</h2>
            <button
              onClick={handleAddStep}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Adicionar Step
            </button>
          </div>

          {steps.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              Nenhum step criado ainda. Adicione o primeiro step para começar.
            </p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                          Step {step.order_index + 1}
                        </span>
                        <h3 className="font-semibold">{step.title}</h3>
                        {step.has_evaluation && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                            Com avaliação
                          </span>
                        )}
                        {step.evaluation_required && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                            Obrigatória
                          </span>
                        )}
                      </div>
                      {step.content && (
                        <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                          {step.content}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/courses/${courseId}/steps/${step.id}/edit`
                          )
                        }
                        className="px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 text-sm"
                      >
                        Editar
                      </button>
                    </div>
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
