"use client";

import { Layout } from "@/components/layout";
import { AuthGuard, AdminGuard } from "@/components/auth-guard";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Playground } from "@/lib/types";
import Link from "next/link";

export default function AdminDashboard() {
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaygrounds();
  }, []);

  const fetchPlaygrounds = async () => {
    try {
      const response = await api.get("/admin/playgrounds");
      setPlaygrounds(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch playgrounds:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <AuthGuard>
        <Layout>
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Dashboard Admin</h1>
                <p className="text-gray-600 mt-2">
                  Gerenciar playgrounds e métricas
                </p>
              </div>
              <Link href="/admin/create-playground">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Novo Playground
                </button>
              </Link>
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
            ) : (
              <div className="space-y-4">
                {playgrounds.map((playground) => (
                  <Link
                    key={playground.id}
                    href={`/admin/playground/${playground.id}`}
                  >
                    <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold mb-2">
                            {playground.name}
                          </h2>
                          <p className="text-gray-600 mb-4">
                            {playground.description}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            playground.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {playground.is_active ? "Em Andamento" : "Finalizado"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <div className="text-sm text-gray-600">Tipo</div>
                          <div className="font-semibold">
                            {playground.type === "ab_testing"
                              ? "A/B Testing"
                              : "Tuning"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Avaliações
                          </div>
                          <div className="font-semibold">
                            {playground.counters?.reduce(
                              (sum, c) => sum + c.current_count,
                              0
                            ) || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Criado</div>
                          <div className="font-semibold">
                            {new Date(playground.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Layout>
      </AuthGuard>
    </AdminGuard>
  );
}
