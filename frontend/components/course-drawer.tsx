"use client";

import { useState, useEffect } from "react";
import { coursesApi } from "@/lib/api";
import type { CourseWithSteps } from "@/lib/types";

interface CourseDrawerProps {
  courseId: string;
  courseTitle: string;
  isCompleted: boolean;
}

export function CourseDrawer({
  courseId,
  courseTitle,
  isCompleted,
}: CourseDrawerProps) {
  const [course, setCourse] = useState<CourseWithSteps | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await coursesApi.get(courseId);
      setCourse(response.data.data.course);
      setCurrentStepIndex(0);
    } catch (err) {
      console.error("Error loading course:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = course?.steps[currentStepIndex];

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? "w-full md:w-[600px]" : "w-0"
        }`}
      >
        {/* Tab - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`group absolute left-full top-1/2 -translate-y-1/2 shadow-xl rounded-r-2xl px-4 py-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
            isCompleted
              ? "bg-green-100 border-r-4 border-green-500 hover:bg-green-200"
              : "bg-blue-100 border-r-4 border-blue-500 hover:bg-blue-200"
          }`}
          title={isExpanded ? "Fechar curso" : "Abrir curso"}
        >
          <div
            className="flex items-center gap-4"
            style={{ writingMode: "vertical-rl" }}
          >
            {/* Status indicator */}
            {isCompleted ? (
              <div className="bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-base font-bold shadow-md">
                ✓
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-7 h-7">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
            )}

            {/* Course title */}
            <div
              className={`text-base font-bold whitespace-nowrap tracking-wider ${
                isCompleted ? "text-green-900" : "text-blue-900"
              }`}
            >
              📚 {courseTitle}
            </div>
          </div>
        </button>

        {/* Drawer Content */}
        <div
          className={`h-full flex flex-col transition-opacity ${
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b bg-gray-50">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {course?.title || "Carregando..."}
                </h2>
                {isCompleted && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    ✓ Concluído
                  </span>
                )}
              </div>
              {course && (
                <p className="text-sm text-gray-600">
                  Step {currentStepIndex + 1} de {course.steps.length}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8">Carregando curso...</div>
            ) : currentStep ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentStep.title}
                </h3>

                {/* Media */}
                {currentStep.image_url && (
                  <img
                    src={currentStep.image_url}
                    alt={currentStep.title}
                    className="w-full rounded-lg"
                  />
                )}

                {currentStep.video_url && (
                  <video controls className="w-full rounded-lg">
                    <source src={currentStep.video_url} />
                  </video>
                )}

                {currentStep.audio_url && (
                  <audio controls className="w-full">
                    <source src={currentStep.audio_url} />
                  </audio>
                )}

                {/* Content */}
                {currentStep.content && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {currentStep.content}
                    </p>
                  </div>
                )}

                {currentStep.has_evaluation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <p className="text-blue-800">
                      ℹ️ Este step possui uma avaliação. Para fazer a avaliação
                      completa, acesse o curso pela aba "Cursos Introdutórios".
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                Nenhum conteúdo disponível
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {course && course.steps.length > 0 && (
            <div className="border-t bg-gray-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <button
                  onClick={() =>
                    setCurrentStepIndex(Math.max(0, currentStepIndex - 1))
                  }
                  disabled={currentStepIndex === 0}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>

                <button
                  onClick={() =>
                    setCurrentStepIndex(
                      Math.min(course.steps.length - 1, currentStepIndex + 1)
                    )
                  }
                  disabled={currentStepIndex === course.steps.length - 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo →
                </button>
              </div>

              {/* Progress Dots */}
              <div className="flex gap-1.5 justify-center overflow-x-auto pb-1">
                {course.steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStepIndex(index)}
                    className={`flex-shrink-0 w-2 h-2 rounded-full transition-all ${
                      index === currentStepIndex
                        ? "bg-blue-600 w-6"
                        : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Ir para step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
