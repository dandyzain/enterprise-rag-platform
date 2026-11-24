"use client";

import * as React from "react";
import Link from "next/link";
import { m, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Zap, Search, CheckCircle2, Sparkles, Sun, Moon, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CortexLogo } from "@/components/ui/logo";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AnimatedWords, Reveal, Stagger, StaggerItem, riseVariants } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { Spotlight } from "@/components/motion/spotlight";
import { Magnetic } from "@/components/motion/magnetic";
import { ScrollProgress, useScrolled } from "@/components/motion/scroll";
import { HeroBackdrop } from "@/components/marketing/hero-backdrop";
import { PipelineRail } from "@/components/marketing/pipeline-rail";
import { ease, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const heroOrchestration: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const headlineOrchestration: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const gradientWipe: Variants = {
  hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
  visible: {
    opacity: 1,
    clipPath: "inset(0 0% 0 0)",
    transition: { duration: 0.9, ease: ease.out, delay: 0.15 },
  },
};

/** Shape of a passage shown in the landing search preview (API chunk or demo fallback). */
interface SearchPreviewChunk {
  id?: string;
  documentTitle: string;
  pageNumber?: number | null;
  similarity?: number;
  matchType?: string;
  content: string;
}

const listOrchestration: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function HomePage() {
  return (
    <MotionProvider>
      <HomeContent />
    </MotionProvider>
  );
}

function HomeContent() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const scrolled = useScrolled(8);
  const sandboxRef = React.useRef<HTMLElement>(null);

  const [testQuery, setTestQuery] = React.useState(
    t.landing.starterQueries?.[0] || "Kebijakan retensi dan enkripsi data SEC-POL-04"
  );
  const [testResults, setTestResults] = React.useState<SearchPreviewChunk[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchLatency, setSearchLatency] = React.useState<number | null>(null);
  const [searchRun, setSearchRun] = React.useState(0);

  // Sync test query when language changes (adjust state during render instead of an effect)
  const [queryStarters, setQueryStarters] = React.useState(t.landing.starterQueries);
  if (queryStarters !== t.landing.starterQueries) {
    setQueryStarters(t.landing.starterQueries);
    if (t.landing.starterQueries?.[0]) {
      setTestQuery(t.landing.starterQueries[0]);
    }
  }

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
      setSearchRun((n) => n + 1);
    }
  };

  // Hero "Search" runs the demo and brings the playground into view
  const runHeroSearch = () => {
    sandboxRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    void runQuickSearch(testQuery);
  };

  const highlights = [
    "Strict Grounding Compliance",
    "Cosine Similarity Threshold >= 0.65",
    "Reciprocal Rank Fusion (k=60)",
    "Multi-Page PDF Token Tracking",
  ];

  const metrics = [
    { value: t.landing.metrics.sla, desc: t.landing.metrics.slaDesc, count: true },
    { value: t.landing.metrics.latency, desc: t.landing.metrics.latencyDesc, count: true },
    { value: t.landing.metrics.vector, desc: t.landing.metrics.vectorDesc, count: true },
    { value: t.landing.metrics.security, desc: t.landing.metrics.securityDesc, count: false },
  ];

  const comparisonRows = [
    { title: t.landing.compRow1Title, naive: t.landing.compRow1Naive, cortex: t.landing.compRow1Cortex },
    { title: t.landing.compRow2Title, naive: t.landing.compRow2Naive, cortex: t.landing.compRow2Cortex },
    { title: t.landing.compRow3Title, naive: t.landing.compRow3Naive, cortex: t.landing.compRow3Cortex },
    { title: t.landing.compRow4Title, naive: t.landing.compRow4Naive, cortex: t.landing.compRow4Cortex },
  ];

  const primaryCta =
    "btn-shine group gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover shadow-md shadow-emerald-600/20 px-2.5 sm:px-3 text-xs";

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <ScrollProgress />
      <HeroBackdrop />

      {/* Top Navigation — sticky, gains a surface + shadow once scrolled */}
      <m.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: ease.out }}
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "border-zinc-200/80 bg-white/85 shadow-elevation-2 dark:border-zinc-800/80 dark:bg-zinc-950/80"
            : "border-transparent bg-white/40 dark:bg-zinc-950/30"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={cn("transition-transform duration-300 ease-out-expo", scrolled && "scale-90")}>
              <CortexLogo size={36} />
            </div>
            <div className="min-w-0">
              <span className="whitespace-nowrap text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {t.common.brand}
              </span>
              <span className="ml-1.5 sm:ml-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 sm:px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hidden xs:inline-block">
                v2.0 {t.common.enterpriseBadge}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>pgvector HNSW Operator Ready</span>
            </div>

            <Link
              href="/docs"
              className="relative hidden sm:inline-flex whitespace-nowrap text-xs text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition font-medium px-1.5 py-1 after:absolute after:inset-x-1.5 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {t.nav.docs}
            </Link>

            {/* Language Switcher */}
            <LanguageSwitcher variant="pill" />

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="group flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:text-white transition cursor-pointer shrink-0"
              title={isDark ? t.common.lightTheme : t.common.darkTheme}
              aria-label={isDark ? t.common.lightTheme : t.common.darkTheme}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={isDark ? "sun" : "moon"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.2, ease: ease.out }}
                  className="flex"
                >
                  {isDark ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-zinc-600" />
                  )}
                </m.span>
              </AnimatePresence>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  {user.name} ({user.plan})
                </span>
                <Button asChild variant="default" size="sm" className={primaryCta}>
                  <Link href="/dashboard">
                    <span>{t.nav.dashboard}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex text-xs text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  <Link href="/login">{t.nav.login}</Link>
                </Button>
                <Button asChild variant="default" size="sm" className={primaryCta}>
                  <Link href="/dashboard">
                    <span className="hidden sm:inline">{t.landing.startSandbox}</span>
                    <span className="sm:hidden">{t.nav.dashboard}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </m.header>

      {/* Hero Section — choreographed entrance */}
      <m.section
        initial="hidden"
        animate="visible"
        variants={heroOrchestration}
        className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 pt-10 sm:pt-20 pb-10 sm:pb-16 text-center"
      >
        {/* Responsive Badge with truncation safety */}
        <m.div
          variants={riseVariants(10)}
          className="inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/80 px-3 py-1 text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300 backdrop-blur-xs mb-6 overflow-hidden"
        >
          <m.span
            animate={reduceMotion ? undefined : { rotate: [0, 18, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, ease: ease.standard, repeat: Infinity, repeatDelay: 3.2 }}
            className="flex shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </m.span>
          <span className="truncate hidden sm:inline">Next.js 16 • Hybrid BM25 & Dense RRF • Lexical Re-Ranking</span>
          <span className="truncate sm:hidden">Next.js 16 • Hybrid RAG • Re-Ranking</span>
        </m.div>

        <m.h1
          variants={headlineOrchestration}
          className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-zinc-900 dark:text-zinc-50 leading-[1.18] sm:leading-[1.15]"
        >
          <AnimatedWords text={t.landing.heroTitle1} />{" "}
          <m.span variants={gradientWipe} className="text-gradient-signal inline-block pb-1">
            {t.landing.heroTitle2}
          </m.span>
        </m.h1>

        <m.p
          variants={riseVariants(12)}
          className="mx-auto mt-4 sm:mt-6 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-zinc-600 dark:text-zinc-400"
        >
          {t.landing.heroSubtitle}
        </m.p>

        {/* CTA Buttons */}
        <m.div
          variants={riseVariants(12)}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto max-w-sm sm:max-w-none mx-auto"
        >
          <Magnetic className="w-full sm:w-auto">
            <Button
              asChild
              size="lg"
              className="btn-shine group h-11 sm:h-12 w-full sm:w-auto gap-2 bg-primary px-7 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Link href="/dashboard">
                <span>{t.landing.startSandbox}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>
          </Magnetic>

          <Button
            size="lg"
            variant="outline"
            onClick={runHeroSearch}
            className="group h-11 sm:h-12 w-full sm:w-auto gap-2 border-zinc-300 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60 px-6 text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer backdrop-blur-sm"
          >
            <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
            <span>{t.landing.searchButton}</span>
          </Button>
        </m.div>

        {/* System Highlights Badges */}
        <m.div
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
          className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 border-y border-zinc-200 dark:border-zinc-800/80 py-4 text-xs text-zinc-600 dark:text-zinc-400"
        >
          {highlights.map((label) => (
            <m.div key={label} variants={riseVariants(8)} className="flex items-center gap-2">
              <m.span
                variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: spring.pop } }}
                className="flex shrink-0"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </m.span>
              <span>{label}</span>
            </m.div>
          ))}
        </m.div>
      </m.section>

      {/* Live Interactive Search Sandbox */}
      <section ref={sandboxRef} className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 scroll-mt-24">
        <Reveal distance={24}>
          <Spotlight className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/60 p-4 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl">
            {isSearching && <span aria-hidden="true" className="scan-beam" />}

            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <m.span
                  animate={isSearching && !reduceMotion ? { scale: [1, 1.25, 1], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, repeat: isSearching ? Infinity : 0 }}
                  className="flex"
                >
                  <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </m.span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {t.landing.quickSearchTitle}
                </h3>
              </div>
              <AnimatePresence mode="popLayout">
                {searchLatency !== null && (
                  <m.div
                    key={`latency-${searchRun}`}
                    initial={{ opacity: 0, scale: 0.8, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={spring.pop}
                    className="flex"
                  >
                    <Badge variant="ready" className="text-[10px]">
                      {t.landing.searchLatency}: {searchLatency} ms
                    </Badge>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-colors duration-300",
                    isSearching ? "text-emerald-500" : "text-zinc-400"
                  )}
                />
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runQuickSearch(testQuery)}
                  placeholder={t.landing.searchPlaceholder}
                  aria-label={t.landing.searchPlaceholder}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-3.5 sm:pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-shadow duration-300 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
                />
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isSearching}
                onClick={() => runQuickSearch(testQuery)}
                className="btn-shine bg-primary text-primary-foreground hover:bg-primary-hover text-xs px-4 h-9 sm:h-auto cursor-pointer"
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
                  className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/90 px-2.5 py-1 text-[11px] text-zinc-600 dark:text-zinc-400 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:text-emerald-600 hover:shadow-sm active:translate-y-0 dark:hover:text-emerald-300 cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>

            {/* Live Search Results */}
            <div aria-live="polite" aria-busy={isSearching}>
              <AnimatePresence mode="wait" initial={false}>
                {isSearching ? (
                  <m.div
                    key="searching"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className="mt-5 space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/80"
                  >
                    <div className="text-xs font-semibold">
                      <span className="text-shimmer">{t.landing.searching}</span>
                    </div>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="space-y-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 p-4"
                      >
                        <Skeleton className="h-3 w-2/5" />
                        <Skeleton className="h-1 w-full" />
                        <Skeleton className="h-2.5 w-full" />
                        <Skeleton className="h-2.5 w-4/5" />
                      </div>
                    ))}
                  </m.div>
                ) : testResults ? (
                  <m.div
                    key={`results-${searchRun}`}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    variants={listOrchestration}
                    className="mt-5 space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/80"
                  >
                    <m.div
                      variants={riseVariants(6)}
                      className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 font-semibold"
                    >
                      <span>
                        {t.landing.retrievedPassages} ({testResults.length})
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        Two-Stage Lexical Re-ranked
                      </span>
                    </m.div>

                    {testResults.map((chunk, idx) => {
                      const score = Math.round((chunk.similarity || 0.85) * 100);
                      return (
                        <m.div
                          key={chunk.id || idx}
                          variants={riseVariants(14)}
                          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 p-4 transition-colors duration-300 hover:border-emerald-500/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-200/80 dark:border-zinc-800/60">
                            <span className="min-w-0 break-words text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              #{idx + 1} {chunk.documentTitle}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                Page {chunk.pageNumber || 1}
                              </Badge>
                              <Badge variant="ready" className="text-[10px]">
                                {t.landing.matchScore}: {score}%
                              </Badge>
                            </div>
                          </div>
                          {/* Relevance bar */}
                          <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800" aria-hidden="true">
                            <m.div
                              className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: Math.min(1, score / 100) }}
                              transition={{ duration: 1, ease: ease.out, delay: 0.25 + idx * 0.08 }}
                            />
                          </div>
                          <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {chunk.content}
                          </p>
                        </m.div>
                      );
                    })}
                  </m.div>
                ) : null}
              </AnimatePresence>
            </div>
          </Spotlight>
        </Reveal>
      </section>

      {/* Metrics Row — staggered reveal + count-up */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <StaggerItem key={metric.value} className="h-full">
              <Spotlight className="group h-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-5 text-center transition-transform duration-300 ease-out-expo hover:-translate-y-1">
                <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {metric.count ? <CountUp value={metric.value} /> : metric.value}
                </h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{metric.desc}</p>
                <span
                  aria-hidden="true"
                  className="mx-auto mt-3 block h-px w-8 origin-center scale-x-50 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60 transition-transform duration-500 group-hover:scale-x-[3]"
                />
              </Spotlight>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* 5-Step Architecture Pipeline */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <Stagger className="text-center mb-10 sm:mb-12">
          <StaggerItem distance={8}>
            <Badge variant="secondary" className="mb-2">
              End-to-End Pipeline
            </Badge>
          </StaggerItem>
          <StaggerItem>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t.landing.archTitle}
            </h2>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
              {t.landing.archSubtitle}
            </p>
          </StaggerItem>
        </Stagger>

        <PipelineRail />
      </section>

      {/* Naive RAG vs Cortex Enterprise RAG Comparison Table */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 pb-16 sm:pb-20">
        <Reveal distance={24}>
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
                <m.tbody
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
                  className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans"
                >
                  {comparisonRows.map((row) => (
                    <m.tr
                      key={row.title}
                      variants={riseVariants(10)}
                      className="transition-colors duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-200">{row.title}</td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-start gap-1.5">
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500 dark:text-rose-400" aria-hidden="true" />
                          {row.naive}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="flex items-start gap-1.5">
                          <m.span
                            variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { ...spring.pop, delay: 0.2 } } }}
                            className="mt-0.5 flex shrink-0"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </m.span>
                          {row.cortex}
                        </span>
                      </td>
                    </m.tr>
                  ))}
                </m.tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950 py-8 text-center text-xs text-zinc-500 transition-colors duration-200">
        <Reveal distance={10} amount={0.5}>
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
        </Reveal>
      </footer>
    </div>
  );
}
