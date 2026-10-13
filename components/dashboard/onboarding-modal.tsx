"use client";

import * as React from "react";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Key,
  ArrowRight,
  X,
  FileText,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSamplePrompt: (prompt: string) => void;
  onOpenSettings: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  onSelectSamplePrompt,
  onOpenSettings,
}: OnboardingModalProps) {
  const { t } = useLanguage();
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  if (!isOpen) return null;

  const featureHighlights = [
    {
      icon: ShieldCheck,
      title: "Strict Grounding & Audit",
      desc: "Every sentence is strictly verified against cited enterprise documents to eliminate hallucinations.",
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60",
    },
    {
      icon: Cpu,
      title: "Hybrid Search & Re-Ranking",
      desc: "Combines Dense Vector Cosine Similarity with Sparse BM25 Lexical search for highest retrieval accuracy.",
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60",
    },
    {
      icon: Key,
      title: "Bring-Your-Own-Key (BYOK)",
      desc: "Input your OpenAI or Gemini API key in settings to bypass server host rate limits without restrictions.",
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/60",
    },
    {
      icon: FileText,
      title: "PII Sanitization & Magic Bytes",
      desc: "Automatically masks NIK, credit cards, phone numbers, and API keys before vectorizing documents.",
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/60",
    },
  ];

  const samplePrompts = [
    "What are the cloud architecture and disaster recovery (DRP) standards?",
    "Summarize key technical metrics, SLA targets, and critical recommendations.",
    "Describe operational risk mitigations and implementation constraints.",
  ];

  const handleClose = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      try {
        localStorage.setItem("enterprise_rag_onboarding_dismissed", "true");
      } catch (e) {
        console.warn("Failed to save onboarding preference:", e);
      }
    }
    onClose();
  };

  const handlePromptClick = (prompt: string) => {
    handleClose();
    onSelectSamplePrompt(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {t.modals.onboarding.title}
                </h3>
                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  v2.0 Public
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {t.modals.onboarding.desc}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            title="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feature Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {featureHighlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${item.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h4>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Starter Prompts */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Sample Prompts:
          </label>
          <div className="mt-2 space-y-1.5">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(prompt)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-700 transition hover:border-emerald-500 hover:bg-emerald-50/20 hover:text-emerald-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300 cursor-pointer"
              >
                <span className="truncate">{prompt}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-emerald-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span>{t.modals.onboarding.dismiss}</span>
          </label>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                handleClose();
                onOpenSettings();
              }}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Key className="h-3 w-3 text-amber-500" />
              <span>Set BYOK</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleClose}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t.modals.onboarding.getStarted}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
