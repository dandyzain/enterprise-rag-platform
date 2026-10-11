"use client";

import * as React from "react";
import { CitationItem, GroundednessReport, DocumentItem } from "@/lib/rag/types";
import { RagSettings } from "./settings-modal";
import { MarkdownMessage } from "./markdown-message";
import { GroundednessModal } from "./groundedness-modal";
import { evaluateGroundedness } from "@/lib/rag/evaluator";
import {
  Send,
  Sparkles,
  Paperclip,
  Bot,
  User,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  Download,
  PlusCircle,
  Copy,
  Check,
  Search,
  Activity,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface MessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationItem[];
  groundedness?: GroundednessReport | null;
}

interface ChatWorkspaceProps {
  knowledgeBaseId: string;
  activeSessionId: string | null;
  ragSettings: RagSettings;
  documents?: DocumentItem[];
  onSelectCitation: (citation: CitationItem) => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onOpenSearchPlayground: () => void;
  onOpenAnalytics: () => void;
}

const PROMPT_STARTERS = [
  {
    title: "Ringkasan Eksekutif Dokumen",
    prompt: "Tolong ringkas poin utama dan tujuan strategis dari dokumen yang telah diindeks.",
    icon: Layers,
  },
  {
    title: "Temuan Kunci & Rekomendasi",
    prompt: "Apa saja metrik teknis, temuan terpenting, atau rekomendasi utama dalam dokumen?",
    icon: Zap,
  },
  {
    title: "Batasan & Analisis Risiko",
    prompt: "Apakah ada batasan implementasi, mitigasi risiko, atau prasyarat operasional yang disebutkan?",
    icon: ShieldCheck,
  },
];

export function ChatWorkspace({
  knowledgeBaseId,
  activeSessionId,
  ragSettings,
  documents = [],
  onSelectCitation,
  onOpenUpload,
  onOpenSettings,
  onNewChat,
  onOpenSearchPlayground,
  onOpenAnalytics,
}: ChatWorkspaceProps) {
  const [messages, setMessages] = React.useState<MessageUI[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedMsgId, setCopiedMsgId] = React.useState<string | null>(null);
  const [selectedGroundedness, setSelectedGroundedness] = React.useState<GroundednessReport | null>(null);
  const [scopedDocumentId, setScopedDocumentId] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const streamAccumulatorRef = React.useRef<string>("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load session messages if an active session is switched
  React.useEffect(() => {
    let ignore = false;
    void (async () => {
      if (!activeSessionId) {
        await Promise.resolve();
        if (!ignore) {
          setMessages([]);
        }
        return;
      }

      try {
        const res = await fetch(`/api/chat/sessions/${activeSessionId}`);
        const json = await res.json();
        if (!ignore && json.success && Array.isArray(json.data)) {
          setMessages(
            json.data.map(
              (m: {
                id: string;
                role: string;
                content: string;
                citations?: CitationItem[];
                groundedness?: GroundednessReport | null;
              }) => ({
                id: m.id,
                role: m.role.toLowerCase() as "user" | "assistant",
                content: m.content,
                citations: m.citations || undefined,
                groundedness: m.groundedness || undefined,
              })
            )
          );
        }
      } catch (err) {
        console.error("Gagal memuat pesan sesi:", err);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [activeSessionId]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const userMsg: MessageUI = {
      id: userMsgId,
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          knowledgeBaseId,
          chatSessionId: activeSessionId || undefined,
          modelProvider: ragSettings.modelProvider,
          searchMode: ragSettings.searchMode,
          similarityThreshold: ragSettings.similarityThreshold,
          topK: ragSettings.topK,
          enableReranking: ragSettings.enableReranking,
          filterDocumentIds: scopedDocumentId ? [scopedDocumentId] : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal memperoleh respons dari RAG engine.");
      }

      // Parse citations and groundedness from headers if present
      const rawCitations = response.headers.get("x-citations");
      let extractedCitations: CitationItem[] = [];
      if (rawCitations) {
        try {
          extractedCitations = JSON.parse(decodeURIComponent(rawCitations));
        } catch {
          // ignore parsing error
        }
      }

      const rawGroundedness = response.headers.get("x-groundedness");
      let extractedGroundedness: GroundednessReport | null = null;
      if (rawGroundedness) {
        try {
          extractedGroundedness = JSON.parse(decodeURIComponent(rawGroundedness));
        } catch {
          // ignore parsing error
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          citations: extractedCitations,
          groundedness: extractedGroundedness,
        },
      ]);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream reader tidak tersedia.");

      const decoder = new TextDecoder();
      streamAccumulatorRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamAccumulatorRef.current += chunk;
        const currentText = streamAccumulatorRef.current;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: currentText } : m
          )
        );
      }

      // Evaluate groundedness on stream completion if not pre-computed in header
      const finalText = streamAccumulatorRef.current;
      if (!extractedGroundedness && extractedCitations.length > 0) {
        extractedGroundedness = evaluateGroundedness(finalText, extractedCitations, []);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, groundedness: extractedGroundedness } : m
          )
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Gagal menghasilkan jawaban.");
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "Terjadi kesalahan saat memproses jawaban. Silakan coba lagi.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    toast.success("Teks disalin ke papan klip.");
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast.info("Tidak ada percakapan untuk diekspor.");
      return;
    }

    let markdown = `# Transkrip Percakapan RAG Enterprise\nTanggal: ${new Date().toLocaleString("id-ID")}\nKnowledge Base ID: ${knowledgeBaseId}\n\n---\n\n`;

    for (const msg of messages) {
      const sender = msg.role === "user" ? "### Pengguna" : "### AI Knowledge Assistant";
      markdown += `${sender}\n${msg.content}\n\n`;
      if (msg.citations && msg.citations.length > 0) {
        markdown += `**Referensi:**\n`;
        for (const c of msg.citations) {
          markdown += `- [${c.index}] ${c.documentTitle} (Halaman ${c.pageNumber || "N/A"}) - Kemiripan ${c.similarity}%\n`;
        }
        markdown += `\n`;
      }
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cortex-rag-session-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Percakapan berhasil diekspor sebagai Markdown (.md).");
  };

  return (
    <div className="relative flex flex-1 flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Top Subtle Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200/80 px-6 backdrop-blur-md dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Semantic Workspace
          </h2>
          <Badge variant="secondary" className="text-[10px] ml-1">
            Threshold: {ragSettings.similarityThreshold} • Top-{ragSettings.topK}
          </Badge>
        </div>

        {/* Header Actions: New Chat, Playground, Metrics, Export, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="h-8 gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
            title="Mulai sesi percakapan baru"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Sesi Baru</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSearchPlayground}
            className="h-8 gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
            title="Buka Semantic Vector Search Playground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Playground Vektor</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenAnalytics}
            className="h-8 gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
            title="Lihat Metrik & Kesehatan Knowledge Base"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Metrik KB</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExportChat}
            className="h-8 gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
            title="Ekspor percakapan ke Markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ekspor</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={onOpenSettings}
            className="h-8 w-8 text-zinc-600 dark:text-zinc-300"
            title="Buka Pengaturan RAG"
          >
            <Sliders className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Clean Minimalist Empty State Greeting */}
          {messages.length === 0 && (
            <div className="my-8 text-center space-y-8 animate-in fade-in duration-500">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Selamat Datang di Enterprise Knowledge Base
                </h1>
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Mesin RAG ini menggunakan pencarian vektor kosinus dengan prinsip{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Strict Grounding
                  </span>
                  . Setiap jawaban diverifikasi langsung dari potongan dokumen terindeks lengkap dengan penanda sitasi sumber.
                </p>
              </div>

              {/* 3 Prompt Starter Chips */}
              <div className="grid gap-3 pt-4 sm:grid-cols-3 text-left">
                {PROMPT_STARTERS.map((starter, i) => {
                  const Icon = starter.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(starter.prompt)}
                      className="group flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 text-left shadow-2xs transition-all hover:border-emerald-500/80 hover:bg-emerald-50/20 hover:shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900/60 dark:hover:border-emerald-500/80 dark:hover:bg-zinc-900 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-zinc-100 p-2 text-zinc-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-400">
                          <Icon className="h-4 w-4" />
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-400 opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5" />
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {starter.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {starter.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Thread */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-emerald-600 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-2xs ${
                  msg.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-medium"
                    : "border border-zinc-200/80 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200"
                }`}
              >
                {/* Assistant Answer or User Query */}
                {msg.role === "assistant" ? (
                  <div>
                    <MarkdownMessage
                      content={msg.content}
                      citations={msg.citations}
                      onSelectCitation={onSelectCitation}
                    />
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800/60">
                        <span className="text-[11px] font-medium text-zinc-400">
                          Referensi Terverifikasi:
                        </span>
                        {msg.citations.map((cite) => (
                          <Badge
                            key={cite.index}
                            variant="citation"
                            onClick={() => onSelectCitation(cite)}
                          >
                            [{cite.index}] {cite.documentTitle.slice(0, 18)}...
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Groundedness Audit Badge & Copy Action */}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800/50">
                      <div>
                        {msg.groundedness ? (
                          <button
                            type="button"
                            onClick={() => setSelectedGroundedness(msg.groundedness || null)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:scale-105 active:scale-95 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/80 cursor-pointer"
                            title="Buka audit kepatuhan Groundedness & Anti-Halusinasi"
                          >
                            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{msg.groundedness.score}% Grounded</span>
                            <span className="text-zinc-300 dark:text-zinc-600">•</span>
                            <span className="font-normal text-zinc-500 dark:text-zinc-400">
                              Risiko: {msg.groundedness.hallucinationRisk}
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                            <ShieldCheck className="h-3 w-3 text-zinc-400" />
                            <span>Strict Grounding Aktif</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                        title="Salin jawaban"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming Cursor Indicator */}
          {isLoading && (
            <div className="flex gap-3.5 justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-emerald-600 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm text-zinc-500 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/70">
                <span>Mencari vektor relevan & merumuskan jawaban</span>
                <span className="inline-block h-3.5 w-1.5 bg-emerald-500 animate-cursor-blink" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="mx-auto max-w-3xl pointer-events-auto">
          <div className="relative rounded-2xl border border-zinc-200/90 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-900/95">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan apapun mengenai dokumen terindeks... (Tekan Enter untuk kirim)"
              rows={1}
              className="w-full resize-none bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500 min-h-[42px] max-h-32"
            />

            <div className="flex items-center justify-between border-t border-zinc-100 pt-2 px-1 dark:border-zinc-800/70">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOpenUpload}
                  className="h-8 gap-1.5 px-2 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Lampirkan Dokumen</span>
                </Button>

                {documents && documents.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400 hidden md:inline">Cakupan:</span>
                    <select
                      value={scopedDocumentId || ""}
                      onChange={(e) => setScopedDocumentId(e.target.value || null)}
                      className="rounded-lg border border-zinc-200 bg-white/90 px-2 py-1 text-[11px] text-zinc-700 transition hover:border-zinc-300 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 max-w-[170px] truncate cursor-pointer"
                      title="Filter cakupan retrieval ke dokumen tertentu"
                    >
                      <option value="">Semua Dokumen ({documents.length})</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                  Strict Grounding Aktif
                </Badge>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="h-8 gap-1.5 px-3 text-xs"
              >
                <span>Kirim</span>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Groundedness & Anti-Hallucination Audit Modal */}
      <GroundednessModal
        isOpen={Boolean(selectedGroundedness)}
        onClose={() => setSelectedGroundedness(null)}
        report={selectedGroundedness}
      />
    </div>
  );
}

