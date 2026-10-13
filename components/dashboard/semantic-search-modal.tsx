"use client";

import * as React from "react";
import { X, Search, Sparkles, BookOpen, Clock, Layers } from "lucide-react";
import { SearchResultChunk } from "@/lib/rag/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/context";

interface SemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBaseId: string;
}

export function SemanticSearchModal({
  isOpen,
  onClose,
  knowledgeBaseId,
}: SemanticSearchModalProps) {
  const { t } = useLanguage();
  const [query, setQuery] = React.useState("");
  const [searchMode, setSearchMode] = React.useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [threshold, setThreshold] = React.useState(0.65);
  const [topK, setTopK] = React.useState(5);
  const [results, setResults] = React.useState<SearchResultChunk[]>([]);
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          knowledgeBaseId,
          searchMode,
          threshold,
          topK,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to execute vector search.");
      }

      setResults(json.data.chunks || []);
      setLatencyMs(json.data.latencyMs);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to search vectors.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Search className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {t.modals.semanticSearch.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {t.modals.semanticSearch.desc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Controls Toolbar */}
        <div className="border-b border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.modals.semanticSearch.queryPlaceholder}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSearching || !query.trim()}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{isSearching ? t.modals.semanticSearch.searching : t.modals.semanticSearch.searchButton}</span>
            </Button>
          </form>

          {/* Engine Mode & Sliders in playground */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            {/* Search mode pill buttons */}
            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/60 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setSearchMode("hybrid")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  searchMode === "hybrid"
                    ? "bg-white text-emerald-800 shadow-xs dark:bg-zinc-800 dark:text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {t.modals.semanticSearch.hybrid}
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("semantic")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  searchMode === "semantic"
                    ? "bg-white text-indigo-700 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {t.modals.semanticSearch.semantic}
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("keyword")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  searchMode === "keyword"
                    ? "bg-white text-amber-700 shadow-xs dark:bg-zinc-800 dark:text-amber-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {t.modals.semanticSearch.keyword}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-medium">{t.modals.semanticSearch.thresholdLabel}:</span>
              <input
                type="range"
                min={0.4}
                max={0.9}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-20 accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {threshold.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Top-K:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-950 cursor-pointer"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
              </select>
            </div>

            {latencyMs !== null && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>{t.modals.semanticSearch.latencyMs}: {latencyMs}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Viewer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <Layers className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-3 text-xs font-medium">
                {query ? t.modals.semanticSearch.noResults : t.modals.semanticSearch.queryPlaceholder}
              </p>
              <p className="text-[11px] text-zinc-500">
                {t.modals.semanticSearch.resultsFound}
              </p>
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 transition hover:border-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900/30"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                      {item.documentTitle}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {item.pageNumber ? `Page ${item.pageNumber}` : "Page N/A"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.rrfScore && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        RRF: {item.rrfScore.toFixed(4)}
                      </Badge>
                    )}
                    <Badge variant="ready" className="text-[10px]">
                      {Math.round((item.similarity || 0) * 100)}% Match
                    </Badge>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {item.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
