"use client";

import * as React from "react";
import { X, UploadCloud, FileText, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/context";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBaseId: string;
  onUploadSuccess: () => void;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  knowledgeBaseId,
  onUploadSuccess,
}: DocumentUploadModalProps) {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [pipelineStep, setPipelineStep] = React.useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = React.useState<number>(0);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUploadBatch = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsProcessing(true);
      let successCount = 0;
      let totalChunks = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCurrentFileIndex(i + 1);
        setPipelineStep(`Indexing [${i + 1}/${selectedFiles.length}]: ${file.name}...`);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("knowledgeBaseId", knowledgeBaseId);

        const res = await fetch("/api/documents/ingest", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (res.ok && json.success) {
          successCount++;
          totalChunks += json.data?.totalChunks || 0;
        } else {
          console.warn(`Failed indexing ${file.name}:`, json.error);
        }
      }

      toast.success(
        `Batch ingestion finished: ${successCount} of ${selectedFiles.length} documents indexed (${totalChunks} chunks).`
      );
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to upload files.");
    } finally {
      setIsProcessing(false);
      setPipelineStep(null);
      setSelectedFiles([]);
      setCurrentFileIndex(0);
    }
  };

  const handleSeed = async () => {
    try {
      setIsProcessing(true);
      setPipelineStep("Indexing enterprise sample package (Cloud SOP, ISO27001, CI/CD)...");

      const res = await fetch(`/api/seed?kbId=${encodeURIComponent(knowledgeBaseId)}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load sample documents.");
      }

      toast.success("Successfully indexed 3 enterprise sample documents!");
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to seed sample documents.");
    } finally {
      setIsProcessing(false);
      setPipelineStep(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {t.modals.upload.title}
            </h3>
            <p className="text-xs text-zinc-500">
              {t.modals.upload.desc}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dropzone & File Queue */}
        <div className="mt-5 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.json,.csv"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const newFiles = Array.from(e.target.files);
                setSelectedFiles((prev) => [...prev, ...newFiles]);
              }
            }}
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              dragActive
                ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                : "border-zinc-300 hover:border-emerald-500 dark:border-zinc-700 dark:hover:border-emerald-500"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {t.documents.dropzoneText}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {t.documents.dropzoneSubtext}
            </p>
          </div>

          {/* Selected File Queue List */}
          {selectedFiles.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50/40 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                <span>Selected Files ({selectedFiles.length})</span>
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200/70 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      ({formatBytes(file.size)})
                    </span>
                  </div>

                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="ml-2 text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Processing Progress Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
              <span className="font-medium">{pipelineStep}</span>
            </div>
          )}

          {/* One-Click Seed Sample Docs Button */}
          {selectedFiles.length === 0 && !isProcessing && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Enterprise Documentation Samples
                </p>
                <p className="text-[11px] text-zinc-500">
                  SOP Cloud 2026, ISO-27001 Data Security, CI/CD DevOps Pipeline
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSeed}
                disabled={isProcessing}
                className="h-8 text-[11px] shrink-0 cursor-pointer"
              >
                {t.sidebar.seedButton}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="cursor-pointer"
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleUploadBatch}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="gap-1.5 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Index {selectedFiles.length > 0 ? `${selectedFiles.length} Files` : "Document"}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
