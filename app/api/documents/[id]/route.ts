import { db } from "@/lib/db";
import { apiRoute, ApiError } from "@/lib/api/route";
import { loadReadableDocument, loadWritableDocument } from "@/lib/api/access";
import { RATE_LIMITS } from "@/lib/ratelimit";

export const GET = apiRoute<{ id: string }>(async (ctx) => {
  const { document } = await loadReadableDocument(ctx.actor, ctx.params.id);
  const chunks = await db.getDocumentChunks(document.id);
  return ctx.json({ success: true, data: { document, chunks } });
});

export const DELETE = apiRoute<{ id: string }>(async (ctx) => {
  await ctx.rateLimit("write", RATE_LIMITS.write);
  const { document } = await loadWritableDocument(ctx.actor, ctx.params.id);
  const deleted = await db.deleteDocument(document.id);
  if (!deleted) throw new ApiError("DOC_NOT_FOUND", 404);
  return ctx.json({ success: true, message: ctx.t("DOC_DELETED") });
});
