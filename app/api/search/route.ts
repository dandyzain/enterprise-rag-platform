import { NextRequest, NextResponse } from "next/server";
import { performSemanticSearch } from "@/lib/rag/search";
import { z } from "zod";

const SearchQuerySchema = z.object({
  query: z.string().min(1, "Query pencarian tidak boleh kosong"),
  knowledgeBaseId: z.string().default("default-kb-1"),
  searchMode: z.enum(["hybrid", "semantic", "keyword"]).default("hybrid"),
  threshold: z.number().min(0.1).max(1.0).default(0.65),
  topK: z.number().min(1).max(20).default(5),
  filterDocumentIds: z.array(z.string()).optional(),
  enableReranking: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const validation = SearchQuerySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi parameter gagal",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      query,
      knowledgeBaseId,
      searchMode,
      threshold,
      topK,
      filterDocumentIds,
      enableReranking,
    } = validation.data;

    const result = await performSemanticSearch({
      knowledgeBaseId,
      query,
      searchMode,
      threshold,
      topK,
      filterDocumentIds,
      enableReranking,
    });

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        query: result.query,
        chunks: result.chunks,
        citations: result.citations,
        totalFound: result.chunks.length,
        latencyMs,
        appliedThreshold: threshold,
        topK,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Search] Direct semantic search error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal melakukan pencarian semantik." },
      { status: 500 }
    );
  }
}
