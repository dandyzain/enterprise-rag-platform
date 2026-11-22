"use client";

import * as React from "react";
import { LOCALE_STORAGE_KEY } from "@/lib/theme";
import { Locale, LanguageContextType } from "./types";
import { enDictionary } from "./dictionaries/en";
import { idDictionary } from "./dictionaries/id";

const dictionaries = {
  en: enDictionary,
  id: idDictionary,
};

// English is the default language
const DEFAULT_LOCALE: Locale = "en";

const LanguageContext = React.createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  language: DEFAULT_LOCALE,
  setLocale: () => {},
  toggleLocale: () => {},
  isEnglish: true,
  isIndonesian: false,
  t: enDictionary,
});

/* --------------------------------------------------------------------------
 * External store: the persisted locale. As in ThemeProvider,
 * useSyncExternalStore renders the default on the server and during
 * hydration, then the stored value, without a mount effect. The inline init
 * script (lib/theme.ts) has already set <html lang> from storage before paint.
 * ------------------------------------------------------------------------ */

const listeners = new Set<() => void>();
/** Read from storage on first client access, then owned by `setLocale`. */
let currentLocale: Locale | null = null;

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "id" || stored === "en" ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function getSnapshot(): Locale {
  if (currentLocale === null) {
    currentLocale = readStoredLocale();
  }
  return currentLocale;
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setLocale(newLocale: Locale) {
  currentLocale = newLocale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  } catch {
    // ignore — currentLocale keeps the session consistent
  }
  listeners.forEach((listener) => listener());
}

function toggleLocale() {
  setLocale(getSnapshot() === "en" ? "id" : "en");
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
