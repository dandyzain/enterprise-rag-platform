"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Key,
  Play,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CortexLogo } from "@/components/ui/logo";

interface CodeSnippet {
  curl: string;
  typescript: string;
  python: string;
}

const SNIPPETS: Record<string, CodeSnippet> = {
  chat: {
    curl: `curl -X POST http://localhost:3000/api/chat \\
  -H "Content-Type: application/json" \\
  -H "x-custom-openai-key: sk-proj-..." \\
  -d '{
    "messages": [
      { "role": "user", "content": "Explain enterprise cloud architecture and RPO/RTO policy." }
    ],
    "knowledgeBaseId": "default-kb-1",
    "searchMode": "hybrid",
    "similarityThreshold": 0.65,
    "topK": 5,
    "enableReranking": true
  }'`,
    typescript: `import { fetch } from "undici";

const response = await fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // Optional: Bring-Your-Own-Key to bypass public tier rate limits
    "x-custom-openai-key": process.env.OPENAI_API_KEY || "",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "What are the ISO 27001 data security standards?" }],
    knowledgeBaseId: "default-kb-1",
    searchMode: "hybrid",
    topK: 5,
  }),
});

// Read citation headers and groundedness audit
const citations = JSON.parse(decodeURIComponent(response.headers.get("x-citations") || "[]"));
const groundedness = JSON.parse(decodeURIComponent(response.headers.get("x-groundedness") || "{}"));

// Read streaming answer text
const reader = response.body?.getReader();
// ... stream processing`,
    python: `import requests
import json
import urllib.parse

url = "http://localhost:3000/api/chat"
headers = {
    "Content-Type": "application/json",
    "x-custom-openai-key": "sk-proj-..." # Optional BYOK
}
payload = {
    "messages": [{"role": "user", "content": "What is the disaster recovery architecture standard?"}],
    "knowledgeBaseId": "default-kb-1",
    "searchMode": "hybrid",
    "topK": 5
}

response = requests.post(url, headers=headers, json=payload, stream=True)

# Parse verified citations
raw_citations = response.headers.get("x-citations")
if raw_citations:
    citations = json.loads(urllib.parse.unquote(raw_citations))
    print(f"Citations Found: {len(citations)}")

for chunk in response.iter_content(chunk_size=128):
    if chunk:
        print(chunk.decode("utf-8"), end="", flush=True)`,
  },
  search: {
    curl: `curl -X POST http://localhost:3000/api/search \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "TLS 1.3 encryption and data retention policy",
    "knowledgeBaseId": "default-kb-1",
    "searchMode": "hybrid",
    "topK": 3,
    "enableReranking": true
  }'`,
    typescript: `const res = await fetch("http://localhost:3000/api/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "Disaster Recovery multi-region SLA",
    knowledgeBaseId: "default-kb-1",
    searchMode: "hybrid",
    topK: 3,
    enableReranking: true
  })
});
const data = await res.json();
console.log(data.data.chunks);`,
    python: `import requests

res = requests.post(
    "http://localhost:3000/api/search",
    json={
        "query": "AES-256 data at rest encryption",
        "knowledgeBaseId": "default-kb-1",
        "searchMode": "hybrid",
        "topK": 3,
        "enableReranking": True
    }
)
print(res.json())`,
  },
  ingest: {
    curl: `curl -X POST http://localhost:3000/api/documents/ingest \\
  -F "file=@/path/to/documentation_sop.pdf" \\
  -F "knowledgeBaseId=default-kb-1"`,
    typescript: `import fs from "fs";

const formData = new FormData();
formData.append("file", new Blob([fs.readFileSync("sop.pdf")]), "sop.pdf");
formData.append("knowledgeBaseId", "default-kb-1");

const res = await fetch("http://localhost:3000/api/documents/ingest", {
  method: "POST",
  body: formData,
});
const result = await res.json();
console.log("Ingested:", result.data.document.title);`,
    python: `import requests

files = {"file": open("sop.pdf", "rb")}
data = {"knowledgeBaseId": "default-kb-1"}

res = requests.post("http://localhost:3000/api/documents/ingest", files=files, data=data)
print(res.json())`,
  },
};

export default function DocsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();
  const [selectedLang, setSelectedLang] = React.useState<"curl" | "typescript" | "python">("curl");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Live Console Tester State
  const [consoleQuery, setConsoleQuery] = React.useState(
    language === "en" ? "Data retention policy SEC-POL-04" : "Kebijakan retensi dokumen SEC-POL-04"
  );
  const [consoleMode, setConsoleMode] = React.useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [consoleTopK, setConsoleTopK] = React.useState(3);
  const [consoleReranking, setConsoleReranking] = React.useState(true);
  const [consoleLoading, setConsoleLoading] = React.useState(false);
  const [consoleResponse, setConsoleResponse] = React.useState<any | null>(null);
  const [consoleLatency, setConsoleLatency] = React.useState<number | null>(null);
  const [consoleStatus, setConsoleStatus] = React.useState<number | null>(null);

  React.useEffect(() => {
    setConsoleQuery(
      language === "en"
        ? "Data retention policy SEC-POL-04"
        : "Kebijakan retensi dokumen SEC-POL-04"
    );
  }, [language]);

  const handleRunConsoleTest = async () => {
    try {
      setConsoleLoading(true);
      setConsoleResponse(null);
      setConsoleLatency(null);
      setConsoleStatus(null);
      const start = performance.now();

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: consoleQuery,
          knowledgeBaseId: "default-kb-1",
          searchMode: consoleMode,
          topK: consoleTopK,
          enableReranking: consoleReranking,
        }),
      });
      const elapsed = Math.round(performance.now() - start);
      setConsoleLatency(elapsed);
      setConsoleStatus(res.status);
      const json = await res.json();
      setConsoleResponse(json);
      toast.success(
        language === "en"
          ? `Response received (${res.status} in ${elapsed}ms)`
          : `Respons diterima (${res.status} dalam ${elapsed}ms)`
      );
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || (language === "en" ? "Failed to contact endpoint." : "Gagal menghubungi endpoint."));
    } finally {
      setConsoleLoading(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(language === "en" ? "Code copied to clipboard!" : "Kode disalin ke papan klip!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(16,185,129,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <CortexLogo size={34} />
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Cortex RAG</span>
            </Link>
            <span className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hidden sm:inline-block">
              API Docs v2.0
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition px-1.5 py-1"
            >
              {t.common.back}
            </Link>

            <LanguageSwitcher variant="pill" />

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:text-white transition cursor-pointer shrink-0"
              title={isDark ? t.common.lightTheme : t.common.darkTheme}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-600" />}
            </button>
            <Link href="/dashboard">
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 text-xs px-2.5 sm:px-3"
              >
                <span>{t.nav.dashboard}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 flex gap-6 lg:gap-10">
        {/* Left Sticky Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-26 space-y-6">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {t.docs.quickstart}
              </h4>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  <a href="#overview" className="block rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    {language === "en" ? "RAG Engine Architecture" : "Arsitektur RAG Engine"}
                  </a>
                </li>
                <li>
                  <a href="#authentication" className="block rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    {language === "en" ? "Authentication & BYOK" : "Autentikasi & BYOK"}
                  </a>
                </li>
                <li>
                  <a href="#rate-limits" className="block rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    {language === "en" ? "Rate Limits & Quota" : "Rate Limits & Kuota"}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {t.docs.endpointsTitle}
              </h4>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  <a href="#endpoint-chat" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    <span>POST /api/chat</span>
                    <Badge variant="ready" className="text-[9px] px-1 py-0">Stream</Badge>
                  </a>
                </li>
                <li>
                  <a href="#endpoint-search" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    <span>POST /api/search</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">Vector</Badge>
                  </a>
                </li>
                <li>
                  <a href="#endpoint-ingest" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    <span>POST /api/documents/ingest</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">PII</Badge>
                  </a>
                </li>
                <li>
                  <a href="#endpoint-health" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    <span>GET /api/health</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">Status</Badge>
                  </a>
                </li>
                <li>
                  <a href="#live-console" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
                    <span>{t.docs.sandboxTitle}</span>
                    <Badge variant="ready" className="text-[9px] px-1 py-0">Tester</Badge>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-8 sm:space-y-12">
          {/* Mobile Jump Navigation Bar */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="text-zinc-500 text-[11px] shrink-0 font-medium">Nav:</span>
            <a href="#overview" className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">Overview</a>
            <a href="#authentication" className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">BYOK</a>
            <a href="#endpoint-chat" className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">POST /chat</a>
            <a href="#endpoint-search" className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">POST /search</a>
            <a href="#endpoint-ingest" className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">Ingest File</a>
            <a href="#live-console" className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-emerald-700 dark:text-emerald-400 font-semibold">Sandbox</a>
          </div>

          {/* 1. Overview */}
          <section id="overview" className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="ready" className="text-xs">
                Developer API Reference
              </Badge>
              <span className="text-xs text-zinc-500">Next.js 16 • pgvector • AI SDK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {t.docs.title}
            </h1>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t.docs.subtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-3.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-200">Strict Grounding</h3>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {language === "en" ? "Anti-hallucination verified with citations [1], [2]." : "Anti-halusinasi terverifikasi sitasi [1], [2]."}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-3.5">
                <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-200">Ultra-Low Latency</h3>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {language === "en" ? "Streaming responses via Server-Sent Events." : "Streaming respons via Server-Sent Events."}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-3.5">
                <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-200">Bypass Quota (BYOK)</h3>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {language === "en" ? "Custom OpenAI & Gemini API key support." : "Dukungan kunci OpenAI & Gemini pribadi."}
                </p>
              </div>
            </div>
          </section>

          {/* 2. Authentication & BYOK */}
          <section id="authentication" className="space-y-4 border-t border-zinc-200 dark:border-zinc-800/80 pt-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.docs.authTitle}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.docs.authDesc}
            </p>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                {language === "en" ? "Key Request Headers:" : "Header Permintaan Kunci:"}
              </h4>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <code className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0">
                    x-custom-openai-key
                  </code>
                  <span>
                    {language === "en"
                      ? "(Optional) Personal OpenAI API Key (sk-...). Bypasses public rate limits and uses GPT-4o Mini with your account."
                      : "(Opsional) API Key OpenAI pribadi (sk-...). Membebaskan kuota rate limit dan menggunakan GPT-4o Mini dengan akun Anda."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <code className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0">
                    x-custom-gemini-key
                  </code>
                  <span>
                    {language === "en"
                      ? "(Optional) Personal Google Gemini API Key (AIzaSy...). Bypasses public rate limits and uses Gemini 1.5 Flash."
                      : "(Opsional) API Key Google Gemini pribadi (AIzaSy...). Membebaskan kuota rate limit dan menggunakan Gemini 1.5 Flash."}
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Language Selector */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 pt-4">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {language === "en" ? "Select Code Example:" : "Pilih Bahasa Kode Contoh:"}
            </span>
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-0.5">
              {(["curl", "typescript", "python"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
                    selectedLang === lang
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {lang === "curl" ? "cURL" : lang === "typescript" ? "TypeScript" : "Python"}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Endpoint: POST /api/chat */}
          <section id="endpoint-chat" className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="ready" className="text-xs">POST</Badge>
              <code className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">/api/chat</code>
              <Badge variant="secondary" className="text-[10px]">Streaming RAG</Badge>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {language === "en"
                ? "Generates grounded answers against indexed enterprise documents. Returns streamed text with verified citation metadata and anti-hallucination compliance scores in response headers."
                : "Menghasilkan jawaban berbasis grounding terhadap dokumen yang diindeks. Mengembalikan stream teks beserta metadata sitasi terverifikasi dan skor kepatuhan anti-halusinasi pada response header."}
            </p>

            {/* Code snippet block */}
            <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-950 p-4">
              <button
                type="button"
                onClick={() => handleCopy("chat", SNIPPETS.chat[selectedLang])}
                className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                {copiedKey === "chat" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "chat" ? (language === "en" ? "Copied" : "Tersalin") : (language === "en" ? "Copy" : "Salin")}</span>
              </button>
              <pre className="overflow-x-auto font-mono text-xs text-zinc-200 pr-16 leading-relaxed">
                {SNIPPETS.chat[selectedLang]}
              </pre>
            </div>

            {/* Response Headers Details */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 p-4">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                {language === "en" ? "Important Response Headers:" : "Header Respons Penting:"}
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <code className="font-mono text-emerald-600 dark:text-emerald-400">x-citations</code>:{" "}
                  {language === "en"
                    ? "JSON array containing verified citation passages"
                    : "JSON array berisi daftar kutipan sitasi terverifikasi"}{" "}
                  (<code className="text-zinc-700 dark:text-zinc-300">[{`{ index, chunkId, documentTitle, similarity }`}]</code>)
                </li>
                <li>
                  <code className="font-mono text-emerald-600 dark:text-emerald-400">x-groundedness</code>:{" "}
                  {language === "en" ? "Anti-hallucination compliance audit" : "JSON evaluasi anti-halusinasi"}{" "}
                  (<code className="text-zinc-700 dark:text-zinc-300">[{`{ score: 100, hallucinationRisk: "LOW" }`}]</code>)
                </li>
                <li>
                  <code className="font-mono text-emerald-600 dark:text-emerald-400">X-RateLimit-Limit</code> & <code className="font-mono text-emerald-600 dark:text-emerald-400">X-RateLimit-Remaining</code>:{" "}
                  {language === "en" ? "Account quota status per hour window." : "Status kuota kueri akun per jam."}
                </li>
              </ul>
            </div>
          </section>

          {/* 4. Endpoint: POST /api/search */}
          <section id="endpoint-search" className="space-y-4 border-t border-zinc-200 dark:border-zinc-800/80 pt-8">
            <div className="flex items-center gap-2">
              <Badge variant="ready" className="text-xs">POST</Badge>
              <code className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">/api/search</code>
              <Badge variant="outline" className="text-[10px]">Retrieval Playground</Badge>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {language === "en"
                ? "Executes hybrid retrieval (Dense Vector + BM25 Lexical) via Reciprocal Rank Fusion (RRF) and Cross-Encoder Re-Ranking without forwarding to LLM generators."
                : "Melakukan pencarian hybrid (Dense Vector + BM25 Lexical) dengan Reciprocal Rank Fusion (RRF) dan Re-Ranking Cross-Encoder tanpa meneruskan ke model LLM."}
            </p>

            <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-950 p-4">
              <button
                type="button"
                onClick={() => handleCopy("search", SNIPPETS.search[selectedLang])}
                className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                {copiedKey === "search" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "search" ? (language === "en" ? "Copied" : "Tersalin") : (language === "en" ? "Copy" : "Salin")}</span>
              </button>
              <pre className="overflow-x-auto font-mono text-xs text-zinc-200 pr-16 leading-relaxed">
                {SNIPPETS.search[selectedLang]}
              </pre>
            </div>
          </section>

          {/* 5. Endpoint: POST /api/documents/ingest */}
          <section id="endpoint-ingest" className="space-y-4 border-t border-zinc-200 dark:border-zinc-800/80 pt-8">
            <div className="flex items-center gap-2">
              <Badge variant="ready" className="text-xs">POST</Badge>
              <code className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">/api/documents/ingest</code>
              <Badge variant="outline" className="text-[10px]">Sanitized Ingest</Badge>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {language === "en"
                ? "Uploads PDF, TXT, or Markdown documents. Automatically validates binary magic bytes and redacts sensitive PII (NIK ID numbers, credit cards, API secrets) before chunking and embedding into pgvector."
                : "Mengunggah dokumen PDF, TXT, atau Markdown. Secara otomatis memvalidasi magic bytes biner dan menyensor data pribadi sensitif (NIK KTP, nomor kartu kredit, rahasia API token) sebelum dipecah menjadi chunks dan disimpan ke vector store."}
            </p>

            <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-950 p-4">
              <button
                type="button"
                onClick={() => handleCopy("ingest", SNIPPETS.ingest[selectedLang])}
                className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                {copiedKey === "ingest" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "ingest" ? (language === "en" ? "Copied" : "Tersalin") : (language === "en" ? "Copy" : "Salin")}</span>
              </button>
              <pre className="overflow-x-auto font-mono text-xs text-zinc-200 pr-16 leading-relaxed">
                {SNIPPETS.ingest[selectedLang]}
              </pre>
            </div>
          </section>

          {/* 6. Health & Metrics */}
          <section id="endpoint-health" className="space-y-4 border-t border-zinc-200 dark:border-zinc-800/80 pt-8 pb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">GET</Badge>
              <code className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">/api/health</code>
              <Badge variant="ready" className="text-[10px]">Telemetry</Badge>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {language === "en"
                ? "Returns real-time database connection status, chunking parameters, and knowledge base document telemetry."
                : "Mengembalikan status kesehatan basis data, parameter chunking, dan metrik jumlah dokumen secara real-time."}
            </p>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 p-4 font-mono text-xs text-zinc-800 dark:text-zinc-300">
              GET http://localhost:3000/api/health
            </div>
          </section>

          {/* 7. Live Interactive API Console & Sandbox */}
          <section id="live-console" className="space-y-4 border-t border-zinc-200 dark:border-zinc-800/80 pt-8 pb-16">
            <div className="flex items-center gap-2">
              <Badge variant="ready" className="text-xs">Sandbox</Badge>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.docs.sandboxTitle}</h2>
              <Badge variant="secondary" className="text-[10px]">Real-Time</Badge>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t.docs.sandboxDesc}
            </p>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-5 space-y-4 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {language === "en" ? "Search Query (Query Term)" : "Query Pencarian (Search Term)"}
                  </label>
                  <input
                    type="text"
                    value={consoleQuery}
                    onChange={(e) => setConsoleQuery(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder={language === "en" ? "Enter search query..." : "Masukkan pertanyaan pencarian..."}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {language === "en" ? "Search Engine Mode" : "Mode Mesin"}
                  </label>
                  <select
                    value={consoleMode}
                    onChange={(e) => setConsoleMode(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="hybrid">Hybrid (RRF Dense+BM25)</option>
                    <option value="semantic">Semantic (Cosine Only)</option>
                    <option value="keyword">Keyword (Sparse BM25)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Top-K</label>
                  <select
                    value={consoleTopK}
                    onChange={(e) => setConsoleTopK(parseInt(e.target.value, 10))}
                    className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value={2}>Top 2 Chunks</option>
                    <option value={3}>Top 3 Chunks</option>
                    <option value={5}>Top 5 Chunks</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consoleReranking}
                    onChange={(e) => setConsoleReranking(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>
                    {language === "en" ? "Enable Cross-Encoder Re-Ranking" : "Aktifkan Cross-Encoder Re-Ranking"}
                  </span>
                </label>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleRunConsoleTest}
                  disabled={consoleLoading}
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {consoleLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{language === "en" ? "Sending..." : "Mengirim..."}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>{t.docs.tryEndpoint}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Console Output */}
              {consoleResponse && (
                <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {language === "en" ? "Response Status:" : "Status Respons:"}
                      </span>
                      <Badge variant="ready" className="text-[10px]">
                        {consoleStatus} OK
                      </Badge>
                      {consoleLatency !== null && (
                        <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                          {consoleLatency} ms
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy("console_res", JSON.stringify(consoleResponse, null, 2))}
                      className="text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "console_res" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>
                        {copiedKey === "console_res"
                          ? (language === "en" ? "Copied" : "Tersalin")
                          : (language === "en" ? "Copy JSON" : "Salin JSON")}
                      </span>
                    </button>
                  </div>
                  <pre className="max-h-72 overflow-y-auto font-mono text-[11px] text-emerald-600 dark:text-emerald-300 leading-relaxed">
                    {JSON.stringify(consoleResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>

          {/* Footer Credit */}
          <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-800/80 pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <p>© 2026 Cortex RAG Platform. Production-Ready Enterprise Architecture.</p>
              <span className="hidden sm:inline text-zinc-400 dark:text-zinc-700">•</span>
              <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                Designed and Developed by{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Dandy Rahmat Zain</span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                {t.common.back}
              </Link>
              <span>•</span>
              <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                {t.nav.dashboard}
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
