"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import BankAccountModal from "./bank-account-modal";
import api from "@/lib/api";

export default function BankAccountGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBankAccount();
  }, [user]);

  const checkBankAccount = async () => {
    // Only check for QA users
    if (!user || user.role !== "qa") {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/bank-accounts");
      const account = response.data.data;

      // Show modal if no account or if account was rejected
      if (!account || account.status === "rejected") {
        setShowModal(true);
      }
    } catch (error) {
      console.error("Failed to check bank account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    // Re-check after closing to see if they filled it
    checkBankAccount();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {children}
      {showModal && (
        <BankAccountModal onClose={handleModalClose} canClose={false} />
      )}
    </>
  );
}
