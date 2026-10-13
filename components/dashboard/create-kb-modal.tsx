"use client";

import * as React from "react";
import { X, Layers, Check, Upload, FileJson, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/context";

interface CreateKbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newKbId: string) => void;
}

export function CreateKbModal({ isOpen, onClose, onCreated }: CreateKbModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState<"create" | "restore">("create");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Restore backup state
  const [backupFile, setBackupFile] = React.useState<File | null>(null);
  const [backupPreview, setBackupPreview] = React.useState<{
    kbName: string;
    totalDocs: number;
    exportedAt: string;
  } | null>(null);
  const jsonInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal membuat Knowledge Base");
      }

      toast.success(`Knowledge Base "${json.data.name}" created successfully!`);
      onCreated(json.data.id);
      setName("");
      setDescription("");
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to create Knowledge Base.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.knowledgeBase) {
        throw new Error("Invalid Knowledge Base backup JSON format.");
      }

      setBackupFile(file);
      setBackupPreview({
        kbName: parsed.knowledgeBase.name || "Knowledge Base",
        totalDocs: Array.isArray(parsed.documents) ? parsed.documents.length : 0,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
      });
      toast.success(`Backup archive "${file.name}" ready to restore.`);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to read backup JSON.");
      setBackupFile(null);
      setBackupPreview(null);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("file", backupFile);

      toast.info("Restoring Knowledge Base and re-indexing vectors...");

      const res = await fetch("/api/knowledge-bases/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to import Knowledge Base.");
      }

      toast.success(json.message || "Knowledge Base restored successfully!");
      if (json.data?.knowledgeBase?.id) {
        onCreated(json.data.knowledgeBase.id);
      }
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to restore backup archive.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {t.modals.createKb.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-3.5 flex border-b border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition cursor-pointer ${
              activeTab === "create"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {t.modals.createKb.submit}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restore")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition cursor-pointer ${
              activeTab === "restore"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            Restore Backup JSON
          </button>
        </div>

        {/* Content: Create New Tab */}
        {activeTab === "create" ? (
          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.modals.createKb.nameLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.modals.createKb.namePlaceholder}
                required
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.modals.createKb.descLabel}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.modals.createKb.descPlaceholder}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting || !name.trim()}
                className="gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{t.common.loading}</span>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{t.modals.createKb.submit}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Content: Restore Tab */
          <form onSubmit={handleRestoreSubmit} className="mt-4 space-y-4">
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleBackupFileSelect}
              className="hidden"
            />

            {!backupPreview ? (
              <div
                onClick={() => jsonInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-zinc-700 dark:hover:border-emerald-500"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition group-hover:scale-110 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Select Backup Archive (.json)
                </p>
                <p className="text-[11px] text-zinc-500">
                  Standard Cortex RAG export format
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/20 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <FileJson className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {backupPreview.kbName}
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      {backupPreview.totalDocs} documents • Exported {new Date(backupPreview.exportedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBackupFile(null);
                      setBackupPreview(null);
                    }}
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting || !backupFile}
                className="gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Restoring Vectors...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Restore Archive</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
