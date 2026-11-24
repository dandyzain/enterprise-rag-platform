import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiConfig, isAuthConfigured } from "@/lib/env";
import { chatModelId } from "@/lib/ai/models";
import { getEmbeddingModelId } from "@/lib/rag/embedder";
import { rateLimitBackend } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET() {
  const isPostgres = db.mode === "postgres";
  let healthy = true;
  let metrics: { knowledgeBases: number; documents: number; chunks: number } | null = null;
  try {
    await db.ping();
    metrics = await db.getGlobalStats();
  } catch (err) {
    healthy = false;
    console.error("[API Health] Storage check failed:", err);
  }

  const chatProviders = [
    aiConfig.hasServerOpenAI() ? `openai:${chatModelId("openai")}` : null,
    aiConfig.hasServerGoogle() ? `google:${chatModelId("google")}` : null,
  ].filter(Boolean);

  return NextResponse.json(
    {
      success: healthy,
      status: healthy ? "HEALTHY" : "DEGRADED",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      system: {
        storage: {
          engine: isPostgres ? "PostgreSQL + pgvector" : "In-memory (demo, not persistent)",
          persistent: isPostgres,
          indexing: isPostgres ? "HNSW (vector_cosine_ops) + GIN full-text" : "Exact cosine + BM25",
          connected: healthy,
        },
        embedding: { model: getEmbeddingModelId(), dimensions: 1536 },
        chat: { models: chatProviders, offlineFallback: chatProviders.length === 0 },
        auth: { configured: isAuthConfigured() },
        rateLimiting: { backend: rateLimitBackend() },
        pipeline: {
          chunking: "Recursive, ~600 tokens with 100 token overlap",
          retrieval: "Hybrid RRF (dense cosine + sparse keyword, k=60)",
          reranking: "Two-stage lexical re-ranker (heuristic)",
          groundedness: "Heuristic sentence-level citation audit",
        },
      },
      metrics,
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
