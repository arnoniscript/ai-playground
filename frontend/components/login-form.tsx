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
    <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-2">AI Marisa Playground</h1>

      {isInvited && step === "email" && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
          <p className="text-sm font-medium">🎉 Bem-vindo!</p>
          <p className="text-sm mt-1">
            Complete seu cadastro para acessar a plataforma.
          </p>
        </div>
      )}

      <p className="text-gray-600 mb-6 text-sm">
        {step === "email"
          ? "Digite seu email para receber o código de acesso"
          : "Digite o código enviado para seu email"}
      </p>

      {step === "email" ? (
        <form onSubmit={handleSendOTP}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@marisa.care"
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar Código"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Código de Acesso
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>

          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full mt-2 text-blue-600 hover:text-blue-700"
          >
            Voltar
          </button>
        </form>
      )}
    </div>
  );
}
