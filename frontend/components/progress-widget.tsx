"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import api from "@/lib/api";
import { UserProgressResponse } from "@/lib/types";

interface ProgressWidgetProps {
  playgroundId: string;
}

export interface ProgressWidgetRef {
  refresh: () => void;
}

const ProgressWidget = forwardRef<ProgressWidgetRef, ProgressWidgetProps>(
  ({ playgroundId }, ref) => {
    const [progress, setProgress] = useState<UserProgressResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching progress for playground:', playgroundId);
        const response = await api.get(`/data-labeling/user-progress/${playgroundId}`);
        console.log('Progress response:', response.data);
        setProgress(response.data);
      } catch (err: any) {
        console.error("Error fetching progress:", err);
        console.error("Error response:", err.response?.data);
        console.error("Error status:", err.response?.status);
        
        const errorMsg = err.response?.data?.error || err.message || "Erro ao carregar progresso";
        setError(`Erro: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchProgress();
    }, [playgroundId]);

    // Expose refresh function to parent component
    useImperativeHandle(ref, () => ({
      refresh: fetchProgress
    }));

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 text-xs font-mono">{error || "Erro ao carregar progresso"}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-600">Debug Info</summary>
          <pre className="text-xs mt-1 text-red-600">Check browser console for full error details</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Individual Progress */}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">Seu Progresso</h3>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">{progress.user_completed_tasks}</span> tarefas concluídas
            {progress.user_available_tasks > 0 && (
              <span className="text-gray-500">
                {" • "}
                <span className="font-semibold">{progress.user_available_tasks}</span> disponíveis
              </span>
            )}
          </p>
        </div>

        {/* Global Progress */}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">Progresso da Equipe</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress.global_completion_percentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {progress.global_completion_percentage.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progress.global_completed_evaluations} de {progress.global_expected_evaluations} avaliações
          </p>
        </div>
      </div>
    </div>
  );
});

ProgressWidget.displayName = 'ProgressWidget';

export default ProgressWidget;