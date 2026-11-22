"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import {
  DARK_MEDIA_QUERY,
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

export type { ResolvedTheme, ThemePreference } from "@/lib/theme";
/** @deprecated use ResolvedTheme — kept for backwards compatibility. */
export type Theme = ResolvedTheme;

interface ThemeContextType {
  /** The user's stored choice: "dark" | "light" | "system". */
  preference: ThemePreference;
  /** The theme actually applied to the document. */
  resolvedTheme: ResolvedTheme;
  /** Alias of `resolvedTheme` (backwards compatible with the old API). */
  theme: ResolvedTheme;
  isDark: boolean;
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  preference: DEFAULT_THEME_PREFERENCE,
  resolvedTheme: "dark",
  theme: "dark",
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

/* --------------------------------------------------------------------------
 * External store: localStorage preference + OS colour-scheme media query.
 * useSyncExternalStore keeps SSR/hydration consistent (server snapshot is the
 * dark default, matching the inline init script) without effects or flags.
 * ------------------------------------------------------------------------ */

const listeners = new Set<() => void>();
/** In-memory fallback when storage is unavailable (private mode, blocked data). */
let memoryPreference: ThemePreference | null = null;

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return memoryPreference ?? DEFAULT_THEME_PREFERENCE;
  }
}

function writePreference(next: ThemePreference) {
  memoryPreference = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore — memoryPreference keeps the session consistent
  }
}

function systemPrefersDark() {
  return window.matchMedia(DARK_MEDIA_QUERY).matches;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_MEDIA_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };
  media.addEventListener("change", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", onStorage);
  };
}

type Snapshot = `${ThemePreference}:${ResolvedTheme}`;

function getSnapshot(): Snapshot {
  return `${readPreference()}:${systemPrefersDark() ? "dark" : "light"}`;
}

function getServerSnapshot(): Snapshot {
  return `${DEFAULT_THEME_PREFERENCE}:dark`;
}

function applyThemeClass(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function setThemePreference(next: ThemePreference) {
  const current = resolveTheme(readPreference(), systemPrefersDark());
  const nextResolved = resolveTheme(next, systemPrefersDark());
  writePreference(next);

  if (nextResolved === current) {
    emitChange();
    return;
  }

  const root = document.documentElement;
  const commit = () => {
    flushSync(emitChange);
    applyThemeClass(nextResolved);
  };

  const doc = document as DocumentWithViewTransition;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.setAttribute("data-theme-switching", "");

  if (doc.startViewTransition && !reduceMotion) {
    doc
      .startViewTransition(commit)
      .finished.catch(() => {})
      .finally(() => root.removeAttribute("data-theme-switching"));
  } else {
    commit();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.removeAttribute("data-theme-switching"))
    );
  }
}

function toggleThemePreference() {
  const current = resolveTheme(readPreference(), systemPrefersDark());
  setThemePreference(current === "dark" ? "light" : "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [preference, system] = snapshot.split(":") as [ThemePreference, ResolvedTheme];
  const resolvedTheme = resolveTheme(preference, system === "dark");

  // Keep the document class aligned (OS changes in "system" mode, other tabs)
  React.useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const value = React.useMemo<ThemeContextType>(
    () => ({
      preference,
      resolvedTheme,
      theme: resolvedTheme,
      isDark: resolvedTheme === "dark",
      setTheme: setThemePreference,
      toggleTheme: toggleThemePreference,
    }),
    [preference, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => React.useContext(ThemeContext);
