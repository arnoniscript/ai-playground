"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import pt from "./translations/pt.json";
import en from "./translations/en.json";
import es from "./translations/es.json";

type Language = "pt" | "en" | "es";
type TranslationKey = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  translations: typeof pt;
}

const translations = { pt, en, es };

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt");

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && ["pt", "en", "es"].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  // Save language to localStorage when changed
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  // Translation function
  const t = (key: TranslationKey): string => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return typeof value === "string" ? value : key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translations: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Helper hook for easier access to t function
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}
