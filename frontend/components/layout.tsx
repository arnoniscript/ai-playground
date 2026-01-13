"use client";

import { ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationBanner, NotificationModal } from "./notifications";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {user && (
        <>
          {/* Notification Banners */}
          <NotificationBanner />

          {/* Notification Modals */}
          <NotificationModal />

          <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex justify-between items-center">
                {/* Logo */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 group"
                >
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105 overflow-hidden">
                    <img
                      src="/assets/MarisaAI.png"
                      alt="AI Marisa logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Marisa
                    </span>
                    <p className="text-[10px] text-gray-500 font-medium leading-none">
                      PLAYGROUND
                    </p>
                  </div>
                </Link>

                {/* Navigation Links */}
                <div className="flex gap-2 items-center">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium flex items-center gap-2"
                  >
                    <span>🎮</span>
                    <span>Playgrounds</span>
                  </Link>

                  <Link
                    href={isAdmin() ? "/admin/courses" : "/courses"}
                    className="px-4 py-2 rounded-lg text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all font-medium flex items-center gap-2"
                  >
                    <span>📚</span>
                    <span>Cursos</span>
                  </Link>

                  {user?.role === "qa" && (
                    <Link
                      href="/rewards-history"
                      className="px-4 py-2 rounded-lg text-gray-700 hover:text-green-600 hover:bg-green-50 transition-all font-medium flex items-center gap-2"
                    >
                      <span>💎</span>
                      <span>Recompensas</span>
                    </Link>
                  )}

                  {isAdmin() && (
                    <>
                      <div className="w-px h-8 bg-gray-300 mx-2"></div>
                      <Link
                        href="/admin/dashboard"
                        className="px-4 py-2 rounded-lg text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium flex items-center gap-2"
                      >
                        <span>👑</span>
                        <span>Admin</span>
                      </Link>
                      <Link
                        href="/admin/notifications"
                        className="px-4 py-2 rounded-lg text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all font-medium flex items-center gap-2"
                      >
                        <span>🔔</span>
                        <span className="hidden lg:inline">Notificações</span>
                      </Link>
                      <Link
                        href="/admin/earnings"
                        className="px-4 py-2 rounded-lg text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 transition-all font-medium flex items-center gap-2"
                      >
                        <span>💰</span>
                        <span className="hidden lg:inline">Earnings</span>
                      </Link>
                    </>
                  )}

                  {/* User Menu */}
                  <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {user.full_name || user.email}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {user.role === "qa" ? "QA" : user.role}
                        </span>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 text-gray-600 hover:text-red-600 transition-colors font-medium flex items-center gap-2"
                      title="Sair"
                    >
                      <span>🚪</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
