export type Locale = "en" | "id";

export interface LanguageContextType {
  locale: Locale;
  language: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  isEnglish: boolean;
  isIndonesian: boolean;
  t: TranslationDictionary;
}

export type TranslationDictionary = typeof import("./dictionaries/en").enDictionary;
