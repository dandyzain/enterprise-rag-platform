"use client";

import * as React from "react";
import { Locale, LanguageContextType } from "./types";
import { enDictionary } from "./dictionaries/en";
import { idDictionary } from "./dictionaries/id";

const dictionaries = {
  en: enDictionary,
  id: idDictionary,
};

const LanguageContext = React.createContext<LanguageContextType>({
  locale: "en",
  language: "en",
  setLocale: () => {},
  toggleLocale: () => {},
  isEnglish: true,
  isIndonesian: false,
  t: enDictionary,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // English is the default language
  const [locale, setLocaleState] = React.useState<Locale>("en");
  const [mounted, setMounted] = React.useState(false);

  // Sync with localStorage on client mount
  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("app_locale") as Locale | null;
      if (stored === "id" || stored === "en") {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      } else {
        // Default to English
        setLocaleState("en");
        document.documentElement.lang = "en";
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("app_locale", newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // ignore
    }
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === "en" ? "id" : "en";
      try {
        localStorage.setItem("app_locale", next);
        document.documentElement.lang = next;
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const t = dictionaries[locale] || enDictionary;
  const isEnglish = locale === "en";
  const isIndonesian = locale === "id";

  return (
    <LanguageContext.Provider
      value={{
        locale,
        language: locale,
        setLocale,
        toggleLocale,
        isEnglish,
        isIndonesian,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => React.useContext(LanguageContext);
export type { Locale };
