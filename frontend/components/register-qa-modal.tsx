"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, useTranslation } from "@/lib/LanguageContext";

type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type DegreeLevel =
  | "high_school"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate"
  | "other";

interface Education {
  degree_level: DegreeLevel;
  institution: string;
  field_of_study: string;
  years: string;
  description?: string;
}

interface FormData {
  primary_language: string;
  full_name: string;
  email: string;
  birth_date: string;
  gender: Gender | "";
  nationality: string;
  phone: string;
  secondary_languages: string[];
  document_number: string;
  document_photo: string;
  geolocation: { latitude: number; longitude: number } | null;
  selfie_photo: string;
  education: Education[];
  terms_accepted: boolean;
}

const LANGUAGES = [
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
];

const AVAILABLE_LANGUAGES = [
  "Portuguese",
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Russian",
  "Hindi",
];

interface RegisterQAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterQAModal({ isOpen, onClose }: RegisterQAModalProps) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [formData, setFormData] = useState<FormData>({
    primary_language: language,
    full_name: "",
    email: "",
    birth_date: "",
    gender: "",
    nationality: "",
    phone: "",
    secondary_languages: [],
    document_number: "",
    document_photo: "",
    geolocation: null,
    selfie_photo: "",
    education: [],
    terms_accepted: false,
  });

  // Connect stream to video element when both are ready
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup stream on unmount or close
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (!isOpen && stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [isOpen, stream]);

  if (!isOpen) return null;

  // Validate file size (2MB max)
  const validateFileSize = (base64: string, fieldName: string): boolean => {
    try {
      const base64String = base64.includes(",") ? base64.split(",")[1] : base64;
      const sizeInBytes = (base64String.length * 3) / 4;
      const maxSizeInBytes = 2 * 1024 * 1024; // 2MB

      if (sizeInBytes > maxSizeInBytes) {
        setErrors({
          ...errors,
          [fieldName]: t("qa.registration.errors.fileTooLarge"),
        });
        return false;
      }
      return true;
    } catch (error) {
      setErrors({
        ...errors,
        [fieldName]: t("qa.registration.errors.invalidFile"),
      });
      return false;
    }
  };

  // Step 1: Language Selection
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step1.title")}
      </h2>
      <p className="text-gray-600">{t("qa.registration.step1.subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              setLanguage(lang.code as "pt" | "en" | "es");
              setFormData({ ...formData, primary_language: lang.code });
            }}
            className={`p-6 border-2 rounded-lg transition-all ${
              formData.primary_language === lang.code
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-300 hover:border-indigo-400"
            }`}
          >
            <div className="text-4xl mb-2">{lang.flag}</div>
            <div className="font-semibold">{lang.name}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: Personal Information
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step2.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("qa.registration.step2.fullName")} *
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("qa.registration.step2.email")} *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("qa.registration.step2.birthDate")} *
          </label>
          <input
            type="date"
            value={formData.birth_date}
            onChange={(e) =>
              setFormData({ ...formData, birth_date: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("qa.registration.step2.gender")} *
          </label>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value as Gender })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">{t("qa.registration.step2.selectGender")}</option>
            <option value="male">{t("qa.registration.step2.male")}</option>
            <option value="female">{t("qa.registration.step2.female")}</option>
            <option value="other">{t("qa.registration.step2.other")}</option>
            <option value="prefer_not_to_say">
              {t("qa.registration.step2.preferNotToSay")}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("qa.registration.step2.nationality")} *
          </label>
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) =>
              setFormData({ ...formData, nationality: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("qa.registration.step2.phone")}
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="+55 11 99999-9999"
          />
        </div>
      </div>
    </div>
  );

  // Step 3: Secondary Languages
  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step3.title")}
      </h2>
      <p className="text-gray-600">{t("qa.registration.step3.subtitle")}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AVAILABLE_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => {
              const isSelected = formData.secondary_languages.includes(lang);
              setFormData({
                ...formData,
                secondary_languages: isSelected
                  ? formData.secondary_languages.filter((l) => l !== lang)
                  : [...formData.secondary_languages, lang],
              });
            }}
            className={`px-4 py-2 border-2 rounded-lg transition-all ${
              formData.secondary_languages.includes(lang)
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-gray-300 hover:border-indigo-400"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        {t("qa.registration.step3.selected")}:{" "}
        {formData.secondary_languages.length}
      </div>
    </div>
  );

  // Step 4: Document Upload
  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step4.title")}
      </h2>
      <p className="text-gray-600">{t("qa.registration.step4.subtitle")}</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("qa.registration.step4.documentNumber")} *
        </label>
        <input
          type="text"
          value={formData.document_number}
          onChange={(e) =>
            setFormData({ ...formData, document_number: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("qa.registration.step4.uploadDocument")} * (Max 2MB)
        </label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (validateFileSize(base64, "document_photo")) {
                  setFormData({ ...formData, document_photo: base64 });
                  setErrors({ ...errors, document_photo: "" });
                }
              };
              reader.readAsDataURL(file);
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        {errors.document_photo && (
          <p className="mt-2 text-sm text-red-600">{errors.document_photo}</p>
        )}
        {formData.document_photo && !errors.document_photo && (
          <div className="mt-4">
            {formData.document_photo.includes("application/pdf") ? (
              <p className="text-sm text-gray-600">📄 PDF carregado</p>
            ) : (
              <img
                src={formData.document_photo}
                alt="Document preview"
                className="max-w-sm rounded-lg border border-gray-300"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Step 5: Geolocation
  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step5.title")}
      </h2>
      <p className="text-gray-600">{t("qa.registration.step5.subtitle")}</p>

      {formData.geolocation ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            ✓ {t("qa.registration.step5.captured")}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Lat: {formData.geolocation.latitude.toFixed(6)}, Lng:{" "}
            {formData.geolocation.longitude.toFixed(6)}
          </p>
        </div>
      ) : (
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setFormData({
                    ...formData,
                    geolocation: {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                    },
                  });
                },
                (error) => {
                  setErrors({
                    ...errors,
                    geolocation: t("qa.registration.step5.error"),
                  });
                }
              );
            } else {
              setErrors({
                ...errors,
                geolocation: t("qa.registration.step5.notSupported"),
              });
            }
          }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          📍 {t("qa.registration.step5.capture")}
        </button>
      )}
      {errors.geolocation && (
        <p className="text-sm text-red-600">{errors.geolocation}</p>
      )}
    </div>
  );

  // Step 6: Selfie with Webcam
  const renderStep6 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step6.title")}
      </h2>
      <p className="text-gray-600">{t("qa.registration.step6.subtitle")}</p>

      {!formData.selfie_photo ? (
        <div className="space-y-4">
          {!stream ? (
            <button
              onClick={async () => {
                try {
                  const mediaStream = await navigator.mediaDevices.getUserMedia(
                    {
                      video: { width: 640, height: 480 },
                    }
                  );
                  setStream(mediaStream);
                } catch (error) {
                  setErrors({
                    ...errors,
                    selfie_photo: t("qa.registration.step6.cameraError"),
                  });
                }
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              📷 {t("qa.registration.step6.openCamera")}
            </button>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md rounded-lg border border-gray-300"
              />
              <button
                onClick={() => {
                  if (videoRef.current) {
                    const canvas = document.createElement("canvas");
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(videoRef.current, 0, 0);
                    const base64 = canvas.toDataURL("image/jpeg", 0.8);

                    if (validateFileSize(base64, "selfie_photo")) {
                      setFormData({ ...formData, selfie_photo: base64 });
                      setErrors({ ...errors, selfie_photo: "" });

                      // Stop camera
                      stream?.getTracks().forEach((track) => track.stop());
                      setStream(null);
                    }
                  }
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                📸 {t("qa.registration.step6.takeSelfie")}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <img
            src={formData.selfie_photo}
            alt="Selfie preview"
            className="max-w-sm rounded-lg border border-gray-300"
          />
          <button
            onClick={() => setFormData({ ...formData, selfie_photo: "" })}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            🔄 {t("qa.registration.step6.retake")}
          </button>
        </div>
      )}
      {errors.selfie_photo && (
        <p className="mt-2 text-sm text-red-600">{errors.selfie_photo}</p>
      )}
    </div>
  );

  // Step 7: Education
  const renderStep7 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step7.title")}
      </h2>
      <p className="text-gray-600">{t("qa.registration.step7.subtitle")}</p>

      {formData.education.map((edu, index) => (
        <div
          key={index}
          className="p-4 border border-gray-300 rounded-lg space-y-3"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              {t("qa.registration.step7.education")} #{index + 1}
            </h3>
            <button
              onClick={() => {
                setFormData({
                  ...formData,
                  education: formData.education.filter((_, i) => i !== index),
                });
              }}
              className="text-red-600 hover:text-red-700"
            >
              🗑️ {t("qa.registration.step7.remove")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("qa.registration.step7.degreeLevel")} *
              </label>
              <select
                value={edu.degree_level}
                onChange={(e) => {
                  const updated = [...formData.education];
                  updated[index].degree_level = e.target.value as DegreeLevel;
                  setFormData({ ...formData, education: updated });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="high_school">
                  {t("qa.registration.step7.highSchool")}
                </option>
                <option value="associate">
                  {t("qa.registration.step7.associate")}
                </option>
                <option value="bachelor">
                  {t("qa.registration.step7.bachelor")}
                </option>
                <option value="master">
                  {t("qa.registration.step7.master")}
                </option>
                <option value="doctorate">
                  {t("qa.registration.step7.doctorate")}
                </option>
                <option value="other">
                  {t("qa.registration.step7.otherDegree")}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("qa.registration.step7.institution")} *
              </label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => {
                  const updated = [...formData.education];
                  updated[index].institution = e.target.value;
                  setFormData({ ...formData, education: updated });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("qa.registration.step7.fieldOfStudy")} *
              </label>
              <input
                type="text"
                value={edu.field_of_study}
                onChange={(e) => {
                  const updated = [...formData.education];
                  updated[index].field_of_study = e.target.value;
                  setFormData({ ...formData, education: updated });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("qa.registration.step7.years")} *
              </label>
              <input
                type="text"
                value={edu.years}
                onChange={(e) => {
                  const updated = [...formData.education];
                  updated[index].years = e.target.value;
                  setFormData({ ...formData, education: updated });
                }}
                placeholder="2020-2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => {
          setFormData({
            ...formData,
            education: [
              ...formData.education,
              {
                degree_level: "bachelor",
                institution: "",
                field_of_study: "",
                years: "",
                description: "",
              },
            ],
          });
        }}
        className="px-6 py-3 border-2 border-dashed border-indigo-400 text-indigo-600 rounded-lg hover:bg-indigo-50"
      >
        ➕ {t("qa.registration.step7.addEducation")}
      </button>
    </div>
  );

  // Step 8: Terms and Conditions
  const renderStep8 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("qa.registration.step8.title")}
      </h2>

      <div className="border border-gray-300 rounded-lg p-6 max-h-60 overflow-y-auto bg-gray-50">
        <h3 className="font-bold text-lg mb-4">
          {t("qa.registration.step8.termsTitle")}
        </h3>
        <div className="prose prose-sm">
          <p>{t("qa.registration.step8.termsContent")}</p>
        </div>
      </div>

      <label className="flex items-start space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.terms_accepted}
          onChange={(e) =>
            setFormData({ ...formData, terms_accepted: e.target.checked })
          }
          className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700">
          {t("qa.registration.step8.acceptTerms")} *
        </span>
      </label>
    </div>
  );

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.primary_language) newErrors.language = "Required";
        break;
      case 2:
        if (!formData.full_name) newErrors.full_name = "Required";
        if (!formData.email) newErrors.email = "Required";
        if (!formData.birth_date) newErrors.birth_date = "Required";
        if (!formData.gender) newErrors.gender = "Required";
        if (!formData.nationality) newErrors.nationality = "Required";
        break;
      case 4:
        if (!formData.document_number) newErrors.document_number = "Required";
        if (!formData.document_photo) newErrors.document_photo = "Required";
        break;
      case 6:
        if (!formData.selfie_photo) newErrors.selfie_photo = "Required";
        break;
      case 8:
        if (!formData.terms_accepted) newErrors.terms = "Required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register-qa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Show success screen inside modal
      setIsSubmitted(true);
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => {
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            onClose();
            // Reset state when closing
            setIsSubmitted(false);
            setCurrentStep(1);
          }}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <span className="text-xl text-gray-600">×</span>
        </button>

        {/* Content */}
        <div className="overflow-y-auto max-h-[90vh] p-8">
          {isSubmitted ? (
            // Success Screen
            <div className="flex flex-col py-12">
              {/* Logo - Aligned Left */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img
                      src="/assets/MarisaAI.png"
                      alt="AI Marisa logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Marisa
                    </h1>
                    <p className="text-xs text-gray-500 font-medium tracking-wider">
                      PLAYGROUND
                    </p>
                  </div>
                </div>
              </div>

              {/* Content - Centered */}
              <div className="flex flex-col items-center text-center">
                {/* Success Icon */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-6">
                  <svg
                    className="w-12 h-12 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {t("qa.pending.title")}
                </h2>

                {/* Message */}
                <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
                  {t("qa.pending.message")}
                </p>

                {/* Close Button */}
                <button
                  onClick={() => {
                    onClose();
                    setIsSubmitted(false);
                    setCurrentStep(1);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
                >
                  {t("qa.pending.close")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img
                      src="/assets/MarisaAI.png"
                      alt="AI Marisa logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Marisa
                    </h1>
                    <p className="text-xs text-gray-500 font-medium">
                      QA REGISTRATION
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {t("qa.registration.progress")}: {currentStep}/8
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round((currentStep / 8) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentStep / 8) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="mb-6">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
                {currentStep === 6 && renderStep6()}
                {currentStep === 7 && renderStep7()}
                {currentStep === 8 && renderStep8()}
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{errors.submit}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                {currentStep > 1 && (
                  <button
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    ← {t("qa.registration.previous")}
                  </button>
                )}

                {currentStep < 8 ? (
                  <button
                    onClick={nextStep}
                    className="ml-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {t("qa.registration.next")} →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.terms_accepted}
                    className="ml-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? t("qa.registration.submitting")
                      : t("qa.registration.submit")}{" "}
                    🚀
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
