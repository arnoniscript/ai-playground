"use client";

import { Layout } from "@/components/layout";
import { LoginForm } from "@/components/login-form";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <Layout>
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoginForm />
      </div>
    </Layout>
  );
}
