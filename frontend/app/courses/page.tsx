"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesApi } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Layout } from "@/components/layout";

export default function CoursesListPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await coursesApi.list();
      setCourses(response.data.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao carregar cursos");
    } finally {
      setLoading(false);
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cursos Introdutórios
        </h1>
        <p className="text-gray-600 mb-8">
          Explore os cursos disponíveis e aprenda no seu ritmo
        </p>

        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Nenhum curso disponível no momento.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {courses.map((course) => {
              const isCompleted = course.user_progress?.completed_at != null;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/courses/${course.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {course.title}
                    </h2>
                    {isCompleted && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center gap-1">
                        ✓ Concluído
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-gray-600 mb-4">{course.description}</p>
                  )}
                  <button className="text-blue-600 hover:underline font-medium">
                    {isCompleted ? "Revisar curso →" : "Começar curso →"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
