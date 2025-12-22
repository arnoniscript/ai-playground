"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesMetricsApi } from "@/lib/api";
import type { CourseMetrics, UserCourseMetrics } from "@/lib/types";
import { Layout } from "@/components/layout";

export default function CourseMetricsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CourseMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserCourseMetrics[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [metricsRes, usersRes] = await Promise.all([
        coursesMetricsApi.getCourseMetrics(params.id),
        coursesMetricsApi.getCourseUsers(params.id),
      ]);
      setMetrics(metricsRes.data.data);
      setUserMetrics(usersRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Carregando métricas...</div>
      </Layout>
    );
  }

  if (!metrics) {
    return (
      <Layout>
        <div className="text-center">Erro ao carregar métricas</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/admin/courses")}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Voltar para cursos
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {metrics.course_title}
        </h1>
        <p className="text-gray-600 mb-8">Métricas e análises do curso</p>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2 px-4 ${
              activeTab === "overview"
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-600"
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-2 px-4 ${
              activeTab === "users"
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-600"
            }`}
          >
            Usuários ({userMetrics.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Total de Inscritos
                </h3>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.total_enrollments}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Concluíram
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {metrics.total_completions}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Taxa de Conclusão
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  {metrics.completion_rate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Nota Média
                </h3>
                <p className="text-3xl font-bold text-purple-600">
                  {metrics.average_score.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Step Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Métricas por Step</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Step</th>
                      <th className="text-center py-3 px-4">Tentativas</th>
                      <th className="text-center py-3 px-4">Usuários Únicos</th>
                      <th className="text-center py-3 px-4">Nota Média</th>
                      <th className="text-center py-3 px-4">
                        Taxa de Aprovação
                      </th>
                      <th className="text-center py-3 px-4">
                        Média de Tentativas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.step_metrics.map((step) => (
                      <tr
                        key={step.step_id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-medium">
                              Step {step.step_order + 1}
                            </span>
                            <p className="text-sm text-gray-600">
                              {step.step_title}
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          {step.total_attempts}
                        </td>
                        <td className="text-center py-3 px-4">
                          {step.unique_users}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="font-semibold">
                            {step.average_score.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-medium ${
                              step.pass_rate >= 80
                                ? "bg-green-100 text-green-800"
                                : step.pass_rate >= 60
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {step.pass_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {step.average_attempts_to_pass.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Progresso dos Usuários
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Usuário</th>
                    <th className="text-center py-3 px-4">Iniciado em</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Progresso</th>
                    <th className="text-center py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {userMetrics.map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {user.user_name || "Sem nome"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {user.user_email}
                          </p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 text-sm">
                        {new Date(user.started_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="text-center py-3 px-4">
                        {user.completed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Concluído
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Em Andamento
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (user.current_step_order / user.total_steps) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {user.current_step_order}/{user.total_steps}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/courses/${params.id}/users/${user.user_id}`
                            )
                          }
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
