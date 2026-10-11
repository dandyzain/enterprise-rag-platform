"use client";

import * as React from "react";
import { X, Activity, HardDrive, FileText, Layers, CheckCircle2, Cpu } from "lucide-react";
import { DocumentItem, KnowledgeBaseItem } from "@/lib/rag/types";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KbAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeBaseItem | null;
  documents: DocumentItem[];
}

export function KbAnalyticsModal({
  isOpen,
  onClose,
  knowledgeBase,
  documents,
}: KbAnalyticsModalProps) {
  if (!isOpen || !knowledgeBase) return null;

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
  const totalBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const avgChunksPerDoc = documents.length > 0 ? (totalChunks / documents.length).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Metrik & Kesehatan Knowledge Base
              </h3>
              <p className="text-xs text-zinc-500">{knowledgeBase.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Analytics Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs">Total Dokumen</span>
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {documents.length}
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              {documents.filter((d) => d.status === "INDEXED").length} Siap (Indexed)
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs">Total Chunks Terindeks</span>
              <Layers className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalChunks.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Rata-rata {avgChunksPerDoc} chunk / dokumen
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs">Ukuran Basis Data</span>
              <HardDrive className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatBytes(totalBytes)}
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">Penyimpanan teks sumber</div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs">Dimensi Vektor</span>
              <Cpu className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              1536
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">Indeks HNSW Cosine</div>
          </div>
        </div>

        {/* Operational Health Checklist */}
        <div className="mt-5 space-y-2 rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Status Pipeline Operasional
          </span>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Recursive Chunking Engine
            </span>
            <Badge variant="ready" className="text-[10px]">
              Aktif (500-700 tok)
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Strict Grounding Compliance
            </span>
            <Badge variant="ready" className="text-[10px]">
              Tegak (Anti-Halusinasi)
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Pencarian Vektor Kosinus
            </span>
            <Badge variant="ready" className="text-[10px]">
              Operator &lt;=&gt; Siap
            </Badge>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup Metrik
          </Button>
        </div>
      </div>
    </div>
  );
}
