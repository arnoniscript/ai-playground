"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { PlaygroundAuthorizedUser, User, AccessControlType } from "@/lib/types";

interface PlaygroundAccessManagerProps {
  playgroundId: string;
  playgroundName: string;
  accessControlType: AccessControlType;
  onAccessControlChange?: () => void;
}

export function PlaygroundAccessManager({
  playgroundId,
  playgroundName,
  accessControlType: initialAccessControlType,
  onAccessControlChange,
}: PlaygroundAccessManagerProps) {
  const [authorizedUsers, setAuthorizedUsers] = useState<
    PlaygroundAuthorizedUser[]
  >([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [accessControlType, setAccessControlType] = useState<AccessControlType>(
    initialAccessControlType
  );
  const [savingAccessControl, setSavingAccessControl] = useState(false);

  useEffect(() => {
    fetchData();
  }, [playgroundId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch authorized users
      const authResponse = await api.get(
        `/admin/playgrounds/${playgroundId}/authorized-users`
      );
      setAuthorizedUsers(authResponse.data.data.authorized_users || []);
      setAccessControlType(
        authResponse.data.data.playground.access_control_type
      );

      // Fetch all users
      const usersResponse = await api.get("/admin/users");
      setAllUsers(usersResponse.data.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) {
      alert("Selecione um usuário");
      return;
    }

    try {
      await api.post(`/admin/playgrounds/${playgroundId}/authorized-users`, {
        user_id: selectedUserId,
        notes: notes || undefined,
      });

      alert("Usuário autorizado com sucesso!");
      setSelectedUserId("");
      setNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Failed to authorize user:", error);
      alert(error.response?.data?.error || "Erro ao autorizar usuário");
    }
  };

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Remover acesso de ${userEmail}?`)) {
      return;
    }

    try {
      await api.delete(
        `/admin/playgrounds/${playgroundId}/authorized-users/${userId}`
      );
      alert("Autorização removida com sucesso!");
      fetchData();
    } catch (error: any) {
      console.error("Failed to remove authorization:", error);
      alert(error.response?.data?.error || "Erro ao remover autorização");
    }
  };

  const handleAccessControlChange = async (newType: AccessControlType) => {
    if (!confirm(`Alterar modo de controle de acesso para "${newType}"?`)) {
      return;
    }

    try {
      setSavingAccessControl(true);
      await api.put(`/admin/playgrounds/${playgroundId}/access-control`, {
        access_control_type: newType,
      });

      setAccessControlType(newType);
      alert("Controle de acesso atualizado com sucesso!");

      if (onAccessControlChange) {
        onAccessControlChange();
      }
    } catch (error: any) {
      console.error("Failed to update access control:", error);
      alert(
        error.response?.data?.error || "Erro ao atualizar controle de acesso"
      );
    } finally {
      setSavingAccessControl(false);
    }
  };

  // Filter out already authorized users
  const availableUsers = allUsers.filter(
    (user) => !authorizedUsers.some((auth) => auth.user?.id === user.id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-900">Controle de Acesso</h2>
        <p className="text-sm text-gray-600 mt-1">
          Playground: {playgroundName}
        </p>
      </div>

      {/* Access Control Type Selector */}
      <div className="p-6 border-b bg-gray-50">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Modo de Controle de Acesso
        </label>
        <select
          value={accessControlType}
          onChange={(e) =>
            handleAccessControlChange(e.target.value as AccessControlType)
          }
          disabled={savingAccessControl}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="open">Aberto (todos os usuários autenticados)</option>
          <option value="email_restricted">
            Restrito por Email (lista de emails)
          </option>
          <option value="explicit_authorization">
            Autorização Explícita (lista abaixo)
          </option>
        </select>

        <div className="mt-3 text-sm text-gray-600">
          {accessControlType === "open" && (
            <p>
              ℹ️ Todos os usuários autenticados podem acessar (exceto clients,
              que sempre precisam de autorização explícita)
            </p>
          )}
          {accessControlType === "email_restricted" && (
            <p>
              ℹ️ Apenas usuários com emails na lista "restricted_emails" podem
              acessar (configurado na edição do playground)
            </p>
          )}
          {accessControlType === "explicit_authorization" && (
            <p>
              ℹ️ Apenas usuários explicitamente autorizados na lista abaixo
              podem acessar
            </p>
          )}
        </div>
      </div>

      {/* Add User Form */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Adicionar Usuário Autorizado
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um usuário...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Cliente do projeto X, acesso temporário, etc."
            />
          </div>

          <button
            onClick={handleAddUser}
            disabled={!selectedUserId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Adicionar Autorização
          </button>
        </div>
      </div>

      {/* Authorized Users List */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Usuários Autorizados ({authorizedUsers.length})
        </h3>

        {authorizedUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum usuário autorizado ainda
          </p>
        ) : (
          <div className="space-y-3">
            {authorizedUsers.map((auth) => (
              <div
                key={auth.id}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {auth.user?.email || "Email não disponível"}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {auth.user?.role || "role desconhecido"}
                    </span>
                  </div>

                  {auth.user?.full_name && (
                    <p className="text-sm text-gray-600 mt-1">
                      {auth.user.full_name}
                    </p>
                  )}

                  {auth.notes && (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      📝 {auth.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>
                      Autorizado em:{" "}
                      {new Date(auth.authorized_at).toLocaleDateString("pt-BR")}
                    </span>
                    {auth.authorizer?.email && (
                      <span>Por: {auth.authorizer.email}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleRemoveUser(
                      auth.user_id,
                      auth.user?.email || "usuário"
                    )
                  }
                  className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
