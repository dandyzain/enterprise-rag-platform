"use client";

import * as React from "react";
import { X, Search, Sparkles, BookOpen, Clock, Layers } from "lucide-react";
import { SearchResultChunk } from "@/lib/rag/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
        throw new Error(json.error || "Gagal melakukan pencarian vektor.");
      }

      setResults(json.data.chunks || []);
      setLatencyMs(json.data.latencyMs);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Gagal mencari vektor.");
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
                Hybrid & Vector Search Playground
              </h3>
              <p className="text-xs text-zinc-500">
                Evaluasi komparatif Dense Vector (<code className="font-mono text-[10px]">&lt;=&gt;</code>) dan Sparse BM25 via Reciprocal Rank Fusion
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

        {/* Search Controls Toolbar */}
        <div className="border-b border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik query (e.g. SLA 99.95%, standar ISO-27001, arsitektur pgvector, SEC-POL-04)..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSearching || !query.trim()}
              className="gap-1.5 text-xs"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{isSearching ? "Mencari..." : "Uji Query"}</span>
            </Button>
          </form>

          {/* Engine Mode & Sliders in playground */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            {/* Search mode pill buttons */}
            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/60 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setSearchMode("hybrid")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  searchMode === "hybrid"
                    ? "bg-white text-emerald-800 shadow-xs dark:bg-zinc-800 dark:text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Hybrid (RRF)
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("semantic")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  searchMode === "semantic"
                    ? "bg-white text-indigo-700 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Dense Vector
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("keyword")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  searchMode === "keyword"
                    ? "bg-white text-amber-700 shadow-xs dark:bg-zinc-800 dark:text-amber-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Sparse BM25
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-medium">Threshold:</span>
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
                className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
              </select>
            </div>

            {latencyMs !== null && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>Latensi: {latencyMs}ms</span>
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
                {query ? "Tidak ada chunk di atas batas ambang kemiripan." : "Masukkan query di atas untuk menguji pencarian vektor."}
              </p>
              <p className="text-[11px] text-zinc-500">
                Hasil menampilkan potongan teks dengan skor kecocokan tertinggi.
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
                      {item.pageNumber ? `Halaman ${item.pageNumber}` : "Halaman N/A"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.matchType && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          item.matchType === "hybrid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : item.matchType === "vector"
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {item.matchType}
                      </span>
                    )}

                    <Badge variant="ready" className="text-[11px]">
                      <Sparkles className="mr-1 h-3 w-3" />
                      {(item.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Hybrid Rank telemetry */}
                {(item.denseRank || item.sparseRank || item.rrfScore) && (
                  <div className="mb-2 flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {item.denseRank && <span>Dense Rank: #{item.denseRank}</span>}
                    {item.sparseRank && <span>BM25 Rank: #{item.sparseRank}</span>}
                    {item.rrfScore && <span>RRF Score: {item.rrfScore}</span>}
                  </div>
                )}

                <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {item.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <span className="text-xs text-zinc-500">
            Ditemukan {results.length} potongan data relevan
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup Playground
          </Button>
        </div>
      </div>
    </div>
  );
}
