"use client";

import Link from "next/link";
import { AlertTriangle, SearchX } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { CortexLogo } from "@/components/ui/logo";

export function StatusPage({ kind, onRetry, digest }: { kind: "error" | "not-found"; onRetry?: () => void; digest?: string }) {
  const { t } = useLanguage();
  const isError = kind === "error";
  const Icon = isError ? AlertTriangle : SearchX;

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-zinc-50 px-4 text-center text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <CortexLogo size={40} />
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-bold">{isError ? t.errorsPage.title : t.errorsPage.notFoundTitle}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isError ? t.errorsPage.description : t.errorsPage.notFoundDescription}
        </p>
        {digest && <p className="font-mono text-[11px] text-zinc-400">ref: {digest}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            {t.errorsPage.retry}
          </button>
        )}
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {t.errorsPage.home}
        </Link>
      </div>
    </main>
  );
}
