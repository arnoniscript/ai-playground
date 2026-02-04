"use client";

import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Playground } from "@/lib/types";
import Link from "next/link";
import QADashboardEarnings from "@/components/qa-dashboard-earnings";
import Image from "next/image";

export default function TesterDashboard() {
  const { user, setUser } = useAuthStore();
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [slackChecking, setSlackChecking] = useState(false);

  useEffect(() => {
    fetchPlaygrounds();
    if (user?.role === "admin") {
      fetchPendingUsers();
    }
  }, [user]);

  const slackWorkspaceUrl = "https://aimarisaplayground.slack.com";
  const slackLogoSrc = "/assets/slack-new-logo-icon-11609376883z32jbkf8kg.png";

  const refreshSlackStatus = async () => {
    if (!user) return;
    try {
      setSlackChecking(true);
      const response = await api.post("/users/slack/refresh");
      const { connected, last_checked_at } = response.data.data || {};

      if (typeof connected === "boolean") {
        setUser({
          ...user,
          slack_connected: connected,
          slack_checked_at: last_checked_at || null,
        });
      }
    } catch (error) {
      console.error("Failed to refresh Slack status:", error);
      alert(
        "Não pude confirmar que você está no slack, se tiver certeza que entrou, tente novamente em alguns minutos."
      );
    } finally {
      setSlackChecking(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await api.get("/admin/pending-users-count");
      setPendingUsersCount(response.data.data.count || 0);
    } catch (error) {
      console.error("Failed to fetch pending users count:", error);
    }
  };

  const fetchPlaygrounds = async () => {
    try {
      const response = await api.get("/playgrounds");
      console.log("=== PLAYGROUNDS RECEIVED ===");
      console.log("Total playgrounds:", response.data.data?.length);
      response.data.data?.forEach((pg: any) => {
        console.log(`\nPlayground: ${pg.name}`);
        console.log(`Type: ${pg.type}`);
        console.log(`Has data_labeling_progress:`, !!pg.data_labeling_progress);
        if (pg.data_labeling_progress) {
          console.log("Progress data:", pg.data_labeling_progress);
        }
        console.log(`Has counters:`, !!pg.counters);
        if (pg.counters) {
          console.log("Counters:", pg.counters);
        }
      });
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

          {user &&
            (user.slack_connected ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-white border border-green-200 rounded-full w-14 h-14 flex items-center justify-center shadow">
                    <Image
                      src={slackLogoSrc}
                      alt="Logo do Slack"
                      width={40}
                      height={40}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">
                      Conectado ao Slack
                    </h3>
                    <p className="text-sm text-green-800/80">
                      Agora você recebe atualizações em tempo real sobre novos
                      projetos e oportunidades.
                    </p>
                  </div>
                </div>
                <a
                  href={slackWorkspaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors"
                >
                  Abrir workspace do Slack
                </a>
              </div>
            ) : (
              <div className="bg-white border border-blue-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl w-16 h-16 flex items-center justify-center shadow">
                    <Image
                      src={slackLogoSrc}
                      alt="Logo do Slack"
                      width={46}
                      height={46}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Entre no Slack para não perder nada
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Fique por dentro dos novos playgrounds, tire dúvidas com o
                      time em tempo real e receba oportunidades direcionadas.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href={slackWorkspaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow hover:from-blue-700 hover:to-purple-700 transition-colors"
                  >
                    Entrar no Slack
                  </a>
                  <button
                    onClick={refreshSlackStatus}
                    disabled={slackChecking}
                    className="flex-1 px-5 py-3 border border-blue-200 rounded-lg text-blue-700 font-medium hover:bg-blue-50 disabled:opacity-60"
                  >
                    {slackChecking ? "Verificando..." : "Já entrei"}
                  </button>
                </div>
              </div>
            ))}

          {/* Pending Users Notification - Admin Only */}
          {user?.role === "admin" && pendingUsersCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-500 rounded-lg shadow-md">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                    {pendingUsersCount}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {pendingUsersCount === 1
                        ? "Novo usuário aguardando aprovação"
                        : `${pendingUsersCount} usuários aguardando aprovação`}
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {pendingUsersCount === 1
                        ? "Há um usuário que precisa ser aprovado ou reprovado"
                        : "Há usuários que precisam ser aprovados ou reprovados"}
                    </p>
                  </div>
                </div>
                <Link href="/admin/users?filter=pending">
                  <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors shadow-sm flex items-center gap-2">
                    <span>👥</span>
                    <span>Ver Usuários Pendentes</span>
                    <span>→</span>
                  </button>
                </Link>
              </div>
            </div>
          )}

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
                // Calculate progress based on playground type
                let totalEvaluations = 0;
                let evaluationGoal = playground.evaluation_goal || 100;

                if (
                  playground.type === "data_labeling" &&
                  playground.data_labeling_progress
                ) {
                  // For data labeling, use completed evaluations vs expected evaluations
                  totalEvaluations =
                    playground.data_labeling_progress.completed_evaluations;
                  evaluationGoal =
                    playground.data_labeling_progress.expected_evaluations ||
                    evaluationGoal;

                  console.log(
                    `Data Labeling Progress for ${playground.name}:`,
                    {
                      totalEvaluations,
                      evaluationGoal,
                      progress: playground.data_labeling_progress,
                    }
                  );
                } else {
                  // For AB testing and tuning, use model counters
                  totalEvaluations =
                    playground.counters?.reduce(
                      (sum, c) => sum + c.current_count,
                      0
                    ) || 0;
                }

                const progressPercentage =
                  evaluationGoal > 0
                    ? Math.min(
                        100,
                        Math.round((totalEvaluations / evaluationGoal) * 100)
                      )
                    : 0;

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
                    href={
                      playground.type === "data_labeling"
                        ? `/playground/${playground.id}/data-labeling`
                        : `/playground/${playground.id}`
                    }
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
                              : playground.type === "data_labeling"
                              ? "Rotulação"
                              : "Tuning"}
                          </span>
                          <span className="text-gray-600 font-medium">
                            {playground.type === "data_labeling" &&
                            playground.has_returned_tasks ? (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                Últimas tasks
                              </span>
                            ) : (
                              `${totalEvaluations} de ${evaluationGoal} avaliações`
                            )}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Progresso</span>
                            <span
                              className={`font-bold ${
                                playground.type === "data_labeling" &&
                                playground.has_returned_tasks
                                  ? "text-amber-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {progressPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                                playground.type === "data_labeling" &&
                                playground.has_returned_tasks
                                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 animate-pulse"
                                  : "bg-gradient-to-r from-blue-500 to-blue-600"
                              }`}
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
