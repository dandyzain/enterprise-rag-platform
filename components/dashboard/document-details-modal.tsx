"use client";

import * as React from "react";
import { X, FileText, Trash2, Layers, BookOpen, AlertTriangle, RefreshCw } from "lucide-react";
import { DocumentItem, DocumentChunkItem } from "@/lib/rag/types";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DocumentDetailsModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DocumentDetailsModal({
  document,
  isOpen,
  onClose,
  onDeleted,
}: DocumentDetailsModalProps) {
  const [chunks, setChunks] = React.useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!document || !isOpen) return;

    let ignore = false;
    void (async () => {
      try {
        const res = await fetch(`/api/documents/${document.id}`);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setChunks(json.data.chunks || []);
        }
      } catch (err) {
        console.error("Gagal mengambil chunks dokumen:", err);
      } finally {
        if (!ignore) {
          setIsLoadingChunks(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [document, isOpen]);

  if (!isOpen || !document) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus dokumen.");
      }

      toast.success(`Dokumen "${document.title}" dan seluruh vektornya berhasil dihapus.`);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Gagal menghapus dokumen.");
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {document.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {formatBytes(document.fileSize)} • {document.chunkCount} potongan teks terindeks
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

        {/* Content Body: Chunks Explorer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Daftar Recursive Chunks ({chunks.length})
            </span>
            <Badge variant="ready" className="text-[11px]">
              HNSW Cosine Indexed
            </Badge>
          </div>

          {isLoadingChunks ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p className="mt-2 text-xs">Memuat potongan vektor...</p>
            </div>
          ) : chunks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-zinc-400 dark:border-zinc-800">
              <Layers className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-2 text-xs">Tidak ada data chunk yang ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4 transition hover:border-emerald-500/50 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Chunk #{chunk.chunkIndex + 1}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {chunk.pageNumber ? `Halaman ${chunk.pageNumber}` : "Halaman N/A"}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          {!showConfirmDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDelete(true)}
              className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus Dokumen</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Yakin hapus dokumen ini?
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-7 text-xs"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmDelete(false)}
                className="h-7 text-xs"
              >
                Batal
              </Button>
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
