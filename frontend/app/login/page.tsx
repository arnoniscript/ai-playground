"use client";

import { LoginForm } from "@/components/login-form";
import { RegisterQAModal } from "@/components/register-qa-modal";
import { useAuthStore } from "@/lib/auth-store";
import { useEffect, Suspense, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Visual */}
        <div className="text-center lg:text-left space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
              <img
                src="/assets/MarisaAI.png"
                alt="AI Marisa logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Marisa
              </h1>
              <p className="text-xs text-gray-500 font-medium">PLAYGROUND</p>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative w-full max-w-lg mx-auto lg:mx-0">
            <img
              src="/assets/Frame-2-_1_.avif"
              alt="AI Marisa Playground"
              className="w-full h-auto"
            />
          </div>

          {/* Features Pills - Infinite Carousel */}
          <div className="relative overflow-hidden">
            <div className="flex gap-3 animate-scroll">
              <div className="flex gap-3 shrink-0">
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🎯</span>
                  <span className="text-sm font-medium text-gray-700">
                    A/B Testing
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🏷️</span>
                  <span className="text-sm font-medium text-gray-700">
                    Data Labeling
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>⚡</span>
                  <span className="text-sm font-medium text-gray-700">
                    Fine-tuning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🔄</span>
                  <span className="text-sm font-medium text-gray-700">
                    Transfer Learning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🎮</span>
                  <span className="text-sm font-medium text-gray-700">
                    Reinforcement Learning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🔬</span>
                  <span className="text-sm font-medium text-gray-700">
                    Active Learning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>📊</span>
                  <span className="text-sm font-medium text-gray-700">
                    Data Augmentation
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🧪</span>
                  <span className="text-sm font-medium text-gray-700">
                    Synthetic Data
                  </span>
                </div>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex gap-3 shrink-0">
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🎯</span>
                  <span className="text-sm font-medium text-gray-700">
                    A/B Testing
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🏷️</span>
                  <span className="text-sm font-medium text-gray-700">
                    Data Labeling
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>⚡</span>
                  <span className="text-sm font-medium text-gray-700">
                    Fine-tuning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🔄</span>
                  <span className="text-sm font-medium text-gray-700">
                    Transfer Learning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🎮</span>
                  <span className="text-sm font-medium text-gray-700">
                    Reinforcement Learning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🔬</span>
                  <span className="text-sm font-medium text-gray-700">
                    Active Learning
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>📊</span>
                  <span className="text-sm font-medium text-gray-700">
                    Data Augmentation
                  </span>
                </div>
                <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                  <span>🧪</span>
                  <span className="text-sm font-medium text-gray-700">
                    Synthetic Data
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <Suspense
              fallback={
                <div className="w-full p-8 bg-white rounded-2xl shadow-xl">
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

            {/* CTA Banner */}
            <div className="relative overflow-hidden rounded-2xl shadow-lg animate-gradient">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="w-full p-6 text-left group hover:scale-[1.02] transition-transform"
              >
                <div className="relative z-10">
                  <p className="text-white font-semibold text-lg mb-1">
                    Ajude a treinar IAs que cuidam de pessoas
                  </p>
                  <p className="text-white/90 text-sm">
                    Cadastre-se e faça parte da construção de modelos que salvam
                    vidas →
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Register QA Modal */}
      <RegisterQAModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 15s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          background: linear-gradient(
            -45deg,
            #667eea 0%,
            #764ba2 25%,
            #f093fb 50%,
            #667eea 75%,
            #764ba2 100%
          );
          background-size: 400% 400%;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </div>
  );
}
