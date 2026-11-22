/**
 * Theme configuration shared by the no-flash inline script (app/layout.tsx)
 * and the client ThemeProvider, so both always agree on keys and defaults.
 */

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

/** localStorage key — unchanged from the original implementation. */
export const THEME_STORAGE_KEY = "app-theme";
/** localStorage key owned by the i18n provider (also read by the init script). */
export const LOCALE_STORAGE_KEY = "app_locale";

/** Dark-first product default. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Runs before first paint: applies the `dark` class and `lang` attribute so
 * there is no flash of the wrong theme. Kept dependency-free and tiny.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='light'&&p!=='dark'&&p!=='system'){p='${DEFAULT_THEME_PREFERENCE}';}var r=p==='system'?(window.matchMedia('${DARK_MEDIA_QUERY}').matches?'dark':'light'):p;if(r==='dark'){d.classList.add('dark');}else{d.classList.remove('dark');}var l=localStorage.getItem('${LOCALE_STORAGE_KEY}');d.lang=(l==='id'||l==='en')?l:'en';}catch(e){}})()`;
