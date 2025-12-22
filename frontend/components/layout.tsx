"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              AI Marisa
            </Link>

            <div className="flex gap-4 items-center">
              {isAdmin() && (
                <Link
                  href="/admin/dashboard"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Admin
                </Link>
              )}

              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700"
              >
                Playgrounds
              </Link>

              <Link
                href={isAdmin() ? "/admin/courses" : "/courses"}
                className="text-blue-600 hover:text-blue-700"
              >
                Cursos Introdutórios
              </Link>

              <div className="text-sm text-gray-600">
                {user.full_name || user.email}
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
