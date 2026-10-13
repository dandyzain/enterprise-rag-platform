"use client";

import * as React from "react";
import { X, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Check } from "lucide-react";
import { GroundednessReport } from "@/lib/rag/types";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";

interface GroundednessModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: GroundednessReport | null;
}

export function GroundednessModal({
  isOpen,
  onClose,
  report,
}: GroundednessModalProps) {
  const { t } = useLanguage();

  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {t.modals.groundedness.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {t.modals.groundedness.desc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top Score Summary Banner */}
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-100 bg-zinc-50/70 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="rounded-xl border border-zinc-200/70 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-medium text-zinc-500">{t.modals.groundedness.scoreLabel}</span>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {report.score}%
            </div>
            <span className="text-[10px] text-zinc-400">
              {report.score >= 85
                ? t.modals.groundedness.scoreVeryHigh
                : report.score >= 65
                ? t.modals.groundedness.scoreModerate
                : t.modals.groundedness.scoreNeedsReview}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200/70 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-medium text-zinc-500">{t.modals.groundedness.verifiedClaims}</span>
            <div className="mt-1 font-mono text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              {report.verifiedClaimsCount} / {report.totalClaimsCount}
            </div>
            <span className="text-[10px] text-zinc-400">{t.modals.groundedness.factualStatements}</span>
          </div>

          <div className="rounded-xl border border-zinc-200/70 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-medium text-zinc-500">{t.modals.groundedness.hallucinationRisk}</span>
            <div
              className={`mt-1 font-mono text-xl font-bold ${
                report.hallucinationRisk === "MINIMAL"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : report.hallucinationRisk === "MODERATE"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {report.hallucinationRisk}
            </div>
            <span className="text-[10px] text-zinc-400">{t.modals.groundedness.complianceLevel}</span>
          </div>
        </div>

        {/* Claim Verification List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.modals.groundedness.sentenceBreakdown}
            </h4>
            <span className="text-[11px] text-zinc-400">
              {t.modals.groundedness.referencedCitations}: {report.citationsReferenced.map((c) => `[${c}]`).join(", ") || t.modals.groundedness.none}
            </span>
          </div>

          {report.auditItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">
              {t.modals.groundedness.noComplexClaims}
            </p>
          ) : (
            report.auditItems.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-3.5 transition ${
                  item.isGrounded
                    ? "border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-950/60 dark:bg-emerald-950/10"
                    : "border-amber-200/80 bg-amber-50/20 dark:border-amber-950/60 dark:bg-amber-950/10"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5">
                    {item.isGrounded ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      &ldquo;{item.sentence}&rdquo;
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {item.citationIndex && (
                        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {t.modals.groundedness.citationTag} [{item.citationIndex}]
                        </span>
                      )}
                      <span className="font-mono text-zinc-500">
                        {t.modals.groundedness.confidence}: {(item.confidence * 100).toFixed(0)}%
                      </span>
                      <span
                        className={`font-semibold ${
                          item.isGrounded
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {item.isGrounded ? t.modals.groundedness.groundedBadge : t.modals.groundedness.synthesisBadge}
                      </span>
                    </div>

                    {item.matchedSnippet && (
                      <div className="mt-2 rounded-lg bg-zinc-100/70 p-2 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 font-sans">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {t.modals.groundedness.supportingContext}{" "}
                        </span>
                        {item.matchedSnippet}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t.modals.groundedness.complianceNotice}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {t.modals.groundedness.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
