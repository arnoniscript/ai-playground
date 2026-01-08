"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/layout";
import { AdminGuard } from "@/components/auth-guard";
import api from "@/lib/api";
import { User, UserRole, UserStatus } from "@/lib/types";

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showQADetailsModal, setShowQADetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [qaDetails, setQADetails] = useState<any>(null);

  // Form states
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "tester" as UserRole,
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    role: "tester" as UserRole,
  });
  const [blockReason, setBlockReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [deleteUser, setDeleteUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/users");
      setUsers(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/admin/users/${selectedUser.id}`, editForm);
      alert("Usuário atualizado com sucesso!");
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update user:", error);
      alert(error.response?.data?.error || "Erro ao atualizar usuário");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (
      !confirm(
        `Tem certeza que deseja DELETAR permanentemente o usuário ${
          selectedUser.full_name || selectedUser.email
        }? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      alert("Usuário deletado com sucesso!");
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      alert(error.response?.data?.error || "Erro ao deletar usuário");
    }
  };

  const handleInviteUser = async () => {
    try {
      await api.post("/admin/users/invite", inviteForm);
      alert("Convite enviado com sucesso!");
      setShowInviteModal(false);
      setInviteForm({ email: "", full_name: "", role: "tester" });
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to invite user:", error);
      alert(error.response?.data?.error || "Erro ao convidar usuário");
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/admin/users/${selectedUser.id}/block`, {
        reason: blockReason || undefined,
      });
      alert("Usuário bloqueado com sucesso!");
      setShowBlockModal(false);
      setBlockReason("");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to block user:", error);
      alert(error.response?.data?.error || "Erro ao bloquear usuário");
    }
  };

  const handleUnblockUser = async (user: User) => {
    if (!confirm(`Desbloquear usuário ${user.email}?`)) return;

    try {
      await api.put(`/admin/users/${user.id}/unblock`);
      alert("Usuário desbloqueado com sucesso!");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to unblock user:", error);
      alert(error.response?.data?.error || "Erro ao desbloquear usuário");
    }
  };

  const handleResendInvite = async (user: User) => {
    try {
      await api.post(`/admin/users/${user.id}/resend-invite`);
      alert("Convite reenviado com sucesso!");
    } catch (error: any) {
      console.error("Failed to resend invite:", error);
      alert(error.response?.data?.error || "Erro ao reenviar convite");
    }
  };

  const handleCancelInvite = async (user: User) => {
    if (
      !confirm(`Cancelar convite para ${user.email}? O usuário será removido.`)
    )
      return;

    try {
      await api.delete(`/admin/users/${user.id}/cancel-invite`);
      alert("Convite cancelado com sucesso!");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to cancel invite:", error);
      alert(error.response?.data?.error || "Erro ao cancelar convite");
    }
  };

  const handleCopyInviteLink = (user: User) => {
    const frontendUrl = window.location.origin;
    const inviteLink = `${frontendUrl}/login?email=${encodeURIComponent(
      user.email
    )}`;

    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        alert("Link copiado para a área de transferência!");
      })
      .catch(() => {
        alert("Erro ao copiar link. Tente novamente.");
      });
  };

  const handleViewQADetails = async (user: User) => {
    try {
      const response = await api.get(`/admin/users/${user.id}/qa-details`);
      console.log("QA Details received:", response.data.data);
      console.log("Document URL:", response.data.data.document_photo_url);
      console.log("Selfie URL:", response.data.data.selfie_photo_url);
      setQADetails(response.data.data);
      setSelectedUser(user);
      setShowQADetailsModal(true);
    } catch (error: any) {
      console.error("Failed to fetch QA details:", error);
      alert(error.response?.data?.error || "Erro ao carregar detalhes do QA");
    }
  };

  const handleApproveQA = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/admin/users/${selectedUser.id}/approve-qa`);
      alert("QA aprovado com sucesso!");
      setShowApproveModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to approve QA:", error);
      alert(error.response?.data?.error || "Erro ao aprovar QA");
    }
  };

  const handleRejectQA = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/admin/users/${selectedUser.id}/reject-qa`, {
        reason: rejectReason || undefined,
        deleteUser: deleteUser,
      });
      alert(
        deleteUser ? "QA deletado com sucesso!" : "QA recusado com sucesso!"
      );
      setShowRejectModal(false);
      setRejectReason("");
      setDeleteUser(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to reject QA:", error);
      alert(error.response?.data?.error || "Erro ao recusar QA");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      role: user.role,
    });
    setShowEditModal(true);
  };

  const openBlockModal = (user: User) => {
    setSelectedUser(user);
    setBlockReason("");
    setShowBlockModal(true);
  };

  const openApproveModal = (user: User) => {
    setSelectedUser(user);
    setShowApproveModal(true);
  };

  const openRejectModal = (user: User) => {
    setSelectedUser(user);
    setRejectReason("");
    setShowRejectModal(true);
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: UserStatus) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      pending_invite: "bg-yellow-100 text-yellow-800",
      blocked: "bg-red-100 text-red-800",
      pending_approval: "bg-blue-100 text-blue-800",
    };
    const labels = {
      active: "Ativo",
      pending_invite: "Convite Pendente",
      blocked: "Bloqueado",
      pending_approval: "Aguardando Aprovação",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const getRoleBadge = (role: UserRole) => {
    const badges = {
      admin: "bg-purple-100 text-purple-800",
      tester: "bg-blue-100 text-blue-800",
      client: "bg-gray-100 text-gray-800",
      qa: "bg-indigo-100 text-indigo-800",
      manager: "bg-pink-100 text-pink-800",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badges[role]}`}>
        {role}
      </span>
    );
  };

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
                  Gerenciamento de Usuários
                </h1>
                <p className="text-gray-600 mt-1">
                  Visualize, edite e gerencie todos os usuários da plataforma
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  + Convidar Usuário
                </button>
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as UserRole | "all")
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="tester">Tester</option>
                <option value="client">Client</option>
                <option value="qa">QA</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as UserStatus | "all")
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="pending_invite">Convite Pendente</option>
                <option value="pending_approval">Aguardando Aprovação</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || "—"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {user.status === "pending_invite" ? (
                              <>
                                <button
                                  onClick={() => handleResendInvite(user)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Reenviar email de convite"
                                >
                                  📧 Reenviar
                                </button>
                                <button
                                  onClick={() => handleCopyInviteLink(user)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Copiar link de convite"
                                >
                                  🔗 Copiar Link
                                </button>
                                <button
                                  onClick={() => handleCancelInvite(user)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Cancelar convite"
                                >
                                  ❌ Cancelar
                                </button>
                              </>
                            ) : user.role === "qa" &&
                              user.status === "pending_approval" ? (
                              <>
                                <button
                                  onClick={() => handleViewQADetails(user)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Ver detalhes do cadastro"
                                >
                                  👁️ Ver Detalhes
                                </button>
                                <button
                                  onClick={() => openApproveModal(user)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Aprovar QA"
                                >
                                  ✅ Aprovar
                                </button>
                                <button
                                  onClick={() => openRejectModal(user)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Recusar QA"
                                >
                                  ❌ Recusar
                                </button>
                              </>
                            ) : (
                              <>
                                {user.role === "qa" && (
                                  <button
                                    onClick={() => handleViewQADetails(user)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Ver detalhes do QA"
                                  >
                                    👁️ Detalhes
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Editar
                                </button>
                                {user.status === "blocked" ? (
                                  <button
                                    onClick={() => handleUnblockUser(user)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Desbloquear
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openBlockModal(user)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Bloquear
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-sm text-gray-500 text-center">
            Mostrando {filteredUsers.length} de {users.length} usuários
          </div>
        </div>

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Editar Usuário
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (não editável)
                  </label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as UserRole,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="tester">Tester</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleEditUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>

              {/* Delete button for blocked QAs */}
              {selectedUser.role === "qa" &&
                selectedUser.status === "blocked" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleDeleteUser}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      🗑️ Deletar Usuário Permanentemente
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      ⚠️ Esta ação permitirá que o email se cadastre novamente
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Convidar Novo Usuário
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="usuario@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo (opcional)
                  </label>
                  <input
                    type="text"
                    value={inviteForm.full_name}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        role: e.target.value as UserRole,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tester">Tester</option>
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                  <p>
                    ℹ️ O usuário receberá um email de convite para completar o
                    cadastro.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleInviteUser}
                  disabled={!inviteForm.email}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar Convite
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block User Modal */}
        {showBlockModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-red-600 mb-4">
                ⚠️ Bloquear Usuário
              </h2>

              <p className="text-gray-700 mb-4">
                Você está prestes a bloquear o usuário{" "}
                <strong>{selectedUser.email}</strong>. Este usuário não poderá
                mais acessar a plataforma.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo do Bloqueio (opcional)
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ex: Violação de termos de uso, comportamento inadequado, etc."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBlockUser}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Confirmar Bloqueio
                </button>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QA Details Modal */}
        {showQADetailsModal && qaDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                📋 Detalhes do Cadastro QA
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                    Informações Pessoais
                  </h3>
                  <div>
                    <span className="text-sm text-gray-600">Nome:</span>
                    <p className="font-medium">{qaDetails.full_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium">{qaDetails.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      Data de Nascimento:
                    </span>
                    <p className="font-medium">
                      {qaDetails.birth_date
                        ? new Date(qaDetails.birth_date).toLocaleDateString(
                            "pt-BR"
                          )
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Gênero:</span>
                    <p className="font-medium">{qaDetails.gender || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      Nacionalidade:
                    </span>
                    <p className="font-medium">
                      {qaDetails.nationality || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Telefone:</span>
                    <p className="font-medium">{qaDetails.phone || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      Idioma Principal:
                    </span>
                    <p className="font-medium">
                      {qaDetails.primary_language || "—"}
                    </p>
                  </div>
                  {qaDetails.secondary_languages &&
                    qaDetails.secondary_languages.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">
                          Idiomas Secundários:
                        </span>
                        <p className="font-medium">
                          {qaDetails.secondary_languages.join(", ")}
                        </p>
                      </div>
                    )}
                </div>

                {/* Document Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                    Documentação
                  </h3>
                  <div>
                    <span className="text-sm text-gray-600">
                      Número do Documento:
                    </span>
                    <p className="font-medium">
                      {qaDetails.document_number || "—"}
                    </p>
                  </div>
                  {qaDetails.document_photo_url && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-2">
                        Foto do Documento:
                      </span>
                      {qaDetails.document_photo_url.includes(
                        "application/pdf"
                      ) || qaDetails.document_photo_url.endsWith(".pdf") ? (
                        <div className="space-y-2">
                          <iframe
                            src={qaDetails.document_photo_url}
                            className="w-full h-96 rounded border border-gray-300"
                            title="Document PDF"
                          />
                          <a
                            href={qaDetails.document_photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            📄 Abrir PDF em nova aba
                          </a>
                        </div>
                      ) : (
                        <>
                          <img
                            src={qaDetails.document_photo_url}
                            alt="Documento"
                            className="max-w-full h-auto rounded border border-gray-300 cursor-pointer hover:opacity-90"
                            onClick={() =>
                              window.open(
                                qaDetails.document_photo_url,
                                "_blank"
                              )
                            }
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                const errorMsg = document.createElement("p");
                                errorMsg.className = "text-red-600 text-sm";
                                errorMsg.textContent =
                                  "⚠️ Erro ao carregar imagem";
                                parent.appendChild(errorMsg);
                                const link = document.createElement("a");
                                link.href = qaDetails.document_photo_url;
                                link.target = "_blank";
                                link.className =
                                  "text-blue-600 hover:text-blue-800 text-sm block mt-2";
                                link.textContent = "🔗 Abrir URL diretamente";
                                parent.appendChild(link);
                              }
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}
                  {qaDetails.selfie_photo_url && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-2">
                        Selfie:
                      </span>
                      <img
                        src={qaDetails.selfie_photo_url}
                        alt="Selfie"
                        className="max-w-xs h-auto rounded border border-gray-300 cursor-pointer hover:opacity-90"
                        onClick={() =>
                          window.open(qaDetails.selfie_photo_url, "_blank")
                        }
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const errorMsg = document.createElement("p");
                            errorMsg.className = "text-red-600 text-sm";
                            errorMsg.textContent = "⚠️ Erro ao carregar imagem";
                            parent.appendChild(errorMsg);
                            const link = document.createElement("a");
                            link.href = qaDetails.selfie_photo_url;
                            link.target = "_blank";
                            link.className =
                              "text-blue-600 hover:text-blue-800 text-sm block mt-2";
                            link.textContent = "🔗 Abrir URL diretamente";
                            parent.appendChild(link);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Location & IP */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                    Localização
                  </h3>
                  {qaDetails.geolocation && (
                    <div>
                      <span className="text-sm text-gray-600">
                        Coordenadas:
                      </span>
                      <p className="font-medium">
                        Lat: {qaDetails.geolocation.latitude}, Lng:{" "}
                        {qaDetails.geolocation.longitude}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-600">
                      IP de Registro:
                    </span>
                    <p className="font-medium">{qaDetails.ip_address || "—"}</p>
                  </div>
                </div>

                {/* Education */}
                {qaDetails.education && qaDetails.education.length > 0 && (
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                      Formação Acadêmica
                    </h3>
                    {qaDetails.education.map((edu: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-4 rounded border border-gray-200"
                      >
                        <p className="font-medium">
                          {edu.degree_level} - {edu.field_of_study}
                        </p>
                        <p className="text-sm text-gray-600">
                          {edu.institution}
                        </p>
                        <p className="text-sm text-gray-600">{edu.years}</p>
                        {edu.description && (
                          <p className="text-sm text-gray-700 mt-2">
                            {edu.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status Info */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                    Status do Cadastro
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">
                        Cadastrado em:
                      </span>
                      <p className="font-medium">
                        {new Date(qaDetails.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {qaDetails.terms_accepted_at && (
                      <div>
                        <span className="text-sm text-gray-600">
                          Termos aceitos em:
                        </span>
                        <p className="font-medium">
                          {new Date(qaDetails.terms_accepted_at).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    )}
                    {qaDetails.approved_at && (
                      <div>
                        <span className="text-sm text-gray-600">
                          Aprovado em:
                        </span>
                        <p className="font-medium">
                          {new Date(qaDetails.approved_at).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    )}
                    {qaDetails.rejected_at && (
                      <div>
                        <span className="text-sm text-gray-600">
                          Recusado em:
                        </span>
                        <p className="font-medium">
                          {new Date(qaDetails.rejected_at).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    )}
                    {qaDetails.rejection_reason && (
                      <div className="col-span-2">
                        <span className="text-sm text-gray-600">
                          Motivo da recusa:
                        </span>
                        <p className="font-medium text-red-600">
                          {qaDetails.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                {qaDetails.status === "pending_approval" && (
                  <>
                    <button
                      onClick={() => {
                        setShowQADetailsModal(false);
                        openApproveModal(selectedUser!);
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      ✅ Aprovar
                    </button>
                    <button
                      onClick={() => {
                        setShowQADetailsModal(false);
                        openRejectModal(selectedUser!);
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      ❌ Recusar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowQADetailsModal(false)}
                  className="ml-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approve QA Modal */}
        {showApproveModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-green-600 mb-4">
                ✅ Aprovar QA
              </h2>

              <p className="text-gray-700 mb-4">
                Você está prestes a aprovar o cadastro de{" "}
                <strong>{selectedUser.full_name || selectedUser.email}</strong>{" "}
                como QA. O usuário receberá um email de confirmação e poderá
                fazer login na plataforma.
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleApproveQA}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Confirmar Aprovação
                </button>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject QA Modal */}
        {showRejectModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-red-600 mb-4">
                ❌ Recusar Cadastro QA
              </h2>

              <p className="text-gray-700 mb-4">
                Você está prestes a recusar o cadastro de{" "}
                <strong>{selectedUser.full_name || selectedUser.email}</strong>.
                O usuário receberá um email informando sobre a recusa.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo da Recusa (opcional, mas recomendado)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ex: Documentação incompleta, requisitos não atendidos, etc."
                  />
                </div>

                <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <input
                    type="checkbox"
                    id="deleteUserCheckbox"
                    checked={deleteUser}
                    onChange={(e) => setDeleteUser(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <div>
                    <label
                      htmlFor="deleteUserCheckbox"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Deletar usuário do sistema
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      ⚠️ Se marcado, o usuário será completamente removido do
                      banco de dados e poderá se cadastrar novamente. Se não
                      marcado, o cadastro será apenas bloqueado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRejectQA}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Confirmar Recusa
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AdminGuard>
  );
}
