import { apiRoute, ApiError, ApiContext, readJson } from "@/lib/api/route";
import { loadReadableKb } from "@/lib/api/access";
import { parseWith, SearchSchema } from "@/lib/api/schemas";
import { performSemanticSearch } from "@/lib/rag/search";
import { RATE_LIMITS } from "@/lib/ratelimit";

async function runSearch(ctx: ApiContext, input: unknown) {
  const startTime = Date.now();
  const rateHeaders = await ctx.rateLimit("search", RATE_LIMITS.search);
  const params = parseWith(SearchSchema, input);
  const kb = await loadReadableKb(ctx.actor, params.knowledgeBaseId);

  const result = await performSemanticSearch({
    knowledgeBaseId: kb.id,
    query: params.query,
    searchMode: params.searchMode,
    threshold: params.threshold,
    topK: params.topK,
    filterDocumentIds: params.filterDocumentIds,
    enableReranking: params.enableReranking,
  });

  return ctx.json(
    {
      success: true,
      data: {
        query: result.query,
        chunks: result.chunks,
        citations: result.citations,
        totalFound: result.chunks.length,
        latencyMs: Date.now() - startTime,
        appliedThreshold: params.threshold,
        topK: params.topK,
      },
    },
    { headers: rateHeaders }
  );
}

export const POST = apiRoute(async (ctx) => runSearch(ctx, await readJson(ctx.req)));

export const GET = apiRoute(async (ctx) => {
  const sp = ctx.req.nextUrl.searchParams;
  const query = sp.get("q") || sp.get("query") || "";
  if (!query.trim()) throw new ApiError("QUERY_REQUIRED", 400);
  return runSearch(ctx, {
    query,
    knowledgeBaseId: sp.get("knowledgeBaseId") || sp.get("kb") || undefined,
    searchMode: sp.get("searchMode") || undefined,
    threshold: sp.get("threshold") ?? undefined,
    topK: sp.get("topK") ?? undefined,
    enableReranking: sp.get("rerank") === "false" ? false : true,
  });
});
