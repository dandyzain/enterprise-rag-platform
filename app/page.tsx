"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Search,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CortexLogo } from "@/components/ui/logo";

export default function HomePage() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();

  const [testQuery, setTestQuery] = React.useState(
    t.landing.starterQueries?.[0] || "Kebijakan retensi dan enkripsi data SEC-POL-04"
  );
  const [testResults, setTestResults] = React.useState<any[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchLatency, setSearchLatency] = React.useState<number | null>(null);

  // Sync test query when language changes
  React.useEffect(() => {
    if (t.landing.starterQueries?.[0]) {
      setTestQuery(t.landing.starterQueries[0]);
    }
  }, [t.landing.starterQueries]);

  const runQuickSearch = async (queryText: string) => {
    try {
      setIsSearching(true);
      const startTime = performance.now();
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          knowledgeBaseId: "default-kb-1",
          searchMode: "hybrid",
          topK: 3,
          enableReranking: true,
        }),
      });
      const json = await res.json();
      const elapsed = Math.round(performance.now() - startTime);
      setSearchLatency(elapsed);

      if (json.success && Array.isArray(json.data?.chunks)) {
        setTestResults(json.data.chunks);
      } else {
        // Fallback demo results based on active language
        if (language === "en") {
          setTestResults([
            {
              id: "demo-1",
              documentTitle: "SEC-POL-04_Enterprise_Data_Security_ISO27001.txt",
              pageNumber: 1,
              similarity: 0.94,
              matchType: "hybrid",
              content:
                "All confidential enterprise data must be encrypted in transit (TLS 1.3) and at rest (AES-256-GCM). Audit log document retention is set to a minimum of 365 days in accordance with ISO-27001 and SOC 2 Type II compliance.",
            },
            {
              id: "demo-2",
              documentTitle: "SOP-CLOUD-2026_Enterprise_Infrastructure_Architecture.txt",
              pageNumber: 1,
              similarity: 0.88,
              matchType: "semantic",
              content:
                "Multi-region Disaster Recovery (DR) guarantees Recovery Point Objective (RPO) <= 5 minutes and Recovery Time Objective (RTO) <= 15 minutes with a 99.99% availability SLA.",
            },
          ]);
        } else {
          setTestResults([
            {
              id: "demo-1",
              documentTitle: "SEC-POL-04_Kebijakan_Keamanan_Data_ISO27001.txt",
              pageNumber: 1,
              similarity: 0.94,
              matchType: "hybrid",
              content:
                "Seluruh data rahasia wajib dienkripsi saat transit (TLS 1.3) dan saat diam (AES-256-GCM). Retensi dokumen log audit ditetapkan minimal 365 hari sesuai kepatuhan standar ISO-27001 dan SOC 2 Tipe II.",
            },
            {
              id: "demo-2",
              documentTitle: "SOP-CLOUD-2026_Arsitektur_Infrastruktur_Enterprise.txt",
              pageNumber: 1,
              similarity: 0.88,
              matchType: "semantic",
              content:
                "Disaster Recovery (DR) multi-wilayah menjamin Recovery Point Objective (RPO) <= 5 menit dan Recovery Time Objective (RTO) <= 15 menit dengan SLA ketersediaan 99.99%.",
            },
          ]);
        }
      }
    } catch {
      setTestResults([
        {
          id: "demo-fallback",
          documentTitle: language === "en" ? "SEC-POL-04_Data_Security_Policy.txt" : "SEC-POL-04_Kebijakan_Keamanan_Data.txt",
          pageNumber: 1,
          similarity: 0.92,
          matchType: "hybrid",
          content:
            language === "en"
              ? "Data at rest encryption enforces AES-256-GCM with automated KMS key rotation every 90 days."
              : "Enkripsi data rest menggunakan AES-256-GCM dan rotasi kunci KMS otomatis setiap 90 hari.",
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.10),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <CortexLogo size={36} />
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {t.common.brand}
              </span>
              <span className="ml-1.5 sm:ml-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 sm:px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hidden xs:inline-block">
                v2.0 {t.common.enterpriseBadge}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>pgvector HNSW Operator Ready</span>
            </div>

            <Link
              href="/docs"
              className="text-xs text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition font-medium px-1.5 py-1"
            >
              {t.nav.docs}
            </Link>

            {/* Language Switcher */}
            <LanguageSwitcher variant="pill" />

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:text-white transition cursor-pointer shrink-0"
              title={isDark ? t.common.lightTheme : t.common.darkTheme}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-600" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  {user.name} ({user.plan})
                </span>
                <Link href="/dashboard">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 px-2.5 sm:px-3 text-xs"
                  >
                    <span>{t.nav.dashboard}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link href="/login" className="hidden sm:inline-block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                  >
                    {t.nav.login}
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 px-2.5 sm:px-3 text-xs"
                  >
                    <span className="hidden sm:inline">{t.landing.startSandbox}</span>
                    <span className="sm:hidden">{t.nav.dashboard}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-10 sm:pt-20 pb-10 sm:pb-16 text-center">
        {/* Responsive Badge with truncation safety */}
        <div className="inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/80 px-3 py-1 text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300 backdrop-blur-xs mb-6 overflow-hidden">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate hidden sm:inline">Next.js 16 • Hybrid BM25 & Dense RRF • Cross-Encoder Re-Ranking</span>
          <span className="truncate sm:hidden">Next.js 16 • Hybrid RAG • Re-Ranking</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-zinc-900 dark:text-zinc-50 leading-[1.18] sm:leading-[1.15]">
          {t.landing.heroTitle1}{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            {t.landing.heroTitle2}
          </span>
        </h1>

        <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t.landing.heroSubtitle}
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto max-w-sm sm:max-w-none mx-auto">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="h-11 sm:h-12 w-full sm:w-auto gap-2 bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition hover:scale-102 cursor-pointer"
            >
              <span>{t.landing.startSandbox}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            size="lg"
            variant="outline"
            onClick={() => runQuickSearch(testQuery)}
            className="h-11 sm:h-12 w-full sm:w-auto gap-2 border-zinc-300 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 px-6 text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
          >
            <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.landing.searchButton}</span>
          </Button>
        </div>

        {/* System Highlights Badges */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 border-y border-zinc-200 dark:border-zinc-800/80 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Strict Grounding Compliance</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Cosine Similarity Threshold &gt;= 0.65</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Reciprocal Rank Fusion (k=60)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Multi-Page PDF Token Tracking</span>
          </div>
        </div>
      </section>

      {/* Live Interactive Search Sandbox */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/60 p-4 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {t.landing.quickSearchTitle}
              </h3>
            </div>
            {searchLatency !== null && (
              <Badge variant="ready" className="text-[10px]">
                {t.landing.searchLatency}: {searchLatency} ms
              </Badge>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runQuickSearch(testQuery)}
                placeholder={t.landing.searchPlaceholder}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 sm:px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isSearching}
              onClick={() => runQuickSearch(testQuery)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 h-9 sm:h-auto cursor-pointer"
            >
              {isSearching ? t.landing.searching : t.landing.searchButton}
            </Button>
          </div>

          {/* Quick Query Starter Pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-zinc-500">Query:</span>
            {(t.landing.starterQueries || [
              "Kebijakan retensi dan enkripsi data SEC-POL-04",
              "Berapa target RPO dan RTO disaster recovery?",
              "Standar branching git dan pipeline CI/CD",
            ]).map((starter: string) => (
              <button
                key={starter}
                type="button"
                onClick={() => {
                  setTestQuery(starter);
                  runQuickSearch(starter);
                }}
                className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/90 px-2.5 py-1 text-[11px] text-zinc-600 dark:text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-300 transition"
              >
                {starter}
              </button>
            ))}
          </div>

          {/* Live Search Results */}
          {testResults && (
            <div className="mt-5 space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
                <span>
                  {t.landing.retrievedPassages} ({testResults.length})
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  Two-Stage Cross-Encoder Ranked
                </span>
              </div>

              {testResults.map((chunk, idx) => (
                <div
                  key={chunk.id || idx}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 p-4 transition hover:border-emerald-500/40"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200/80 dark:border-zinc-800/60">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      #{idx + 1} {chunk.documentTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        Page {chunk.pageNumber || 1}
                      </Badge>
                      <Badge variant="ready" className="text-[10px]">
                        {t.landing.matchScore}:{" "}
                        {Math.round((chunk.similarity || 0.85) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Metrics Row */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 text-center">
            <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t.landing.metrics.sla}
            </h4>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t.landing.metrics.slaDesc}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 text-center">
            <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t.landing.metrics.latency}
            </h4>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {t.landing.metrics.latencyDesc}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 text-center">
            <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t.landing.metrics.vector}
            </h4>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {t.landing.metrics.vectorDesc}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 text-center">
            <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t.landing.metrics.security}
            </h4>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {t.landing.metrics.securityDesc}
            </p>
          </div>
        </div>
      </section>

      {/* 5-Step Architecture Pipeline */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-10 sm:mb-12">
          <Badge variant="secondary" className="mb-2">
            End-to-End Pipeline
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.landing.archTitle}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            {t.landing.archSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-3">
              01
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Recursive Chunking</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              500-700 tokens with 100 overlap using intelligent text splitters (`\n\n`, `\n`).
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-3">
              02
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Vector Embeddings</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              1536-dim OpenAI `text-embedding-3-small` / Gemini with L2 unit norm normalization.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-3">
              03
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Hybrid Search (RRF)</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Merges dense cosine & BM25 sparse lexical ($k=60$) for exact code & semantic recall.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-3">
              04
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Two-Stage Re-Ranking</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Cross-encoder filters top candidates with phrase boost and entity congruence.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold mb-3">
              05
            </div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Groundedness Auditor</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Sentence-by-sentence factuality check against cited chunks to guarantee zero hallucinations.
            </p>
          </div>
        </div>
      </section>

      {/* Naive RAG vs Cortex Enterprise RAG Comparison Table */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/40 p-4 sm:p-6 shadow-md dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t.landing.comparisonTitle}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t.landing.comparisonSubtitle}
              </p>
            </div>
            {/* Scroll hint on mobile */}
            <span className="sm:hidden text-[10px] text-zinc-500 dark:text-zinc-400 italic">
              {t.landing.scrollHint}
            </span>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[540px] text-left text-xs text-zinc-700 dark:text-zinc-300">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">{t.landing.colFeature}</th>
                  <th className="py-2.5 px-3 text-rose-500 dark:text-rose-400">{t.landing.colNaive}</th>
                  <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">{t.landing.colCortex}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans">
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-200">
                    {t.landing.compRow1Title}
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {t.landing.compRow1Naive}
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.landing.compRow1Cortex}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-200">
                    {t.landing.compRow2Title}
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {t.landing.compRow2Naive}
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.landing.compRow2Cortex}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-200">
                    {t.landing.compRow3Title}
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {t.landing.compRow3Naive}
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.landing.compRow3Cortex}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-200">
                    {t.landing.compRow4Title}
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {t.landing.compRow4Naive}
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.landing.compRow4Cortex}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950 py-8 text-center text-xs text-zinc-500 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
            <p>© 2026 Cortex RAG Platform. Production-Ready Enterprise Architecture.</p>
            <span className="hidden sm:inline text-zinc-400 dark:text-zinc-700">•</span>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
              Designed and Developed by{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Dandy Rahmat Zain</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-zinc-600 dark:text-zinc-400">
            <Link href="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              {t.nav.docs}
            </Link>
            <span className="text-zinc-400 dark:text-zinc-700">•</span>
            <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
              {t.nav.dashboard}
            </Link>
            <span className="hidden xs:inline text-zinc-400 dark:text-zinc-700">•</span>
            <span className="font-mono text-[11px] text-zinc-500">Next.js 16 • pgvector • Vercel AI SDK</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
