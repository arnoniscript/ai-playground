"use client";

import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Playground } from "@/lib/types";
import Link from "next/link";
import QADashboardEarnings from "@/components/qa-dashboard-earnings";

export default function TesterDashboard() {
  const { user } = useAuthStore();
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaygrounds();
  }, []);

  const fetchPlaygrounds = async () => {
    try {
      const response = await api.get("/playgrounds");
      setPlaygrounds(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch playgrounds:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">
              Bem-vindo, {user?.full_name || user?.email}
            </h1>
            <p className="text-gray-600 mt-2">
              Escolha um playground para começar a avaliar
            </p>
          </div>

          {/* QA Earnings Dashboard - Only for QAs */}
          {user?.role === "qa" && <QADashboardEarnings />}

          {loading ? (
            <div className="text-center py-12">Carregando playgrounds...</div>
          ) : playgrounds.length === 0 ? (
            <div className="bg-yellow-50 p-6 rounded-lg">
              <p className="text-yellow-800">
                Nenhum playground disponível no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {playgrounds.map((playground) => {
                const totalEvaluations =
                  playground.counters?.reduce(
                    (sum, c) => sum + c.current_count,
                    0
                  ) || 0;
                const evaluationGoal = playground.evaluation_goal || 100;
                const progressPercentage = Math.min(
                  100,
                  Math.round((totalEvaluations / evaluationGoal) * 100)
                );

                // Check if playground is private
                const isPrivate =
                  playground.restricted_emails &&
                  playground.restricted_emails.length > 0;

                // Check if user has access (owner, admin, or in restricted list)
                const hasAccess =
                  playground.created_by === user?.id || // Owner always has access
                  user?.role === "admin" || // Admins always have access
                  !isPrivate || // Public playgrounds are accessible to all
                  (isPrivate &&
                    playground.restricted_emails?.includes(user?.email || "")); // User is in allowed list

                return hasAccess ? (
                  <Link
                    key={playground.id}
                    href={`/playground/${playground.id}`}
                    className="block"
                  >
                    <div className="p-6 bg-white rounded-lg shadow transition flex flex-col hover:shadow-lg cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-xl font-bold">{playground.name}</h2>
                        <div className="flex gap-2">
                          {isPrivate && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                              🔒 Privado
                            </span>
                          )}
                          {playground.is_paid && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              💰 Remunerado
                            </span>
                          )}
                        </div>
                      </div>
                      {playground.description && (
                        <p className="text-gray-600 mb-4">
                          {playground.description}
                        </p>
                      )}

                      {playground.is_paid && playground.payment_type && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-green-900">
                              {playground.payment_type === "per_hour" &&
                                `R$ ${playground.payment_value?.toFixed(
                                  2
                                )}/hora`}
                              {playground.payment_type === "per_task" &&
                                `R$ ${playground.payment_value?.toFixed(
                                  2
                                )}/task`}
                              {playground.payment_type === "per_goal" &&
                                `R$ ${playground.payment_value?.toFixed(
                                  2
                                )} a cada ${playground.tasks_for_goal} tasks`}
                            </span>
                          </div>
                          {playground.payment_type === "per_hour" &&
                            playground.max_time_per_task && (
                              <p className="text-xs text-green-700 mt-1">
                                Máx. {playground.max_time_per_task} min/task
                              </p>
                            )}
                        </div>
                      )}

                      <div className="mt-auto space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="badge badge-blue">
                            {playground.type === "ab_testing"
                              ? "A/B Testing"
                              : "Tuning"}
                          </span>
                          <span className="text-gray-600 font-medium">
                            {totalEvaluations} de {evaluationGoal} avaliações
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Progresso</span>
                            <span className="font-bold text-blue-600">
                              {progressPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={playground.id}
                    className="p-6 bg-white rounded-lg shadow transition flex flex-col opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        {playground.name}
                      </h2>
                      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full ml-2">
                        🔒 Acesso Restrito
                      </span>
                    </div>
                    {playground.description && (
                      <p className="text-gray-600 mb-2">
                        {playground.description}
                      </p>
                    )}
                    <p className="text-red-600 text-xs mb-4 font-medium">
                      Você não tem permissão para acessar este playground
                    </p>

                    <div className="mt-auto space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="badge badge-gray opacity-50">
                          {playground.type === "ab_testing"
                            ? "A/B Testing"
                            : "Tuning"}
                        </span>
                        <span className="text-gray-400 font-medium">
                          {totalEvaluations} de {evaluationGoal} avaliações
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Progresso</span>
                          <span className="font-bold text-gray-400">
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-gray-400 to-gray-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
