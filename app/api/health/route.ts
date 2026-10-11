import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const kbs = await db.getKnowledgeBases();
    let totalDocs = 0;
    let totalChunks = 0;

    for (const kb of kbs) {
      const docs = await db.getDocumentsByKb(kb.id);
      totalDocs += docs.length;
      totalChunks += docs.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
    }

    const isPostgres = Boolean(process.env.DATABASE_URL);
    const embeddingProvider = process.env.OPENAI_API_KEY
      ? "OpenAI (text-embedding-3-small)"
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "Google Gemini (text-embedding-004)"
      : "Deterministic High-Dim Unit Hashing (1536-dim)";

    return NextResponse.json({
      success: true,
      status: "HEALTHY",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      system: {
        database: {
          engine: isPostgres ? "PostgreSQL + pgvector" : "High-Performance In-Memory Store",
          indexing: isPostgres ? "HNSW Index (vector_cosine_ops)" : "Exact Cosine Distance",
          connected: true,
        },
        embedding: {
          provider: embeddingProvider,
          dimensions: 1536,
          batchSupport: true,
        },
        pipeline: {
          recursiveChunking: "500-700 tokens (100 token overlap)",
          searchEngine: "Hybrid RRF (Dense Cosine + Sparse BM25 k=60)",
          reRankingEngine: "Two-Stage Cross-Encoder (Top-15 to Top-K)",
          complianceAuditor: "Sentence-by-Sentence Groundedness & Anti-Hallucination",
        },
      },
      metrics: {
        totalKnowledgeBases: kbs.length,
        totalDocuments: totalDocs,
        totalChunks,
      },
    });
  } catch (error: any) {
    console.error("[API Health] error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "DEGRADED",
        error: error.message || "Gagal memeriksa kesehatan sistem.",
      },
      { status: 500 }
    );
  }
}
