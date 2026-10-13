"use client";

import * as React from "react";
import {
  X,
  FileText,
  Trash2,
  Layers,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Search,
  Copy,
  Check,
  Download,
  FileJson,
} from "lucide-react";
import { DocumentItem, DocumentChunkItem } from "@/lib/rag/types";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/context";

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
  const { t } = useLanguage();
  const [chunks, setChunks] = React.useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedChunkId, setCopiedChunkId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!document || !isOpen) return;

    let ignore = false;
    setIsLoadingChunks(true);
    setSearchQuery("");

    void (async () => {
      try {
        const res = await fetch(`/api/documents/${document.id}`);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setChunks(json.data.chunks || []);
        }
      } catch (err) {
        console.error("Failed fetching document chunks:", err);
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
        throw new Error(json.error || "Failed to delete document.");
      }

      toast.success(`Document "${document.title}" and its vectors deleted successfully.`);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete document.");
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleCopyChunk = async (chunkId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedChunkId(chunkId);
      toast.success(t.common.copied);
      setTimeout(() => setCopiedChunkId(null), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  const handleExportJson = () => {
    const data = {
      documentId: document.id,
      title: document.title,
      fileSize: document.fileSize,
      fileType: document.fileType,
      chunkCount: chunks.length,
      exportedAt: new Date().toISOString(),
      chunks: chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        content: c.content,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title.replace(/[^a-zA-Z0-9_-]/g, "_")}-chunks.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chunks exported as JSON.");
  };

  const handleExportMarkdown = () => {
    let md = `# ${document.title}\n\n`;
    md += `- File Type: ${document.fileType}\n`;
    md += `- Size: ${formatBytes(document.fileSize)}\n`;
    md += `- Chunks: ${chunks.length}\n\n---\n\n`;

    chunks.forEach((chunk) => {
      md += `### Chunk #${chunk.chunkIndex + 1} (Page ${chunk.pageNumber || "N/A"})\n\n`;
      md += `${chunk.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title.replace(/[^a-zA-Z0-9_-]/g, "_")}-chunks.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chunks exported as Markdown.");
  };

  const filteredChunks = chunks.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesContent = c.content.toLowerCase().includes(query);
    const matchesIndex = (c.chunkIndex + 1).toString() === query;
    const matchesPage = c.pageNumber ? `page ${c.pageNumber}`.includes(query) : false;
    return matchesContent || matchesIndex || matchesPage;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 sm:p-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {document.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {formatBytes(document.fileSize)} • {document.chunkCount} {t.sidebar.chunksCount} (HNSW Cosine)
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

        {/* Toolbar: Search & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/50 px-5 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter keywords, page number, or chunk index..."
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              disabled={chunks.length === 0}
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              title="Download chunks as JSON"
            >
              <FileJson className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>JSON</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportMarkdown}
              disabled={chunks.length === 0}
              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
              title="Download chunks as Markdown"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Markdown</span>
            </Button>
          </div>
        </div>

        {/* Content Body: Chunks Explorer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Recursive Chunks ({filteredChunks.length}{chunks.length !== filteredChunks.length ? ` of ${chunks.length}` : ""})
            </span>
            <Badge variant="ready" className="text-[11px]">
              HNSW Cosine Indexed
            </Badge>
          </div>

          {isLoadingChunks ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p className="mt-2 text-xs">{t.common.loading}</p>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-zinc-400 dark:border-zinc-800">
              <Layers className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-2 text-xs">
                {searchQuery ? "No chunks matched the search query." : "No chunk data available."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChunks.map((chunk) => {
                const estTokens = Math.round(chunk.content.length / 4);
                return (
                  <div
                    key={chunk.id}
                    className="group relative rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4 transition hover:border-emerald-500/50 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {t.modals.docDetails.chunkIndex} {chunk.chunkIndex + 1}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          <BookOpen className="mr-1 h-3 w-3" />
                          {chunk.pageNumber ? `Page ${chunk.pageNumber}` : "Page N/A"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-400">
                          ~{estTokens} tokens ({chunk.content.length} chars)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                          className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-500 hover:text-emerald-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-emerald-400 transition cursor-pointer"
                          title={t.common.copy}
                        >
                          {copiedChunkId === chunk.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {chunk.content}
                    </p>
                  </div>
                );
              })}
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
              className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.documents.deleteDocument}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t.sidebar.deleteDocConfirm}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-7 text-xs cursor-pointer"
              >
                {isDeleting ? t.common.loading : t.common.confirm}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmDelete(false)}
                className="h-7 text-xs cursor-pointer"
              >
                {t.common.cancel}
              </Button>
            </div>
          )}

          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs cursor-pointer">
            {t.common.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
