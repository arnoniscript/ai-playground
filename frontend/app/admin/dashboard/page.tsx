"use client";

import { Layout } from "@/components/layout";
import { AuthGuard, AdminGuard } from "@/components/auth-guard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Playground } from "@/lib/types";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    fetchPlaygrounds();
    fetchPendingUsers();
  }, []);

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
      const response = await api.get("/admin/playgrounds");
      console.log("=== [ADMIN] PLAYGROUNDS RECEIVED ===");
      console.log("[ADMIN] Total playgrounds:", response.data.data?.length);
      response.data.data?.forEach((pg: any) => {
        console.log(`\n[ADMIN] Playground: ${pg.name}`);
        console.log(`[ADMIN] Type: ${pg.type}`);
        console.log(
          `[ADMIN] Has data_labeling_progress:`,
          !!pg.data_labeling_progress
        );
        if (pg.data_labeling_progress) {
          console.log("[ADMIN] Progress data:", pg.data_labeling_progress);
        }
        console.log(`[ADMIN] Has counters:`, !!pg.counters);
        if (pg.counters) {
          console.log("[ADMIN] Counters:", pg.counters);
        }
      });
      setPlaygrounds(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch playgrounds:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, playgroundId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setDuplicating(playgroundId);

      // Fetch full playground data
      const response = await api.get(`/admin/playgrounds/${playgroundId}`);
      const playgroundData = response.data.data;

      // Store in localStorage to pre-fill the create form
      localStorage.setItem(
        "duplicatePlayground",
        JSON.stringify(playgroundData)
      );

      // Redirect to create page
      router.push("/admin/create-playground?duplicate=true");
    } catch (error: any) {
      console.error("Failed to load playground for duplication:", error);
      alert(
        error.response?.data?.error || "Erro ao carregar dados do playground"
      );
    } finally {
      setDuplicating(null);
    }
  };

  return (
    <AdminGuard>
      <AuthGuard>
        <Layout>
          <div className="space-y-8">
            {/* Pending Users Notification */}
            {pendingUsersCount > 0 && (
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

            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Dashboard Admin</h1>
                <p className="text-gray-600 mt-2">
                  Gerenciar playgrounds e métricas
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/admin/users">
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    👥 Usuários
                  </button>
                </Link>
                <Link href="/admin/create-playground">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    + Novo Playground
                  </button>
                </Link>
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    Filtrar por status:
                  </span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setShowActive(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        showActive
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      🟢 Ativos
                    </button>
                    <button
                      onClick={() => setShowActive(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        !showActive
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      ⚫ Desativados
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {playgrounds.filter((p) => p.is_active === showActive).length}{" "}
                  playground(s)
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">Carregando playgrounds...</div>
            ) : playgrounds.length === 0 ? (
              <div className="bg-gray-50 p-12 rounded-lg text-center">
                <p className="text-gray-600 mb-4">
                  Você ainda não criou nenhum playground.
                </p>
                <Link href="/admin/create-playground">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Criar Primeiro Playground
                  </button>
                </Link>
              </div>
            ) : playgrounds.filter((p) => p.is_active === showActive).length ===
              0 ? (
              <div className="bg-gray-50 p-12 rounded-lg text-center">
                <p className="text-gray-600 mb-4">
                  Nenhum playground {showActive ? "ativo" : "desativado"}{" "}
                  encontrado.
                </p>
                {!showActive && (
                  <button
                    onClick={() => setShowActive(true)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Ver Playgrounds Ativos
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {playgrounds
                  .filter((p) => p.is_active === showActive)
                  .map((playground) => (
                    <div
                      key={playground.id}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden border border-gray-200"
                    >
                      <Link href={`/admin/playground/${playground.id}`}>
                        <div className="p-6 cursor-pointer">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">
                                  {playground.name}
                                </h2>
                                {playground.restricted_emails &&
                                  playground.restricted_emails.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                      🔒 Privado
                                    </span>
                                  )}
                              </div>
                              {playground.description && (
                                <p className="text-gray-600 text-base">
                                  {playground.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`ml-4 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                                playground.is_active
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-gray-100 text-gray-700 border border-gray-300"
                              }`}
                            >
                              {playground.is_active ? "🟢 Ativo" : "⚫ Inativo"}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500 mb-1">
                                Tipo
                              </span>
                              <span className="text-lg font-bold text-gray-900">
                                {playground.type === "ab_testing"
                                  ? "📊 A/B Testing"
                                  : playground.type === "data_labeling"
                                  ? "🏷️ Rotulação"
                                  : "🎯 Tuning"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500 mb-1">
                                Avaliações
                              </span>
                              <span className="text-lg font-bold text-blue-600">
                                {playground.type === "data_labeling" &&
                                playground.data_labeling_progress
                                  ? playground.data_labeling_progress
                                      .completed_evaluations
                                  : playground.counters?.reduce(
                                      (sum, c) => sum + c.current_count,
                                      0
                                    ) || 0}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-500 mb-1">
                                Progresso
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(() => {
                                        let total = 0;
                                        let goal =
                                          playground.evaluation_goal || 1;

                                        if (
                                          playground.type === "data_labeling" &&
                                          playground.data_labeling_progress
                                        ) {
                                          total =
                                            playground.data_labeling_progress
                                              .completed_evaluations;
                                          goal =
                                            playground.data_labeling_progress
                                              .expected_evaluations || goal;
                                        } else {
                                          total =
                                            playground.counters?.reduce(
                                              (sum, c) => sum + c.current_count,
                                              0
                                            ) || 0;
                                        }

                                        return Math.min(
                                          100,
                                          (total / goal) * 100
                                        );
                                      })()}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-bold text-gray-900 min-w-[45px]">
                                  {(() => {
                                    let total = 0;
                                    let goal = playground.evaluation_goal || 1;

                                    if (
                                      playground.type === "data_labeling" &&
                                      playground.data_labeling_progress
                                    ) {
                                      total =
                                        playground.data_labeling_progress
                                          .completed_evaluations;
                                      goal =
                                        playground.data_labeling_progress
                                          .expected_evaluations || goal;
                                    } else {
                                      total =
                                        playground.counters?.reduce(
                                          (sum, c) => sum + c.current_count,
                                          0
                                        ) || 0;
                                    }

                                    return Math.round((total / goal) * 100);
                                  })()}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Meta:</span>{" "}
                              {playground.evaluation_goal} avaliações •{" "}
                              <span className="font-medium">Criado em:</span>{" "}
                              {new Date(
                                playground.created_at
                              ).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      </Link>

                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                        <Link
                          href={`/admin/playground/${playground.id}/metrics`}
                          className="flex-1"
                        >
                          <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">
                            📈 Ver Métricas
                          </button>
                        </Link>

                        <button
                          onClick={(e) => handleDuplicate(e, playground.id)}
                          disabled={duplicating === playground.id}
                          className="flex-1 px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {duplicating === playground.id
                            ? "Duplicando..."
                            : "📋 Duplicar"}
                        </button>

                        <Link
                          href={`/admin/playground/${playground.id}`}
                          className="flex-1"
                        >
                          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                            ✏️ Editar
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Layout>
      </AuthGuard>
    </AdminGuard>
  );
}
