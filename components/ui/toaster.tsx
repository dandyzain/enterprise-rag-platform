"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";

/** Sonner toaster that follows the active app theme (sonner defaults to light). */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: { fontFamily: "var(--font-sans)" },
      }}
    />
  );
}
