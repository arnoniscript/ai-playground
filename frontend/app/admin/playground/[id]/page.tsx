"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { Playground } from "@/lib/types";

export default function EditPlaygroundPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [playground, setPlayground] = useState<Playground | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchPlayground();
  }, [playgroundId]);

  const fetchPlayground = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/playgrounds/${playgroundId}`);
      setPlayground(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar playground");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      setError("");
      setSuccessMessage("");
      const newStatus = !playground?.is_active;
      await api.put(`/admin/playgrounds/${playgroundId}`, {
        is_active: newStatus,
      });
      setSuccessMessage(
        `Playground ${newStatus ? "ativado" : "desativado"} com sucesso!`
      );
      await fetchPlayground();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao atualizar status");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playground) return;

    try {
      setError("");
      setSuccessMessage("");
      const formData = new FormData(e.target as HTMLFormElement);

      await api.put(`/admin/playgrounds/${playgroundId}`, {
        name: formData.get("name"),
        description: formData.get("description") || undefined,
        support_text: formData.get("support_text") || undefined,
      });

      setSuccessMessage("Playground atualizado com sucesso!");
      await fetchPlayground();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao atualizar playground");
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Carregando...</p>
            </div>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  if (error && !playground) {
    return (
      <AdminGuard>
        <Layout>
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="mt-4 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Editar Playground</h1>
            <button
              onClick={() => router.push("/admin")}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Voltar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              {successMessage}
            </div>
          )}

          {playground && (
            <>
              {/* Status Card */}
              <div className="bg-white border rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Status</h2>
                    <p className="text-sm text-gray-600">
                      {playground.is_active
                        ? "Playground ativo"
                        : "Playground inativo"}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    className={`px-4 py-2 rounded ${
                      playground.is_active
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {playground.is_active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-white border rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Informações</h2>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-gray-600">ID</dt>
                    <dd className="mt-1 font-mono text-xs">{playground.id}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">Tipo</dt>
                    <dd className="mt-1">
                      {playground.type === "ab_testing"
                        ? "Teste A/B"
                        : "Ajuste (Tuning)"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">Criado em</dt>
                    <dd className="mt-1">
                      {new Date(playground.created_at).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Edit Form */}
              <form
                onSubmit={handleUpdate}
                className="bg-white border rounded-lg p-6 mb-6"
              >
                <h2 className="text-lg font-semibold mb-4">Editar Detalhes</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nome do Playground *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={playground.name}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Descrição
                    </label>
                    <textarea
                      name="description"
                      defaultValue={playground.description || ""}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Texto de Suporte
                    </label>
                    <textarea
                      name="support_text"
                      defaultValue={playground.support_text || ""}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>

              {/* Quick Actions */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Ações</h2>
                <div className="space-y-3">
                  <button
                    onClick={() =>
                      router.push(`/admin/playground/${playgroundId}/metrics`)
                    }
                    className="w-full px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
                  >
                    📊 Ver Métricas e Resultados
                  </button>

                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/playground/${playgroundId}`;
                      navigator.clipboard.writeText(link);
                      setSuccessMessage(
                        "Link copiado para a área de transferência!"
                      );
                      setTimeout(() => setSuccessMessage(""), 3000);
                    }}
                    className="w-full px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
                  >
                    🔗 Copiar Link do Playground
                  </button>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <p className="text-sm font-medium mb-2">
                    Link para Avaliadores:
                  </p>
                  <code className="text-xs bg-white p-2 rounded block overflow-x-auto">
                    {window.location.origin}/playground/{playgroundId}
                  </code>
                </div>
              </div>
            </>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
