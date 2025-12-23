"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coursesApi } from "@/lib/api";
import type {
  CourseWithSteps,
  CourseStep,
  UserCourseProgress,
  UserStepAttempt,
  EvaluationQuestionWithOptions,
} from "@/lib/types";
import { Layout } from "@/components/layout";

export default function CourseViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseWithSteps | null>(null);
  const [progress, setProgress] = useState<UserCourseProgress | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [attempts, setAttempts] = useState<UserStepAttempt[]>([]);

  // Evaluation state
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [showResults, setShowResults] = useState(false);
  const [lastAttemptResult, setLastAttemptResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkedPlaygrounds, setLinkedPlaygrounds] = useState<any[]>([]);

  useEffect(() => {
    loadCourse();
    loadLinkedPlaygrounds();
  }, []);

  const loadLinkedPlaygrounds = async () => {
    try {
      const response = await coursesApi.getLinkedPlaygrounds(params.id);
      setLinkedPlaygrounds(response.data.data || []);
    } catch (err) {
      console.error("Error loading linked playgrounds:", err);
    }
  };

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await coursesApi.get(params.id);
      setCourse(response.data.data.course);

      if (response.data.data.progress) {
        setProgress(response.data.data.progress);

        // Find current step index
        const currentStepId = response.data.data.progress.current_step_id;
        if (currentStepId) {
          const index = response.data.data.course.steps.findIndex(
            (s) => s.id === currentStepId
          );
          if (index !== -1) {
            setCurrentStepIndex(index);
          }
        }

        // Load attempts
        const progressRes = await coursesApi.getProgress(params.id);
        setAttempts(progressRes.data.data.attempts);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async () => {
    try {
      const response = await coursesApi.start(params.id);
      setProgress(response.data.data);
      setCurrentStepIndex(0);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao iniciar curso");
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!course || !progress) return;

    const currentStep = course.steps[currentStepIndex];
    const answers = Object.entries(selectedAnswers).map(
      ([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      })
    );

    if (answers.length !== currentStep.questions.length) {
      alert("Por favor, responda todas as questões");
      return;
    }

    try {
      setSubmitting(true);
      const response = await coursesApi.submitEvaluation(
        params.id,
        currentStep.id,
        answers
      );
      setLastAttemptResult(response.data.data);
      setShowResults(true);

      // Reload attempts
      const progressRes = await coursesApi.getProgress(params.id);
      setAttempts(progressRes.data.data.attempts);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao submeter avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!course || !progress) return;

    const currentStep = course.steps[currentStepIndex];

    try {
      const response = await coursesApi.completeStep(params.id, currentStep.id);

      if (response.data.course_completed) {
        setProgress(response.data.data);
        alert("Parabéns! Você concluiu o curso!");
      } else if (response.data.next_step) {
        setCurrentStepIndex(currentStepIndex + 1);
        setSelectedAnswers({});
        setShowResults(false);
        setLastAttemptResult(null);
        setProgress(response.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao avançar");
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setSelectedAnswers({});
      setShowResults(false);
      setLastAttemptResult(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Carregando...</div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="text-center">Curso não encontrado</div>
      </Layout>
    );
  }

  if (!progress) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-gray-600 mb-6">{course.description}</p>
          )}

          <div className="mb-6">
            <h2 className="font-semibold mb-2">Este curso contém:</h2>
            <ul className="list-disc ml-6 text-gray-600">
              <li>{course.steps.length} steps</li>
              <li>
                {course.steps.filter((s) => s.has_evaluation).length} avaliações
              </li>
            </ul>
          </div>

          <button
            onClick={handleStartCourse}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Iniciar Curso
          </button>
        </div>
      </Layout>
    );
  }

  const currentStep = course.steps[currentStepIndex];
  const currentStepAttempts = attempts.filter(
    (a) => a.step_id === currentStep.id
  );
  const hasPassedCurrentStep = currentStepAttempts.some((a) => a.passed);
  const remainingAttempts = currentStep.max_attempts
    ? currentStep.max_attempts - currentStepAttempts.length
    : null;

  // Get completed steps from attempts
  const completedStepIds = new Set(
    attempts.filter((a) => a.passed).map((a) => a.step_id)
  );

  // Check if step is unlocked
  const isStepUnlocked = (stepIndex: number) => {
    if (stepIndex === 0) return true; // First step always unlocked

    // Check if ALL previous steps with evaluation are completed
    for (let i = 0; i < stepIndex; i++) {
      const previousStep = course.steps[i];
      if (
        previousStep.has_evaluation &&
        !completedStepIds.has(previousStep.id)
      ) {
        return false; // If any previous step with evaluation is not completed, lock this step
      }
    }

    return true; // All previous steps with evaluation are completed
  };

  const handleStepClick = (stepIndex: number) => {
    if (isStepUnlocked(stepIndex)) {
      setCurrentStepIndex(stepIndex);
      setSelectedAnswers({});
      setShowResults(false);
      setLastAttemptResult(null);
    }
  };

  return (
    <Layout>
      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Steps Index Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-4 bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📚</span>
              <span>Índice do Curso</span>
            </h3>
            <div className="space-y-2">
              {course.steps.map((step, index) => {
                const isCompleted = completedStepIds.has(step.id);
                const isUnlocked = isStepUnlocked(index);
                const isCurrent = index === currentStepIndex;

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={!isUnlocked}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-md"
                        : isUnlocked
                        ? "bg-gray-50 hover:bg-gray-100 text-gray-900"
                        : "bg-gray-50 text-gray-400 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          isCurrent
                            ? "border-white text-white"
                            : isCompleted
                            ? "border-green-500 bg-green-500 text-white"
                            : isUnlocked
                            ? "border-gray-300 text-gray-600"
                            : "border-gray-300 text-gray-400"
                        }`}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium truncate ${
                            isCurrent ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {step.title}
                        </div>
                        {step.has_evaluation && (
                          <div
                            className={`text-xs ${
                              isCurrent ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            📝 Avaliação
                          </div>
                        )}
                      </div>
                      {!isUnlocked && <span className="text-gray-400">🔒</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Step {currentStepIndex + 1} de {course.steps.length}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(
                  ((currentStepIndex + 1) / course.steps.length) * 100
                )}
                % completo
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    ((currentStepIndex + 1) / course.steps.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentStep.title}
            </h1>

            {currentStep.content && (
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {currentStep.content}
                </p>
              </div>
            )}

            {/* Media */}
            {currentStep.image_url && (
              <div className="mb-6">
                <img
                  src={currentStep.image_url}
                  alt="Step image"
                  className="max-w-full rounded-lg"
                />
              </div>
            )}

            {currentStep.video_url && (
              <div className="mb-6">
                <video controls className="max-w-full rounded-lg">
                  <source src={currentStep.video_url} />
                </video>
              </div>
            )}

            {currentStep.audio_url && (
              <div className="mb-6">
                <audio controls className="w-full">
                  <source src={currentStep.audio_url} />
                </audio>
              </div>
            )}
          </div>

          {/* Evaluation */}
          {currentStep.has_evaluation && (
            <div className="bg-white rounded-lg shadow p-8 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Avaliação</h2>
                {currentStep.evaluation_required && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                    Obrigatória - Mínimo: {currentStep.min_score} acertos
                  </span>
                )}
              </div>

              {remainingAttempts !== null && (
                <p className="text-sm text-gray-600 mb-4">
                  Tentativas restantes: {remainingAttempts}
                </p>
              )}

              {currentStepAttempts.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Tentativas anteriores:</h3>
                  <div className="space-y-2">
                    {currentStepAttempts.map((attempt, idx) => (
                      <div key={attempt.id} className="text-sm">
                        Tentativa {attempt.attempt_number}: {attempt.score}/
                        {attempt.total_questions}{" "}
                        {attempt.passed ? (
                          <span className="text-green-600 font-medium">
                            ✓ Aprovado
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">
                            ✗ Reprovado
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showResults &&
                remainingAttempts !== 0 &&
                (!currentStep.evaluation_required || !hasPassedCurrentStep) && (
                  <div className="space-y-6">
                    {currentStep.questions.map((question, qIndex) => (
                      <div
                        key={question.id}
                        className="border-b pb-6 last:border-b-0"
                      >
                        <h3 className="font-semibold mb-3">
                          {qIndex + 1}. {question.question_text}
                        </h3>

                        {question.question_image_url && (
                          <img
                            src={question.question_image_url}
                            alt="Question"
                            className="max-w-md rounded mb-3"
                          />
                        )}

                        <div className="space-y-2">
                          {question.options.map((option) => (
                            <label
                              key={option.id}
                              className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option.id}
                                checked={
                                  selectedAnswers[question.id] === option.id
                                }
                                onChange={(e) =>
                                  setSelectedAnswers({
                                    ...selectedAnswers,
                                    [question.id]: e.target.value,
                                  })
                                }
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="ml-3">{option.option_text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleSubmitEvaluation}
                      disabled={
                        submitting ||
                        Object.keys(selectedAnswers).length !==
                          currentStep.questions.length
                      }
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                    >
                      {submitting ? "Enviando..." : "Enviar Respostas"}
                    </button>
                  </div>
                )}

              {showResults && lastAttemptResult && (
                <div className="text-center">
                  <div
                    className={`p-6 rounded-lg mb-6 ${
                      lastAttemptResult.passed ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    <h3 className="text-2xl font-bold mb-2">
                      {lastAttemptResult.passed
                        ? "✓ Aprovado!"
                        : "✗ Não aprovado"}
                    </h3>
                    <p className="text-lg">
                      Você acertou {lastAttemptResult.score} de{" "}
                      {lastAttemptResult.total_questions} questões
                    </p>
                    <p className="text-sm mt-2 text-gray-600">
                      Nota:{" "}
                      {(
                        (lastAttemptResult.score /
                          lastAttemptResult.total_questions) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>

                  {lastAttemptResult.passed ||
                  !currentStep.evaluation_required ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 justify-center items-center">
                        {currentStepIndex > 0 && (
                          <button
                            onClick={handlePrevious}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                          >
                            ← Step Anterior
                          </button>
                        )}
                        {currentStepIndex === course.steps.length - 1 ? (
                          progress?.completed ? (
                            <button
                              disabled
                              className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-semibold"
                            >
                              ✓ Curso Finalizado
                            </button>
                          ) : (
                            <button
                              onClick={handleContinue}
                              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                            >
                              Finalizar Curso
                            </button>
                          )
                        ) : (
                          <button
                            onClick={handleContinue}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                          >
                            Continuar para próximo step →
                          </button>
                        )}

                        {/* Show linked playgrounds on last step - inline */}
                        {currentStepIndex === course.steps.length - 1 &&
                          linkedPlaygrounds.map((playground) => (
                            <button
                              key={playground.id}
                              onClick={() =>
                                router.push(`/playground/${playground.id}`)
                              }
                              className="group relative px-6 py-3 text-white rounded-lg font-bold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                              style={{
                                background:
                                  "linear-gradient(45deg, #3b82f6, #ef4444, #1e3a8a)",
                                backgroundSize: "200% 200%",
                                animation: "gradient 3s ease infinite",
                              }}
                            >
                              <style jsx>{`
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
                              `}</style>
                              <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>
                              <div className="relative flex items-center gap-2">
                                <span className="text-xl">🎯</span>
                                <span>{playground.name}</span>
                                <span className="group-hover:translate-x-1 transition-transform">
                                  →
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-600 mb-4">
                        Você precisa de pelo menos {currentStep.min_score}{" "}
                        acertos para continuar
                      </p>
                      {remainingAttempts && remainingAttempts > 0 ? (
                        <button
                          onClick={() => {
                            setShowResults(false);
                            setSelectedAnswers({});
                            setLastAttemptResult(null);
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                          Tentar novamente ({remainingAttempts} tentativas
                          restantes)
                        </button>
                      ) : remainingAttempts === 0 ? (
                        <p className="text-red-600 font-semibold">
                          Você atingiu o número máximo de tentativas para este
                          step
                        </p>
                      ) : (
                        <button
                          onClick={() => {
                            setShowResults(false);
                            setSelectedAnswers({});
                            setLastAttemptResult(null);
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasPassedCurrentStep && !showResults && (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-green-100 rounded-lg mb-6">
                    <h3 className="text-xl font-bold text-green-800">
                      ✓ Você já passou nesta avaliação!
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center items-center">
                    {currentStepIndex > 0 && (
                      <button
                        onClick={handlePrevious}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                      >
                        ← Step Anterior
                      </button>
                    )}
                    {currentStepIndex === course.steps.length - 1 ? (
                      progress?.completed ? (
                        <button
                          disabled
                          className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-semibold"
                        >
                          ✓ Curso Finalizado
                        </button>
                      ) : (
                        <button
                          onClick={handleContinue}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                          Finalizar Curso
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleContinue}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                      >
                        Continuar para próximo step →
                      </button>
                    )}

                    {/* Show linked playgrounds on last step - inline */}
                    {currentStepIndex === course.steps.length - 1 &&
                      linkedPlaygrounds.map((playground) => (
                        <button
                          key={playground.id}
                          onClick={() =>
                            router.push(`/playground/${playground.id}`)
                          }
                          className="group relative px-6 py-3 text-white rounded-lg font-bold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                          style={{
                            background:
                              "linear-gradient(45deg, #3b82f6, #ef4444, #1e3a8a)",
                            backgroundSize: "200% 200%",
                            animation: "gradient 3s ease infinite",
                          }}
                        >
                          <style jsx>{`
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
                          `}</style>
                          <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>
                          <div className="relative flex items-center gap-2">
                            <span className="text-xl">🎯</span>
                            <span>{playground.name}</span>
                            <span className="group-hover:translate-x-1 transition-transform">
                              →
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Continue without evaluation */}
          {!currentStep.has_evaluation && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 justify-center items-center">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                  >
                    ← Step Anterior
                  </button>
                )}
                {currentStepIndex === course.steps.length - 1 ? (
                  progress?.completed ? (
                    <button
                      disabled
                      className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-semibold"
                    >
                      ✓ Curso Finalizado
                    </button>
                  ) : (
                    <button
                      onClick={handleContinue}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Finalizar Curso
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleContinue}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Próximo Step →
                  </button>
                )}

                {/* Show linked playgrounds on last step - inline */}
                {currentStepIndex === course.steps.length - 1 &&
                  linkedPlaygrounds.map((playground) => (
                    <button
                      key={playground.id}
                      onClick={() =>
                        router.push(`/playground/${playground.id}`)
                      }
                      className="group relative px-6 py-3 text-white rounded-lg font-bold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                      style={{
                        background:
                          "linear-gradient(45deg, #3b82f6, #ef4444, #1e3a8a)",
                        backgroundSize: "200% 200%",
                        animation: "gradient 3s ease infinite",
                      }}
                    >
                      <style jsx>{`
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
                      `}</style>
                      <div className="absolute inset-0 backdrop-blur-sm bg-black/10"></div>
                      <div className="relative flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        <span>{playground.name}</span>
                        <span className="group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
