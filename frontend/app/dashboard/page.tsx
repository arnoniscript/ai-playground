"use client";

import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Playground } from "@/lib/types";
import Link from "next/link";

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

                return (
                  <Link
                    key={playground.id}
                    href={`/playground/${playground.id}`}
                  >
                    <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition">
                      <h2 className="text-xl font-bold mb-2">
                        {playground.name}
                      </h2>
                      {playground.description && (
                        <p className="text-gray-600 mb-4">
                          {playground.description}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-sm mb-3">
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
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
