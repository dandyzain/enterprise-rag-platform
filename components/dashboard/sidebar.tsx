"use client";

import * as React from "react";
import { DocumentItem, KnowledgeBaseItem, ChatSessionItem } from "@/lib/rag/types";
import { formatBytes } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import {
  Database,
  FileText,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  HardDrive,
  RefreshCw,
  FileUp,
  Plus,
  Trash2,
  MessageSquare,
  Download,
  Pencil,
  Check,
  X,
  LogOut,
  User,
  UserCheck,
  ShieldCheck,
  ChevronUp,
  Share2,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SidebarProps {
  documents: DocumentItem[];
  knowledgeBases: KnowledgeBaseItem[];
  selectedKbId: string;
  onSelectKb: (id: string) => void;
  isLoading: boolean;
  onRefreshDocs: () => void;
  onUploadSuccess: () => void;
  onInspectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenCreateKb: () => void;
  chatSessions: ChatSessionItem[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
}

export function Sidebar({
  documents,
  knowledgeBases,
  selectedKbId,
  onSelectKb,
  isLoading,
  onRefreshDocs,
  onUploadSuccess,
  onInspectDocument,
  onDeleteDocument,
  onOpenCreateKb,
  chatSessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"docs" | "chats">("docs");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgressStatus, setUploadProgressStatus] = React.useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = React.useState<string>("");
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const { user, loginDemo, logout } = useAuth();
  const { isDark, setTheme } = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedKb =
    knowledgeBases.find((k) => k.id === selectedKbId) ||
    knowledgeBases[0] || {
      id: "default-kb-1",
      name: "Enterprise Core Knowledge",
    };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
  const totalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  const chunkLimit = 50000;
  const usagePercent = Math.min(100, Math.round((totalChunks / chunkLimit) * 100));

  const userPlan = (user?.plan || "FREE") as "FREE" | "PRO" | "ENTERPRISE";
  const planLimits = {
    FREE: { queryPerHour: 15, maxDocs: 3, maxFileSize: "10 MB" },
    PRO: { queryPerHour: 120, maxDocs: 25, maxFileSize: "25 MB" },
    ENTERPRISE: { queryPerHour: 1000, maxDocs: 500, maxFileSize: "50 MB" },
  }[userPlan] || { queryPerHour: 15, maxDocs: 3, maxFileSize: "10 MB" };
  const docUsagePercent = Math.min(
    100,
    Math.round((documents.length / planLimits.maxDocs) * 100)
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgressStatus("Uploading...");
      toast.info(`Mengunggah berkas "${file.name}"...`);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("knowledgeBaseId", selectedKbId);

      setTimeout(() => {
        setUploadProgressStatus("Chunking & Indexing...");
      }, 700);

      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengunggah dan mengindeks dokumen.");
      }

      toast.success(`Dokumen "${file.name}" berhasil diindeks (${json.data.totalChunks} chunks)!`);
      onUploadSuccess();
      onRefreshDocs();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Gagal mengunggah dokumen.");
    } finally {
      setIsUploading(false);
      setUploadProgressStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-zinc-200 bg-zinc-50/70 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/80 backdrop-blur-xl ${
        isCollapsed ? "w-16" : "w-80"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-xs transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        title={isCollapsed ? "Buka Sidebar" : "Ciutkan Sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
        )}
      </button>

      {/* Top Header: Platform Identity & KB Switcher */}
      <div className="border-b border-zinc-200/80 p-4 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
            <Database className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Cortex RAG
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  Enterprise
                </span>
              </div>
              <p className="truncate text-xs text-zinc-500">Semantic Vector Engine</p>
            </div>
          )}
        </div>

        {/* KB Selector with Create Action */}
        {!isCollapsed && (
          <div className="mt-3.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Knowledge Base
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/dashboard?kb=${encodeURIComponent(selectedKbId)}`;
                    void navigator.clipboard.writeText(url);
                    toast.success("Tautan akses Knowledge Base disalin ke papan klip!");
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  title="Salin Tautan Akses Publik Knowledge Base"
                >
                  <Share2 className="h-3 w-3" />
                  <span>Bagikan</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.open(`/api/knowledge-bases/${selectedKbId}/export`, "_blank")
                  }
                  className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  title="Unduh Backup JSON Knowledge Base"
                >
                  <Download className="h-3 w-3" />
                  <span>Backup</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenCreateKb}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  title="Buat Knowledge Base baru"
                >
                  <Plus className="h-3 w-3" />
                  <span>Baru</span>
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <select
                value={selectedKbId}
                onChange={(e) => onSelectKb(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                {knowledgeBases.length > 0 ? (
                  knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id} className="dark:bg-zinc-900 dark:text-zinc-200">
                      {kb.name}
                    </option>
                  ))
                ) : (
                  <option value={selectedKb.id} className="dark:bg-zinc-900 dark:text-zinc-200">
                    {selectedKb.name}
                  </option>
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Ingestion Dropzone & Action Button */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.json,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {isCollapsed ? (
          <Button
            variant="default"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
            title="Unggah Dokumen PDF/Teks"
          >
            <UploadCloud className="h-4 w-4" />
          </Button>
        ) : (
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-3.5 text-center transition hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-zinc-700 dark:hover:border-emerald-500 ${
              isUploading ? "pointer-events-none opacity-80" : ""
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition group-hover:scale-110 dark:bg-emerald-950/60 dark:text-emerald-400">
              {isUploading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {isUploading ? uploadProgressStatus : "Unggah Dokumen Knowledge"}
            </p>
            <p className="text-[11px] text-zinc-500">
              {isUploading ? "Memproses embedding..." : "Format PDF, TXT, MD hingga 25MB"}
            </p>
          </div>
        )}
      </div>

      {/* Tabs Switcher: Dokumen vs Sesi Obrolan */}
      {!isCollapsed && (
        <div className="flex border-b border-zinc-200/80 px-3 pt-2 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`flex-1 border-b-2 py-1.5 text-center text-xs font-semibold transition ${
              activeTab === "docs"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Dokumen ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chats")}
            className={`flex-1 border-b-2 py-1.5 text-center text-xs font-semibold transition ${
              activeTab === "chats"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Sesi Chat ({chatSessions.length})
          </button>
        </div>
      )}

      {/* Tab Content: Document List or Chat Sessions */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "docs" ? (
          <>
            {!isCollapsed && (
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Daftar Terindeks
                </span>
                <button
                  onClick={onRefreshDocs}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  title="Perbarui daftar dokumen"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : documents.length === 0 ? (
              !isCollapsed && (
                <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center dark:border-zinc-800">
                  <FileText className="mx-auto h-6 w-6 text-zinc-400" />
                  <p className="mt-1 text-xs text-zinc-500">Belum ada dokumen</p>
                  <p className="text-[10px] text-zinc-400">Unggah PDF untuk memulai pencarian RAG</p>
                </div>
              )
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => {
                  const badgeVariant =
                    doc.status === "INDEXED"
                      ? "ready"
                      : doc.status === "PROCESSING"
                      ? "indexing"
                      : "failed";

                  const badgeText =
                    doc.status === "INDEXED"
                      ? "Ready"
                      : doc.status === "PROCESSING"
                      ? "Indexing"
                      : "Failed";

                  return (
                    <div
                      key={doc.id}
                      className="group flex items-start gap-2.5 rounded-lg border border-transparent p-2 transition hover:border-zinc-200 hover:bg-white dark:hover:border-zinc-800 dark:hover:bg-zinc-900/60"
                    >
                      <button
                        type="button"
                        onClick={() => onInspectDocument(doc)}
                        className="mt-0.5 shrink-0 text-zinc-500 group-hover:text-emerald-500 cursor-pointer"
                        title="Klik untuk melihat chunks"
                      >
                        <FileText className="h-4 w-4" />
                      </button>

                      {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onInspectDocument(doc)}
                            className="w-full text-left truncate text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                            title={doc.title}
                          >
                            {doc.title}
                          </button>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">
                              {formatBytes(doc.fileSize)} • {doc.chunkCount} chunks
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                                {badgeText}
                              </Badge>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteDocument(doc.id);
                                }}
                                className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                                title="Hapus dokumen"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Sesi Chat Tab */
          <>
            {!isCollapsed && (
              <div className="mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNewSession}
                  className="w-full justify-start gap-2 text-xs border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Mulai Sesi Chat Baru</span>
                </Button>
              </div>
            )}

            {chatSessions.length === 0 ? (
              !isCollapsed && (
                <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center dark:border-zinc-800">
                  <MessageSquare className="mx-auto h-5 w-5 text-zinc-400" />
                  <p className="mt-1 text-xs text-zinc-500">Belum ada riwayat sesi</p>
                </div>
              )
            ) : (
              <div className="space-y-1">
                {chatSessions.map((session) => {
                  const isEditing = editingSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (!isEditing) onSelectSession(session.id);
                      }}
                      className={`group flex items-center justify-between rounded-lg p-2 text-xs cursor-pointer transition ${
                        activeSessionId === session.id
                          ? "bg-emerald-50/80 font-semibold text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingSessionTitle}
                            onChange={(e) => setEditingSessionTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingSessionTitle.trim() && onRenameSession) {
                                  onRenameSession(session.id, editingSessionTitle.trim());
                                }
                                setEditingSessionId(null);
                              } else if (e.key === "Escape") {
                                setEditingSessionId(null);
                              }
                            }}
                            autoFocus
                            className="w-full rounded border border-emerald-500 bg-white px-2 py-0.5 text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingSessionTitle.trim() && onRenameSession) {
                                onRenameSession(session.id, editingSessionTitle.trim());
                              }
                              setEditingSessionId(null);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5"
                            title="Simpan nama"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                            title="Batal"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 truncate">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <span className="truncate">{session.title}</span>
                          </div>

                          {!isCollapsed && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(session.id);
                                  setEditingSessionTitle(session.title);
                                }}
                                className="text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"
                                title="Ubah judul sesi"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSession(session.id);
                                }}
                                className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                                title="Hapus sesi"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Vector Capacity Indicator & Storage Statistics */}
      {/* Vector Capacity Indicator & Storage Statistics */}
      {!isCollapsed && (
        <div className="border-t border-zinc-200/80 p-3.5 dark:border-zinc-800/80 space-y-2.5">
          {/* Public Plan & Quota Card */}
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-3 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[11px] text-zinc-800 dark:text-zinc-200">
                <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Paket {userPlan}</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">
                {planLimits.queryPerHour} q/jam
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
              <span>Kuota Dokumen</span>
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                {documents.length} / {planLimits.maxDocs} file
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  docUsagePercent >= 100
                    ? "bg-rose-500"
                    : docUsagePercent >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.max(6, docUsagePercent)}%` }}
              />
            </div>
          </div>

          {/* Storage & Vector Chunks Card */}
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-3 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                Kapasitas Vektor
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {totalChunks} / {chunkLimit.toLocaleString()}
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.max(4, usagePercent)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
              <span>HNSW 1536 dims</span>
              <span>{formatBytes(totalBytes)} terpakai</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer: User Profile & Dark/Light Mode Toggle */}
      <div className="relative border-t border-zinc-200/80 p-3 dark:border-zinc-800/80">
        {/* User Role Switcher Popover */}
        {showUserMenu && !isCollapsed && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Alihkan Profil Multi-Tenant
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  void loginDemo("ADMIN");
                  setShowUserMenu(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  user?.role === "ADMIN"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>Alex Pratama (Admin)</span>
                <Badge variant="ready" className="text-[9px] px-1 py-0">
                  ENTERPRISE
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => {
                  void loginDemo("MEMBER");
                  setShowUserMenu(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  user?.role === "MEMBER"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>Sarah Wijaya (Member)</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  PRO
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => {
                  void loginDemo("GUEST");
                  setShowUserMenu(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                  user?.role === "GUEST"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>Tamu Publik (Guest)</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  FREE
                </Badge>
              </button>
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <Link
                href="/login"
                onClick={() => setShowUserMenu(false)}
                className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px]"
              >
                Halaman Login
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <LogOut className="h-3 w-3" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}

        {/* User Card */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
              title="Kelola Akun & Profil Demo"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
                {user ? user.name.slice(0, 2).toUpperCase() : "AP"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {user?.name || "Alex Pratama"}
                  </span>
                  <Badge variant="ready" className="text-[9px] px-1 py-0 shrink-0">
                    {user?.plan || "ENTERPRISE"}
                  </Badge>
                </div>
                <p className="truncate text-[10px] text-zinc-400">
                  {user?.email || "alex.admin@enterprise.corp"}
                </p>
              </div>
              <ChevronUp className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            </button>

            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              title="Alihkan Tema"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs"
              title={user?.name || "Profil Pengguna"}
            >
              {user ? user.name.slice(0, 2).toUpperCase() : "AP"}
            </button>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
