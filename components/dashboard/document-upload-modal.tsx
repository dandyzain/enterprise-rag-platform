"use client";

import * as React from "react";
import { X, UploadCloud, FileText, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

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
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [pipelineStep, setPipelineStep] = React.useState<string | null>(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      setPipelineStep("Mengunggah berkas...");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("knowledgeBaseId", knowledgeBaseId);

      // Visual progress feedback
      const timer = setTimeout(() => {
        setPipelineStep("Mengekstraksi teks & membuat recursive chunks...");
      }, 600);

      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        body: formData,
      });

      clearTimeout(timer);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memproses dokumen.");
      }

      toast.success(
        `Berhasil! Dokumen "${selectedFile.name}" diindeks (${json.data.totalChunks} chunks dalam ${json.data.processingTimeMs}ms).`
      );
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Gagal mengunggah dokumen.");
    } finally {
      setIsProcessing(false);
      setPipelineStep(null);
      setSelectedFile(null);
    }
  };

  const handleSeed = async () => {
    try {
      setIsProcessing(true);
      setPipelineStep("Mengindeks paket dokumen enterprise (SOP Cloud, ISO27001, DevOps)...");

      const res = await fetch(`/api/seed?kbId=${encodeURIComponent(knowledgeBaseId)}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat dokumen contoh.");
      }

      toast.success("Berhasil mengindeks 3 dokumen contoh enterprise!");
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Gagal memuat dokumen contoh.");
    } finally {
      setIsProcessing(false);
      setPipelineStep(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Unggah Dokumen ke Knowledge Base
            </h3>
            <p className="text-xs text-zinc-500">
              Dokumen akan diproses melalui pipeline ekstraksi, chunking, dan vektorisasi.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div className="mt-5 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.json,.csv"
            onChange={(e) => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
            }}
            className="hidden"
          />

          {!selectedFile ? (
            <>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition ${
                  dragActive
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : "border-zinc-300 hover:border-emerald-500 dark:border-zinc-700 dark:hover:border-emerald-500"
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="mt-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Tarik & Letakkan berkas di sini, atau klik untuk memilih
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Mendukung PDF, TXT, MD, JSON, CSV (Maksimal 25MB)
                </p>
              </div>

              {/* One-Click Seed Sample Docs Button */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Paket Contoh Dokumen Enterprise
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    SOP Cloud 2026, ISO-27001 Keamanan Data, Panduan CI/CD DevOps
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSeed}
                  disabled={isProcessing}
                  className="h-8 text-[11px] shrink-0"
                >
                  Muat Contoh
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatBytes(selectedFile.size)} • {selectedFile.type || "file"}
                    </p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    Ganti
                  </button>
                )}
              </div>

              {isProcessing && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                  <span className="font-medium">{pipelineStep}</span>
                </div>
              )}
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
          >
            Batal
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
            className="gap-1.5"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mulai Ingestion</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
