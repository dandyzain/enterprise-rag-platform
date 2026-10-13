"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CitationItem } from "@/lib/rag/types";
import { X, FileText, Check, Copy, Sparkles, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/context";

interface CitationDrawerProps {
  citation: CitationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CitationDrawer({ citation, isOpen, onClose }: CitationDrawerProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = () => {
    if (!citation) return;
    navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    toast.success(t.common.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && citation && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:bg-transparent"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md border-l border-zinc-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    [{citation.index}]
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.modals.citationDrawer.title}
                    </h3>
                    <p className="text-xs text-zinc-500">Indexed semantic grounding reference</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={onClose}
                  className="rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Source Document Metadata Card */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {citation.documentTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {citation.pageNumber ? `Page ${citation.pageNumber}` : "Page N/A"}
                      </Badge>
                      <Badge
                        variant="ready"
                        className="text-[11px]"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Match {citation.similarity}%
                      </Badge>
                      {citation.matchType && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            citation.matchType === "hybrid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : citation.matchType === "vector"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {citation.matchType}
                        </span>
                      )}
                    </div>

                    {(citation.denseRank || citation.sparseRank || citation.rrfScore || citation.reRank) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-zinc-200/50 pt-2 text-[10px] font-mono text-zinc-500 dark:border-zinc-800/50">
                        {citation.reRank && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Re-Rank: #{citation.reRank}
                            {typeof citation.rerankDelta === "number" && citation.rerankDelta > 0
                              ? ` (+${citation.rerankDelta} boost)`
                              : ""}
                          </span>
                        )}
                        {citation.denseRank && <span>Dense Rank: #{citation.denseRank}</span>}
                        {citation.sparseRank && <span>BM25 Rank: #{citation.sparseRank}</span>}
                        {citation.rrfScore && <span>RRF Score: {citation.rrfScore}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Highlighting Quote Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide uppercase text-zinc-500">
                    {t.modals.citationDrawer.content}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-500">{t.common.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>{t.common.copy}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-lg border-l-4 border-emerald-500 bg-emerald-500/5 p-4 text-sm leading-relaxed text-zinc-800 dark:border-emerald-500 dark:bg-emerald-950/20 dark:text-zinc-200">
                  <p className="whitespace-pre-wrap font-sans">
                    &ldquo;{citation.snippet}&rdquo;
                  </p>
                </div>
              </div>

              {/* Strict Grounding Notice */}
              <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800">
                <p>
                  <strong className="text-zinc-700 dark:text-zinc-300">Strict Grounding:</strong>{" "}
                  This passage was directly retrieved from the vector store based on cosine similarity and Reciprocal Rank Fusion. The model is constrained to formulate answers based strictly on cited facts.
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
              <Button
                variant="outline"
                className="w-full text-xs cursor-pointer"
                onClick={onClose}
              >
                {t.modals.citationDrawer.close}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
