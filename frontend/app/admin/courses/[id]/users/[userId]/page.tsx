"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesMetricsApi, coursesAdminApi } from "@/lib/api";
import { Layout } from "@/components/layout";
import type { UserCourseMetrics, CourseStep } from "@/lib/types";

export default function UserCourseDetailsPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userMetrics, setUserMetrics] = useState<UserCourseMetrics | null>(
    null
  );
  const [courseSteps, setCourseSteps] = useState<CourseStep[]>([]);

  useEffect(() => {
    loadUserDetails();
  }, []);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const [metricsRes, courseRes] = await Promise.all([
        coursesMetricsApi.getUserMetrics(params.id, params.userId),
        coursesAdminApi.get(params.id),
      ]);
      setUserMetrics(metricsRes.data.data);
      setCourseSteps(courseRes.data.data.steps);
    } catch (err: any) {
      alert(
        err.response?.data?.error || "Erro ao carregar detalhes do usuário"
      );
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

  if (!userMetrics) {
    return (
      <Layout>
        <div className="text-center">Usuário não encontrado neste curso</div>
      </Layout>
    );
  }

  // Calculate overall metrics
  const totalAttempts = userMetrics.step_attempts.reduce(
    (sum, step) => sum + step.attempts,
    0
  );
  const stepsWithEvaluation = userMetrics.step_attempts.length;
  const passedSteps = userMetrics.step_attempts.filter((s) => s.passed).length;
  const averageScore =
    stepsWithEvaluation > 0
      ? userMetrics.step_attempts.reduce((sum, step) => {
          return sum + (step.best_score / step.total_questions) * 100;
        }, 0) / stepsWithEvaluation
      : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push(`/admin/courses/${params.id}/metrics`)}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Voltar para métricas do curso
        </button>

        {/* User Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {userMetrics.user_name || "Sem nome"}
              </h1>
              <p className="text-gray-600">{userMetrics.user_email}</p>
              <p className="text-sm text-gray-500 mt-2">
                Iniciou em:{" "}
                {new Date(userMetrics.started_at).toLocaleDateString("pt-BR")}
                {userMetrics.completed_at && (
                  <>
                    {" "}
                    • Concluiu em:{" "}
                    {new Date(userMetrics.completed_at).toLocaleDateString(
                      "pt-BR"
                    )}
                  </>
                )}
              </p>
            </div>
            <div>
              {userMetrics.completed ? (
                <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  ✓ Concluído
                </span>
              ) : (
                <span className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Em Andamento
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Progresso</div>
            <div className="text-2xl font-bold text-gray-900">
              {userMetrics.current_step_order}/{userMetrics.total_steps}
            </div>
            <div className="text-xs text-gray-500">steps completados</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">
              Total de Tentativas
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalAttempts}
            </div>
            <div className="text-xs text-gray-500">em avaliações</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Steps Aprovados</div>
            <div className="text-2xl font-bold text-gray-900">
              {passedSteps}/{stepsWithEvaluation}
            </div>
            <div className="text-xs text-gray-500">avaliações passadas</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Nota Média</div>
            <div className="text-2xl font-bold text-gray-900">
              {averageScore.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">nas melhores tentativas</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Progresso por Step
          </h2>
          <div className="space-y-4">
            {courseSteps.map((step, index) => {
              const stepAttempt = userMetrics.step_attempts.find(
                (a) => a.step_id === step.id
              );
              const isPassed = stepAttempt?.passed || false;
              const isCurrent =
                index + 1 === userMetrics.current_step_order &&
                !userMetrics.completed;
              const isCompleted =
                index + 1 < userMetrics.current_step_order ||
                userMetrics.completed;

              return (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 ${
                    isCurrent
                      ? "border-blue-500 bg-blue-50"
                      : isCompleted
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-500">
                          Step {index + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded">
                            Atual
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded">
                            ✓ Concluído
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {step.title}
                      </h3>

                      {stepAttempt && step.has_evaluation && (
                        <div className="space-y-2">
                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Tentativas:</span>{" "}
                              <span className="font-medium">
                                {stepAttempt.attempts}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                Melhor nota:
                              </span>{" "}
                              <span className="font-medium">
                                {stepAttempt.best_score}/
                                {stepAttempt.total_questions}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Percentual:</span>{" "}
                              <span className="font-medium">
                                {(
                                  (stepAttempt.best_score /
                                    stepAttempt.total_questions) *
                                  100
                                ).toFixed(1)}
                                %
                              </span>
                            </div>
                          </div>

                          {isPassed ? (
                            <div className="flex items-center gap-2 text-green-700">
                              <span className="text-sm font-medium">
                                ✓ Aprovado na avaliação
                              </span>
                            </div>
                          ) : step.evaluation_required ? (
                            <div className="flex items-center gap-2 text-amber-700">
                              <span className="text-sm font-medium">
                                ⚠ Avaliação obrigatória não aprovada
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="text-sm">
                                Avaliação opcional não aprovada
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {!stepAttempt && step.has_evaluation && isCompleted && (
                        <div className="text-sm text-gray-600">
                          Step visualizado (sem avaliação realizada)
                        </div>
                      )}

                      {!step.has_evaluation && isCompleted && (
                        <div className="text-sm text-gray-600">
                          Step sem avaliação - concluído
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Attempts History */}
        {userMetrics.step_attempts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Histórico de Tentativas em Avaliações
            </h2>
            <div className="space-y-4">
              {userMetrics.step_attempts.map((attempt) => (
                <div
                  key={attempt.step_id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {attempt.step_title}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        Total de {attempt.attempts} tentativa(s) realizada(s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {(
                          (attempt.best_score / attempt.total_questions) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                      <div className="text-sm text-gray-600">melhor nota</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-600">Acertos</div>
                      <div className="font-medium">
                        {attempt.best_score}/{attempt.total_questions}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Status</div>
                      <div className="font-medium">
                        {attempt.passed ? (
                          <span className="text-green-600">✓ Aprovado</span>
                        ) : (
                          <span className="text-amber-600">Não aprovado</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Tentativas</div>
                      <div className="font-medium">{attempt.attempts}x</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
