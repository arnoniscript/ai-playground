"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/auth-guard";

interface BankAccount {
  id: string;
  account_type: "brazilian" | "international";
  agency?: string | null;
  account_number?: string | null;
  pix_key?: string | null;
  iban?: string | null;
  swift_code?: string | null;
  international_account_number?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
  status: "pending" | "approved" | "rejected";
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  document_number: string | null;
  role: string;
  bank_account: BankAccount | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  nationality: string | null;
  primary_language: string | null;
  secondary_languages: string[] | null;
  document_photo_url: string | null;
  selfie_photo_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Campos editáveis
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchProfile();
  }, [user, router]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/users/profile");
      setProfile(response.data);
      setPhone(response.data.phone || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: "Erro ao carregar perfil" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      await api.put("/users/profile", {
        phone,
      });

      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });

      // Atualizar perfil
      await fetchProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erro ao atualizar perfil",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="text-xl text-gray-600">Carregando perfil...</div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!profile) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-center py-12">
            <div className="text-xl text-red-600">Erro ao carregar perfil</div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="mb-4 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-md flex items-center gap-2"
              >
                <span>←</span>
                <span>Voltar</span>
              </button>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Meu Perfil
              </h1>
              <p className="text-gray-600 mt-2">
                Visualize e edite suas informações pessoais
              </p>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              {/* Read-only Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span>🔒</span>
                  <span>Informações Protegidas</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Nome Completo
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                      {profile.full_name || "Não informado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Email
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                      {profile.email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Número do Documento
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                      {profile.document_number || "Não informado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Data de Nascimento
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                      {profile.birth_date
                        ? new Date(profile.birth_date).toLocaleDateString(
                            "pt-BR"
                          )
                        : "Não informado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Gênero
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 capitalize">
                      {profile.gender || "Não informado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Nacionalidade
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                      {profile.nationality || "Não informado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Idioma Principal
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 uppercase">
                      {profile.primary_language || "Não informado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      Função
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 capitalize">
                      {profile.role === "qa" ? "QA" : profile.role}
                    </div>
                  </div>

                  {profile.secondary_languages &&
                    profile.secondary_languages.length > 0 && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">
                          Idiomas Secundários
                        </label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                          <div className="flex flex-wrap gap-2">
                            {profile.secondary_languages.map((lang, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm uppercase font-medium"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">
                      Conta Bancária
                    </label>
                    {profile.bank_account ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {profile.bank_account.account_type === "brazilian"
                              ? "Conta Brasileira"
                              : "Conta Internacional"}
                          </span>
                          <span
                            className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                              profile.bank_account.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : profile.bank_account.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {profile.bank_account.status === "approved"
                              ? "Aprovada"
                              : profile.bank_account.status === "rejected"
                              ? "Rejeitada"
                              : "Pendente"}
                          </span>
                        </div>

                        {profile.bank_account.account_type === "brazilian" ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            {profile.bank_account.agency && (
                              <div>
                                <span className="text-gray-500">Agência: </span>
                                <span className="text-gray-800 font-medium">
                                  {profile.bank_account.agency}
                                </span>
                              </div>
                            )}
                            {profile.bank_account.account_number && (
                              <div>
                                <span className="text-gray-500">Conta: </span>
                                <span className="text-gray-800 font-medium">
                                  {profile.bank_account.account_number}
                                </span>
                              </div>
                            )}
                            {profile.bank_account.pix_key && (
                              <div className="md:col-span-3">
                                <span className="text-gray-500">
                                  Chave PIX:{" "}
                                </span>
                                <span className="text-gray-800 font-medium">
                                  {profile.bank_account.pix_key}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            {profile.bank_account.bank_name && (
                              <div>
                                <span className="text-gray-500">Banco: </span>
                                <span className="text-gray-800 font-medium">
                                  {profile.bank_account.bank_name}
                                </span>
                              </div>
                            )}
                            {profile.bank_account.iban && (
                              <div>
                                <span className="text-gray-500">IBAN: </span>
                                <span className="text-gray-800 font-medium font-mono">
                                  {profile.bank_account.iban}
                                </span>
                              </div>
                            )}
                            {profile.bank_account.swift_code && (
                              <div>
                                <span className="text-gray-500">SWIFT: </span>
                                <span className="text-gray-800 font-medium">
                                  {profile.bank_account.swift_code}
                                </span>
                              </div>
                            )}
                            {profile.bank_account
                              .international_account_number && (
                              <div>
                                <span className="text-gray-500">
                                  Número da Conta:{" "}
                                </span>
                                <span className="text-gray-800 font-medium">
                                  {
                                    profile.bank_account
                                      .international_account_number
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                        Não informada
                      </div>
                    )}
                  </div>

                  {/* Fotos do documento e selfie */}
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">
                      Documentos Enviados
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium">
                          Foto do Documento
                        </p>
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          {profile.document_photo_url ? (
                            <img
                              src={profile.document_photo_url}
                              alt="Documento"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <span className="text-4xl block mb-2">📄</span>
                                <span className="text-sm">Não enviado</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium">
                          Selfie
                        </p>
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          {profile.selfie_photo_url ? (
                            <img
                              src={profile.selfie_photo_url}
                              alt="Selfie"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <span className="text-4xl block mb-2">🤳</span>
                                <span className="text-sm">Não enviada</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">
                      Membro desde
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                      {new Date(profile.created_at).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4 italic">
                  ℹ️ Esses campos são protegidos e não podem ser editados. Entre
                  em contato com o administrador caso precise alterá-los.
                </p>
              </div>

              {/* Editable Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span>✏️</span>
                  <span>Informações Editáveis</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
