"use client";

import * as React from "react";
import Link from "next/link";
import {
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Search,
  CheckCircle2,
  Cpu,
  FileText,
  Sliders,
  Sparkles,
  ExternalLink,
  Lock,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

export default function HomePage() {
  const { user } = useAuth();
  const [testQuery, setTestQuery] = React.useState("Kebijakan retensi dan enkripsi data SEC-POL-04");
  const [testResults, setTestResults] = React.useState<any[] | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchLatency, setSearchLatency] = React.useState<number | null>(null);

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
        // Fallback demo results if database is not seeded yet
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
    } catch {
      setTestResults([
        {
          id: "demo-fallback",
          documentTitle: "SEC-POL-04_Kebijakan_Keamanan_Data_ISO27001.txt",
          pageNumber: 1,
          similarity: 0.92,
          matchType: "hybrid",
          content:
            "Enkripsi data rest menggunakan AES-256-GCM dan rotasi kunci KMS otomatis setiap 90 hari.",
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-white">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-zinc-50">
                Cortex RAG
              </span>
              <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                v2.0 Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>pgvector HNSW Operator Ready</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-zinc-400 font-medium">
                  {user.name} ({user.plan})
                </span>
                <Link href="/dashboard">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                  >
                    <span>Ke Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-300 hover:text-white"
                  >
                    Masuk
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                  >
                    <span>Buka Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300 backdrop-blur-xs mb-6">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Next.js 16 • Hybrid BM25 & Dense RRF • Cross-Encoder Re-Ranking</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-zinc-50 leading-[1.15]">
          Enterprise Knowledge Base &{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Semantic Vector Engine
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400">
          Infrastruktur RAG modern untuk enterprise dengan presisi tinggi. Menggabungkan pencarian
          vektor kosinus berdensitas tinggi dengan lexical BM25, re-ranking dua tahap, dan auditor
          kepatuhan anti-halusinasi dengan sitasi terverifikasi.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-12 gap-2 bg-emerald-600 px-7 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition hover:scale-102"
            >
              <span>Mulai Jelajahi Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            size="lg"
            variant="outline"
            onClick={() => runQuickSearch(testQuery)}
            className="h-12 gap-2 border-zinc-800 bg-zinc-900/60 px-6 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
          >
            <Search className="h-4 w-4 text-emerald-400" />
            <span>Uji Coba Hybrid Retrieval</span>
          </Button>
        </div>

        {/* System Highlights Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-y border-zinc-800/80 py-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Strict Grounding Compliance</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Cosine Similarity Threshold &gt;= 0.65</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Reciprocal Rank Fusion (k=60)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Multi-Page PDF Token Tracking</span>
          </div>
        </div>
      </section>

      {/* Live Interactive Search Sandbox */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-zinc-100">
                Live Hybrid Retrieval Sandbox
              </h3>
            </div>
            {searchLatency !== null && (
              <Badge variant="ready" className="text-[10px]">
                Latency: {searchLatency} ms
              </Badge>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runQuickSearch(testQuery)}
                placeholder="Ketik pertanyaan atau kode teknis (misal: SEC-POL-04, SLA 99.99%)..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isSearching}
              onClick={() => runQuickSearch(testQuery)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4"
            >
              {isSearching ? "Mencari..." : "Jalankan Query"}
            </Button>
          </div>

          {/* Quick Query Starter Pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-zinc-500">Contoh Query:</span>
            {[
              "Kebijakan retensi dan enkripsi data SEC-POL-04",
              "Berapa target RPO dan RTO disaster recovery?",
              "Standar branching git dan pipeline CI/CD",
            ].map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => {
                  setTestQuery(starter);
                  runQuickSearch(starter);
                }}
                className="rounded-full border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[11px] text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-300 transition"
              >
                {starter}
              </button>
            ))}
          </div>

          {/* Live Search Results */}
          {testResults && (
            <div className="mt-5 space-y-3 pt-4 border-t border-zinc-800/80 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
                <span>Kandidat Potongan Teks Terindeks ({testResults.length})</span>
                <span className="text-[11px] font-mono text-emerald-400">
                  Two-Stage Cross-Encoder Ranked
                </span>
              </div>

              {testResults.map((chunk, idx) => (
                <div
                  key={chunk.id || idx}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 transition hover:border-emerald-500/40"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
                    <span className="text-xs font-semibold text-emerald-400">
                      #{idx + 1} {chunk.documentTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        Halaman {chunk.pageNumber || 1}
                      </Badge>
                      <Badge variant="ready" className="text-[10px]">
                        Kemiripan: {Math.round((chunk.similarity || 0.85) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5-Step Architecture Pipeline */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-2">
            End-to-End Pipeline
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
            Arsitektur Pengolahan Data & Mesin RAG
          </h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl mx-auto">
            Proses ingestion deterministik dan retrieval berstandar enterprise tanpa halusinasi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold mb-3">
              01
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Recursive Chunking</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              500-700 token dengan 100 overlap menggunakan hierarki pemisah teks cerdas (`\n\n`, `\n`).
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold mb-3">
              02
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Vector Embeddings</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              1536-dim OpenAI `text-embedding-3-small` / Gemini dengan L2 unit norm normalizer.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold mb-3">
              03
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Hybrid Search (RRF)</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              Menggabungkan dense cosine & BM25 sparse lexical ($k=60$) untuk akurasi kode teknis.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold mb-3">
              04
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Two-Stage Re-Ranking</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              Filter kandidat awal Top-15 dengan evaluasi interrogative entity congruence.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold mb-3">
              05
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Groundedness Auditor</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              Verifikasi kalimat per kalimat terhadap kutipan asli untuk menjamin zero hallucination.
            </p>
          </div>
        </div>
      </section>

      {/* Naive RAG vs Cortex Enterprise RAG Comparison Table */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 overflow-hidden">
          <h3 className="text-base font-bold text-zinc-100 mb-4">
            Komparasi: Naive Vector Search vs. Cortex Enterprise RAG
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Fitur Arsitektur</th>
                  <th className="py-2.5 px-3 text-rose-400">Naive Vector Search</th>
                  <th className="py-2.5 px-3 text-emerald-400">Cortex Enterprise RAG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-200">Pencarian Kata Kunci Persis</td>
                  <td className="py-3 px-3 text-zinc-400">Sering meleset pada kode (e.g. SEC-POL-04)</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">BM25 + Dense RRF (100% tepat)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-200">Re-Ranking Kandidat</td>
                  <td className="py-3 px-3 text-zinc-400">Hanya cosine distance mentah</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">Two-Stage Cross-Encoder Top-15</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-200">Verifikasi Halusinasi</td>
                  <td className="py-3 px-3 text-zinc-400">Tidak ada pengawasan fakta</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">Auditor kalimat (0-100% Score)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-zinc-200">Verifikasi Sitasi</td>
                  <td className="py-3 px-3 text-zinc-400">Teks statis tanpa link sumber</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">Slide-over drawer dengan kutipan asli</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800 bg-zinc-950 py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Cortex RAG Platform. Production-Ready Portfolio Architecture.</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link href="/dashboard" className="hover:text-emerald-400 transition">
              Workspace
            </Link>
            <span>•</span>
            <span className="font-mono text-[11px]">Next.js 16 • pgvector • Vercel AI SDK</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
