"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvited, setIsInvited] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setIsInvited(true);
    }
  }, [searchParams]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/signup", { email });
      setStep("otp");
    } catch (err: any) {
      // Exibir mensagem detalhada do backend (inclui motivo do bloqueio)
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to send OTP";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/verify", { email, code: otp });
      const { token, user } = response.data;
      setAuth(user, token);
      router.push("/dashboard");
    } catch (err: any) {
      // Exibir mensagem detalhada do backend (inclui motivo do bloqueio)
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid OTP";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-8 bg-white rounded-2xl shadow-xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {step === "email" ? "Bem-vindo!" : "Verificação"}
        </h2>
        <p className="text-gray-600">
          {step === "email"
            ? "Digite seu email para receber o código de acesso"
            : "Digite o código de 6 dígitos enviado para seu email"}
        </p>
      </div>

      {isInvited && step === "email" && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-gray-800">Bem-vindo à equipe!</p>
              <p className="text-sm text-gray-600 mt-1">
                Complete seu cadastro para acessar a plataforma.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={handleSendOTP} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@marisa.care"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Enviando...
              </span>
            ) : (
              "Enviar Código"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código de Acesso
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-bold"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Verificando...
              </span>
            ) : (
              "Verificar Código"
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setOtp("");
              setError(null);
            }}
            className="w-full text-gray-600 py-2 rounded-xl hover:bg-gray-100 transition-all font-medium"
          >
            ← Voltar
          </button>
        </form>
      )}
    </div>
  );
}
