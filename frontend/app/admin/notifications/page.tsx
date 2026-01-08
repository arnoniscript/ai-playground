"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { AdminGuard } from "@/components/auth-guard";
import api from "@/lib/api";
import { UserRole } from "@/lib/types";

interface Notification {
  id: string;
  type: "banner" | "modal" | "email";
  title: string;
  message: string;
  image_url: string | null;
  target_type: "all" | "role" | "specific";
  target_role: UserRole | null;
  target_user_ids: string[] | null;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  dismissed_by: string[];
}

interface DismissalMetrics {
  total_dismissals: number;
  dismissals: Array<{
    id: string;
    dismissed_at: string;
    user: {
      id: string;
      email: string;
      full_name: string | null;
      role: UserRole;
    };
  }>;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export default function NotificationsAdminPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [metrics, setMetrics] = useState<Record<string, DismissalMetrics>>({});
  const [showMetrics, setShowMetrics] = useState<Record<string, boolean>>({});
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    type: "banner" as "banner" | "modal" | "email",
    title: "",
    message: "",
    image_url: "",
    target_type: "all" as "all" | "role" | "specific",
    target_role: null as UserRole | null,
    target_user_ids: [] as string[],
    expires_at: "",
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications/admin/all");
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      alert("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setAvailableUsers(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchMetrics = async (notificationId: string) => {
    try {
      const response = await api.get(
        `/notifications/admin/${notificationId}/metrics`
      );
      setMetrics((prev) => ({
        ...prev,
        [notificationId]: response.data.data,
      }));
      setShowMetrics((prev) => ({
        ...prev,
        [notificationId]: true,
      }));
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      alert("Erro ao carregar métricas");
    }
  };

  const toggleMetrics = (notificationId: string) => {
    if (showMetrics[notificationId]) {
      setShowMetrics((prev) => ({
        ...prev,
        [notificationId]: false,
      }));
    } else {
      fetchMetrics(notificationId);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post("/notifications/admin", {
        ...form,
        image_url: form.image_url || null,
        target_user_ids:
          form.target_type === "specific" ? form.target_user_ids : null,
        expires_at: form.expires_at || null,
      });
      alert("Notificação criada com sucesso!");
      setShowCreateModal(false);
      resetForm();
      fetchNotifications();
    } catch (error: any) {
      console.error("Failed to create notification:", error);
      alert(error.response?.data?.error || "Erro ao criar notificação");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/notifications/admin/${id}`, {
        is_active: !currentStatus,
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to toggle notification:", error);
      alert("Erro ao atualizar notificação");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta notificação?")) return;

    try {
      await api.delete(`/notifications/admin/${id}`);
      alert("Notificação deletada!");
      fetchNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
      alert("Erro ao deletar notificação");
    }
  };

  const resetForm = () => {
    setForm({
      type: "banner",
      title: "",
      message: "",
      image_url: "",
      target_type: "all",
      target_role: null,
      target_user_ids: [],
      expires_at: "",
    });
    setSelectedUserIds([]);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  return (
    <AdminGuard>
      <Layout>
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🔔 Gerenciar Notificações
              </h1>
              <p className="text-gray-600 mt-1">
                Crie e gerencie notificações para usuários
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ Nova Notificação
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando notificações...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhuma notificação criada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`bg-white border rounded-lg p-6 ${
                    !notif.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            notif.type === "banner"
                              ? "bg-blue-100 text-blue-800"
                              : notif.type === "modal"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {notif.type.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            notif.target_type === "all"
                              ? "bg-gray-100 text-gray-800"
                              : notif.target_type === "role"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {notif.target_type === "all"
                            ? "TODOS"
                            : notif.target_type === "role"
                            ? `ROLE: ${notif.target_role?.toUpperCase()}`
                            : "ESPECÍFICO"}
                        </span>
                        {notif.is_active ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                            ATIVA
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                            INATIVA
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {notif.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {notif.message}
                      </p>
                      {notif.image_url && (
                        <p className="text-xs text-gray-500">
                          🖼️ Imagem: {notif.image_url}
                        </p>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        Criada em:{" "}
                        {new Date(notif.created_at).toLocaleString("pt-BR")}
                        {notif.expires_at && (
                          <>
                            {" | "}
                            Expira em:{" "}
                            {new Date(notif.expires_at).toLocaleString("pt-BR")}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Dispensada por: {notif.dismissed_by?.length || 0}{" "}
                        usuário(s)
                      </div>

                      {/* Metrics Section */}
                      <div className="mt-3">
                        <button
                          onClick={() => toggleMetrics(notif.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          📊 {showMetrics[notif.id] ? "Ocultar" : "Ver"}{" "}
                          Métricas e Dados
                        </button>

                        {showMetrics[notif.id] && metrics[notif.id] && (
                          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Total de dispensas:{" "}
                              {metrics[notif.id].total_dismissals}
                            </p>
                            {metrics[notif.id].total_dismissals > 0 && (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {metrics[notif.id].dismissals.map(
                                  (dismissal) => (
                                    <div
                                      key={dismissal.id}
                                      className="text-xs text-gray-600 flex justify-between items-center"
                                    >
                                      <span>
                                        <strong>
                                          {dismissal.user.full_name ||
                                            dismissal.user.email}
                                        </strong>{" "}
                                        ({dismissal.user.role})
                                      </span>
                                      <span className="text-gray-400">
                                        {new Date(
                                          dismissal.dismissed_at
                                        ).toLocaleString("pt-BR")}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() =>
                          handleToggleActive(notif.id, notif.is_active)
                        }
                        className={`px-3 py-1 text-sm rounded ${
                          notif.is_active
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : "bg-green-100 text-green-800 hover:bg-green-200"
                        }`}
                      >
                        {notif.is_active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  ➕ Nova Notificação
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          type: e.target.value as "banner" | "modal" | "email",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="banner">Banner (topo da página)</option>
                      <option value="modal">Modal (popup central)</option>
                      <option value="email">Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Ex: Manutenção Programada"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensagem *
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Descrição detalhada da notificação"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL da Imagem (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) =>
                        setForm({ ...form, image_url: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alvo *
                    </label>
                    <select
                      value={form.target_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          target_type: e.target.value as
                            | "all"
                            | "role"
                            | "specific",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">Todos os usuários</option>
                      <option value="role">Por role</option>
                      <option value="specific">Usuários específicos</option>
                    </select>
                  </div>

                  {form.target_type === "role" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        value={form.target_role || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            target_role: e.target.value as UserRole,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Selecione...</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="tester">Tester</option>
                        <option value="client">Client</option>
                        <option value="qa">QA</option>
                      </select>
                    </div>
                  )}

                  {form.target_type === "specific" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selecionar Usuários *
                      </label>
                      <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                        {availableUsers.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            Carregando usuários...
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {availableUsers.map((user) => (
                              <label
                                key={user.id}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.target_user_ids.includes(
                                    user.id
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setForm({
                                        ...form,
                                        target_user_ids: [
                                          ...form.target_user_ids,
                                          user.id,
                                        ],
                                      });
                                    } else {
                                      setForm({
                                        ...form,
                                        target_user_ids:
                                          form.target_user_ids.filter(
                                            (id) => id !== user.id
                                          ),
                                      });
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  {user.full_name || user.email}
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({user.role})
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {form.target_user_ids.length} usuário(s) selecionado(s)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Expiração (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={(e) =>
                        setForm({ ...form, expires_at: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreate}
                    disabled={
                      !form.title ||
                      !form.message ||
                      (form.target_type === "specific" &&
                        form.target_user_ids.length === 0)
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Criar Notificação
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
