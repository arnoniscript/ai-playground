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

  useEffect(() => {
    loadCourse();
  }, []);

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
        alert("Parabéns! Você concluiu o curso!");
        router.push("/courses");
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Step {currentStepIndex + 1} de {course.steps.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentStepIndex + 1) / course.steps.length) * 100)}
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
                  <button
                    onClick={handleContinue}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Continuar para próximo step →
                  </button>
                ) : (
                  <div>
                    <p className="text-red-600 mb-4">
                      Você precisa de pelo menos {currentStep.min_score} acertos
                      para continuar
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
              <div className="text-center">
                <div className="p-6 bg-green-100 rounded-lg mb-6">
                  <h3 className="text-xl font-bold text-green-800">
                    ✓ Você já passou nesta avaliação!
                  </h3>
                </div>
                <button
                  onClick={handleContinue}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Continuar para próximo step →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Continue without evaluation */}
        {!currentStep.has_evaluation && (
          <div className="text-center">
            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              {currentStepIndex === course.steps.length - 1
                ? "Finalizar Curso"
                : "Próximo Step →"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
