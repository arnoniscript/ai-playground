"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { BankAccount } from "@/lib/types";

interface BankAccountModalProps {
  onClose?: () => void;
  canClose?: boolean;
}

export default function BankAccountModal({
  onClose,
  canClose = false,
}: BankAccountModalProps) {
  const [accountType, setAccountType] = useState<"brazilian" | "international">(
    "brazilian"
  );
  const [loading, setLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState<BankAccount | null>(
    null
  );

  // Brazilian fields
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pixKey, setPixKey] = useState("");

  // International fields
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [intAccountNumber, setIntAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  useEffect(() => {
    fetchExistingAccount();
  }, []);

  const fetchExistingAccount = async () => {
    try {
      const response = await api.get("/bank-accounts");
      if (response.data.data) {
        const account = response.data.data;
        setExistingAccount(account);
        setAccountType(account.account_type);

        if (account.account_type === "brazilian") {
          setAgency(account.agency || "");
          setAccountNumber(account.account_number || "");
          setPixKey(account.pix_key || "");
        } else {
          setIban(account.iban || "");
          setSwiftCode(account.swift_code || "");
          setIntAccountNumber(account.international_account_number || "");
          setBankName(account.bank_name || "");
          setBankAddress(account.bank_address || "");
        }
      }
    } catch (error) {
      console.error("Failed to fetch bank account:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = { account_type: accountType };

      if (accountType === "brazilian") {
        if (!agency || !accountNumber || !pixKey) {
          alert("Por favor, preencha todos os campos obrigatórios");
          setLoading(false);
          return;
        }
        payload.agency = agency;
        payload.account_number = accountNumber;
        payload.pix_key = pixKey;
      } else {
        if (
          !iban ||
          !swiftCode ||
          !intAccountNumber ||
          !bankName ||
          !bankAddress
        ) {
          alert("Por favor, preencha todos os campos obrigatórios");
          setLoading(false);
          return;
        }
        payload.iban = iban;
        payload.swift_code = swiftCode;
        payload.international_account_number = intAccountNumber;
        payload.bank_name = bankName;
        payload.bank_address = bankAddress;
      }

      await api.post("/bank-accounts", payload);
      alert(
        "Conta bancária cadastrada com sucesso! Aguarde a aprovação do administrador."
      );

      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error("Failed to save bank account:", error);
      alert(error.response?.data?.error || "Erro ao salvar conta bancária");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingAccount ? "Atualizar" : "Cadastrar"} Conta Bancária
            </h2>
            {existingAccount?.status === "rejected" && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800">
                  Conta rejeitada
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {existingAccount.rejected_reason}
                </p>
              </div>
            )}
          </div>
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Informativo */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> Para contas brasileiras, somente
              serão validadas transferências para contas cujo CPF e nome
              correspondam ao cadastro no sistema. Os dados da conta bancária
              devem ser do titular da conta no playground.
            </p>
          </div>

          {/* Account Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Conta
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setAccountType("brazilian")}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  accountType === "brazilian"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Conta Brasileira
              </button>
              <button
                type="button"
                onClick={() => setAccountType("international")}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  accountType === "international"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Conta Internacional
              </button>
            </div>
          </div>

          {/* Brazilian Account Fields */}
          {accountType === "brazilian" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agência <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 1234"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 12345-6"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chave PIX <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                  required
                />
              </div>
            </div>
          )}

          {/* International Account Fields */}
          {accountType === "international" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: GB29NWBK60161331926819"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código SWIFT/BIC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: NWBKGB2L"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Conta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={intAccountNumber}
                  onChange={(e) => setIntAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Número da conta internacional"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo do banco"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço do Banco <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Endereço completo do banco (rua, cidade, país)"
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : existingAccount
                ? "Atualizar"
                : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
