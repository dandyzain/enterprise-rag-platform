"use client";

import * as React from "react";
import { Locale, LanguageContextType } from "./types";
import { enDictionary } from "./dictionaries/en";
import { idDictionary } from "./dictionaries/id";

const dictionaries = {
  en: enDictionary,
  id: idDictionary,
};

const STORAGE_KEY = "app_locale";

const LanguageContext = React.createContext<LanguageContextType>({
  locale: "en",
  language: "en",
  setLocale: () => {},
  toggleLocale: () => {},
  isEnglish: true,
  isIndonesian: false,
  t: enDictionary,
});

// The stored preference is an external store (localStorage), read with
// useSyncExternalStore so server render ("en") and client hydrate cleanly.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
}

const getServerSnapshot = (): Locale => "en";

function writeLocale(next: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable (private mode) — keep in-memory only
  }
  listeners.forEach((fn) => fn());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mirror the preference to <html lang> and to a cookie so API responses are localized too.
  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  const setLocale = React.useCallback((newLocale: Locale) => writeLocale(newLocale), []);
  const toggleLocale = React.useCallback(() => writeLocale(getSnapshot() === "en" ? "id" : "en"), []);

  const value = React.useMemo<LanguageContextType>(
    () => ({
      locale,
      language: locale,
      setLocale,
      toggleLocale,
      isEnglish: locale === "en",
      isIndonesian: locale === "id",
      t: dictionaries[locale] || enDictionary,
    }),
    [locale, setLocale, toggleLocale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => React.useContext(LanguageContext);
export type { Locale };
