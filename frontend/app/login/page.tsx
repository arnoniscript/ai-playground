"use client";

import { Layout } from "@/components/layout";
import { LoginForm } from "@/components/login-form";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, Suspense } from "react";
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
        <Suspense
          fallback={
            <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-6"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </Layout>
  );
}
