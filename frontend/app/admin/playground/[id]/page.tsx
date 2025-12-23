"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/auth-guard";
import { Layout } from "@/components/layout";
import api from "@/lib/api";
import { Playground } from "@/lib/types";

interface AvailableUser {
  id: string;
  email: string;
  role: "admin" | "tester";
}

export default function EditPlaygroundPage() {
  const params = useParams();
  const router = useRouter();
  const playgroundId = params.id as string;

  const [playground, setPlayground] = useState<Playground | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);

  useEffect(() => {
    fetchPlayground();
    fetchAvailableUsers();
  }, [playgroundId]);

  const fetchPlayground = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/playgrounds/${playgroundId}`);
      const pg = response.data.data;
      setPlayground(pg);

      // Set private mode and selected emails from existing playground
      const hasRestrictions =
        pg.restricted_emails && pg.restricted_emails.length > 0;
      setIsPrivate(hasRestrictions);
      setSelectedEmails(hasRestrictions ? pg.restricted_emails : []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar playground");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setAvailableUsers(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
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
        restricted_emails: isPrivate ? selectedEmails : null,
      });

      setSuccessMessage("Playground atualizado com sucesso!");
      await fetchPlayground();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao atualizar playground");
    }
  };

  const handleTogglePrivate = (checked: boolean) => {
    setIsPrivate(checked);
    if (!checked) {
      setSelectedEmails([]);
    }
  };

  const handleToggleUserEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
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
                    <dt className="font-medium text-gray-600">Acesso</dt>
                    <dd className="mt-1">
                      {playground.restricted_emails &&
                      playground.restricted_emails.length > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                            🔒 Privado
                          </span>
                          <div className="text-xs text-gray-600 mt-2">
                            {playground.restricted_emails.length} usuário(s) com
                            acesso
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          🌐 Público
                        </span>
                      )}
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

                  {/* Access Control Section */}
                  <div className="pt-4 border-t">
                    <h3 className="text-md font-semibold mb-3">
                      Controle de Acesso
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="isPrivate"
                          checked={isPrivate}
                          onChange={(e) =>
                            handleTogglePrivate(e.target.checked)
                          }
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor="isPrivate"
                            className="font-medium cursor-pointer"
                          >
                            🔒 Playground Privado
                          </label>
                          <p className="text-sm text-gray-600 mt-1">
                            {isPrivate
                              ? "Apenas usuários selecionados poderão acessar este playground"
                              : "Todos os usuários autenticados podem acessar este playground"}
                          </p>
                        </div>
                      </div>

                      {isPrivate && (
                        <div className="pl-7">
                          <label className="block text-sm font-medium mb-2">
                            Usuários com Acesso ({selectedEmails.length}{" "}
                            selecionado{selectedEmails.length !== 1 ? "s" : ""})
                          </label>
                          <div className="border rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                            {availableUsers.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                Carregando usuários...
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {availableUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center space-x-2"
                                  >
                                    <input
                                      type="checkbox"
                                      id={`user-${user.id}`}
                                      checked={selectedEmails.includes(
                                        user.email
                                      )}
                                      onChange={() =>
                                        handleToggleUserEmail(user.email)
                                      }
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label
                                      htmlFor={`user-${user.id}`}
                                      className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                                    >
                                      <span>{user.email}</span>
                                      {user.role === "admin" && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                          Admin
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {selectedEmails.length === 0 && (
                            <p className="text-xs text-amber-600 mt-2">
                              ⚠️ Nenhum usuário selecionado. Apenas você
                              (criador) e outros admins terão acesso.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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
