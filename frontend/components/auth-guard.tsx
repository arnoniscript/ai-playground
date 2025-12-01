"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/");
    }
  }, [isAdmin, router]);

  return <>{children}</>;
}
