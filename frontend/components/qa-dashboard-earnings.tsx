"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface EarningsStats {
  under_review: number;
  ready_for_payment: number;
  paid: number;
}

export default function QADashboardEarnings() {
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const earningsRes = await api.get("/earnings", {
        params: { limit: 1000 },
      });
      const earnings = earningsRes.data.data || [];

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyEarnings = earnings.filter((e: any) => {
        const date = new Date(e.submitted_at);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      });

      setStats({
        under_review: monthlyEarnings
          .filter((e: any) => e.status === "under_review")
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0),
        ready_for_payment: monthlyEarnings
          .filter((e: any) => e.status === "ready_for_payment")
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0),
        paid: monthlyEarnings
          .filter((e: any) => e.status === "paid")
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0),
      });
    } catch (error) {
      console.error("Failed to fetch earnings stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!stats) return null;

  const total = stats.under_review + stats.ready_for_payment + stats.paid;

  return (
    <div
      onClick={() => router.push("/rewards-history")}
      className="bg-white rounded-lg shadow hover:shadow-md p-4 cursor-pointer transition-all duration-200 border border-gray-200 hover:border-green-400"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <h3 className="font-semibold text-gray-900">Ganhos do Mês</h3>
        </div>
        <span className="text-2xl font-bold text-green-600">
          {formatCurrency(total)}
        </span>
      </div>

      <div className="flex gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <span className="text-gray-600">Em Revisão:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(stats.under_review)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-gray-600">Aprovado:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(stats.ready_for_payment)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Pago:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(stats.paid)}
          </span>
        </div>
      </div>
    </div>
  );
}
