"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useLanguage, Locale } from "@/lib/i18n/context";

interface LanguageSwitcherProps {
  variant?: "pill" | "button" | "select";
  className?: string;
}

export function LanguageSwitcher({
  variant = "pill",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, toggleLocale, t } = useLanguage();

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggleLocale}
        className={`flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer ${className}`}
        title={t.common.toggleLanguage}
      >
        <Globe className="h-3.5 w-3.5 text-emerald-500" />
        <span className="uppercase font-semibold tracking-wider">{locale}</span>
      </button>
    );
  }

  if (variant === "select") {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="appearance-none rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 pr-7 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
        >
          <option value="en">English (Default)</option>
          <option value="id">Bahasa Indonesia</option>
        </select>
        <Globe className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-zinc-400" />
      </div>
    );
  }

  // Default "pill" segmented switcher: [ EN | ID ]
  return (
    <div
      className={`inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-0.5 text-xs ${className}`}
      role="group"
      aria-label={t.common.language}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-md px-2 py-0.5 font-semibold text-[11px] transition cursor-pointer ${
          locale === "en"
            ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
        }`}
        title="English (Default)"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("id")}
        className={`rounded-md px-2 py-0.5 font-semibold text-[11px] transition cursor-pointer ${
          locale === "id"
            ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
        }`}
        title="Bahasa Indonesia"
      >
        ID
      </button>
    </div>
  );
}
