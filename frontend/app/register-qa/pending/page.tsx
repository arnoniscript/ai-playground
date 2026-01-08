"use client";

import { useTranslation } from "@/lib/LanguageContext";
import Link from "next/link";

export default function QAPendingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <span className="text-5xl">⏳</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t("qa.pending.title")}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-8">
            {t("qa.pending.subtitle")}
          </p>

          {/* Timeline */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 text-left">
            <h2 className="font-semibold text-gray-900 mb-4 text-center">
              {t("qa.pending.timeline.title")}
            </h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t("qa.pending.timeline.step1")}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("qa.pending.timeline.step1Description")}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t("qa.pending.timeline.step2")}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("qa.pending.timeline.step2Description")}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t("qa.pending.timeline.step3")}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("qa.pending.timeline.step3Description")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">📧</span>
                <h3 className="font-semibold text-gray-900">
                  {t("qa.pending.email.title")}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {t("qa.pending.email.description")}
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 text-left">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">⏱️</span>
                <h3 className="font-semibold text-gray-900">
                  {t("qa.pending.time.title")}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {t("qa.pending.time.description")}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              {t("qa.pending.questions")}
            </p>
            <a
              href="mailto:support@marisacare.com"
              className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <span>📬</span>
              <span>support@marisacare.com</span>
            </a>
          </div>

          {/* Back to Home */}
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              {t("qa.pending.backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
