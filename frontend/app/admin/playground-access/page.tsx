"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/layout";
import { AdminGuard } from "@/components/auth-guard";
import { PlaygroundAccessManager } from "@/components/playground-access-manager";
import api from "@/lib/api";
import { Playground } from "@/lib/types";

export default function PlaygroundAccessControlPage() {
  const router = useRouter();
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [selectedPlayground, setSelectedPlayground] =
    useState<Playground | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPlaygrounds();
  }, []);

  const fetchPlaygrounds = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/playgrounds");
      setPlaygrounds(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch playgrounds:", error);
      alert("Erro ao carregar playgrounds");
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaygrounds = playgrounds.filter((pg) =>
    pg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminGuard>
        <Layout>
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Controle de Acesso aos Playgrounds
                </h1>
                <p className="text-gray-600 mt-1">
                  Gerencie quais usuários podem acessar cada playground
                </p>
              </div>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                ← Voltar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Playground List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Playgrounds
                  </h2>
                  <input
                    type="text"
                    placeholder="Buscar playground..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {filteredPlaygrounds.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      {searchTerm
                        ? "Nenhum playground encontrado"
                        : "Nenhum playground criado"}
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredPlaygrounds.map((pg) => (
                        <button
                          key={pg.id}
                          onClick={() => setSelectedPlayground(pg)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            selectedPlayground?.id === pg.id
                              ? "bg-blue-50 border-l-4 border-blue-600"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {pg.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  {pg.type}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    pg.access_control_type === "open"
                                      ? "bg-green-100 text-green-800"
                                      : pg.access_control_type ===
                                        "email_restricted"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {pg.access_control_type === "open"
                                    ? "Aberto"
                                    : pg.access_control_type ===
                                      "email_restricted"
                                    ? "Email restrito"
                                    : "Autorização explícita"}
                                </span>
                              </div>
                            </div>
                            {!pg.is_active && (
                              <span className="text-xs text-red-600 font-medium">
                                Inativo
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Access Manager */}
            <div className="lg:col-span-2">
              {selectedPlayground ? (
                <PlaygroundAccessManager
                  playgroundId={selectedPlayground.id}
                  playgroundName={selectedPlayground.name}
                  accessControlType={selectedPlayground.access_control_type}
                  onAccessControlChange={fetchPlaygrounds}
                />
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="mx-auto h-16 w-16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Selecione um Playground
                  </h3>
                  <p className="text-gray-600">
                    Escolha um playground da lista ao lado para gerenciar o
                    controle de acesso
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
