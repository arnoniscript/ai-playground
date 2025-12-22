"use client";

import { useState, useEffect } from "react";
import { coursesApi } from "@/lib/api";
import type { CourseWithSteps } from "@/lib/types";

interface CourseModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CourseModal({ courseId, isOpen, onClose }: CourseModalProps) {
  const [course, setCourse] = useState<CourseWithSteps | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && courseId) {
      loadCourse();
    }
  }, [isOpen, courseId]);

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

  if (!isOpen) return null;

  const currentStep = course?.steps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {course?.title || "Carregando..."}
            </h2>
            {course && (
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStepIndex + 1} de {course.steps.length}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">Carregando curso...</div>
          ) : currentStep ? (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">{currentStep.title}</h3>
              {currentStep.image_url && <img src={currentStep.image_url} alt={currentStep.title} className="w-full rounded-lg" />}
              {currentStep.video_url && <video controls className="w-full rounded-lg"><source src={currentStep.video_url} /></video>}
              {currentStep.audio_url && <audio controls className="w-full"><source src={currentStep.audio_url} /></audio>}
              {currentStep.content && <div className="prose max-w-none"><p className="text-gray-700 whitespace-pre-wrap">{currentStep.content}</p></div>}
              {currentStep.has_evaluation && <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm"><p className="text-blue-800">ℹ️ Este step possui uma avaliação. Para fazer a avaliação completa, acesse o curso pela aba "Cursos Introdutórios".</p></div>}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">Nenhum conteúdo disponível</div>
          )}
        </div>

        {course && course.steps.length > 0 && (
          <div className="flex justify-between items-center p-6 border-t bg-gray-50">
            <button onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))} disabled={currentStepIndex === 0} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">← Step Anterior</button>
            <div className="flex gap-2">{course.steps.map((_, index) => (<button key={index} onClick={() => setCurrentStepIndex(index)} className={`w-2 h-2 rounded-full ${index === currentStepIndex ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"}`} aria-label={`Ir para step ${index + 1}`} />))}</div>
            <button onClick={() => setCurrentStepIndex(Math.min(course.steps.length - 1, currentStepIndex + 1))} disabled={currentStepIndex === course.steps.length - 1} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Próximo Step →</button>
          </div>
        )}
      </div>
    </div>
  );
}
