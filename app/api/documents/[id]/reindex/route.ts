import { apiRoute } from "@/lib/api/route";
import { loadWritableDocument } from "@/lib/api/access";
import { reindexDocument } from "@/lib/rag/ingest";
import { RATE_LIMITS } from "@/lib/ratelimit";

export const maxDuration = 60;

/** Re-embed a document with the current embedding model (e.g. after switching providers). */
export const POST = apiRoute<{ id: string }>(async (ctx) => {
  await ctx.rateLimit("ingest", RATE_LIMITS.ingest);
  const { document } = await loadWritableDocument(ctx.actor, ctx.params.id);
  const { totalChunks } = await reindexDocument(document);
  return ctx.json({
    success: true,
    message: ctx.t("DOC_REINDEXED", { name: document.title, chunks: totalChunks }),
    data: { documentId: document.id, totalChunks },
  });
});
