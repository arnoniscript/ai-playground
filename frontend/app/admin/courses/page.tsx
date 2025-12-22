"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesAdminApi } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Layout } from "@/components/layout";

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await coursesAdminApi.list();
      setCourses(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar cursos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este curso?")) return;

    try {
      await coursesAdminApi.delete(id);
      loadCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao deletar curso");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cursos Introdutórios
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie os cursos introdutórios
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/courses/create")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Criar Novo Curso
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Nenhum curso criado ainda.</p>
            <button
              onClick={() => router.push("/admin/courses/create")}
              className="mt-4 text-blue-600 hover:underline"
            >
              Criar primeiro curso
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {course.title}
                      </h2>
                      {course.is_published ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Publicado
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          Rascunho
                        </span>
                      )}
                    </div>
                    {course.description && (
                      <p className="text-gray-600 mt-2">{course.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Criado em{" "}
                      {new Date(course.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() =>
                        router.push(`/admin/courses/${course.id}/metrics`)
                      }
                      className="px-4 py-2 text-purple-600 border border-purple-600 rounded hover:bg-purple-50"
                    >
                      Métricas
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/admin/courses/${course.id}/edit`)
                      }
                      className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
