import { db, SYSTEM_OWNER_ID } from "@/lib/db";
import { apiRoute, ApiError } from "@/lib/api/route";
import { loadWritableKb } from "@/lib/api/access";
import { idSchema, parseWith } from "@/lib/api/schemas";
import { SEED_DOCUMENTS, seedKnowledgeBase } from "@/lib/rag/seed";
import { getPlanQuota, RATE_LIMITS } from "@/lib/ratelimit";

export const maxDuration = 60;

/** Index the sample enterprise documents into a knowledge base the caller can write to. */
export const POST = apiRoute(async (ctx) => {
  const user = ctx.requireUser();
  await ctx.rateLimit("seed", RATE_LIMITS.seed);

  let bodyKbId: string | undefined;
  try {
    const body = (await ctx.req.json()) as { knowledgeBaseId?: string; kbId?: string };
    bodyKbId = body?.knowledgeBaseId || body?.kbId;
  } catch {
    // Body is optional (kbId may be passed as a query parameter)
  }
  const kbId = parseWith(idSchema, bodyKbId || ctx.req.nextUrl.searchParams.get("kbId") || "default-kb-1");
  const kb = await loadWritableKb(ctx.actor, kbId);

  if (kb.userId !== SYSTEM_OWNER_ID) {
    const quota = getPlanQuota(user.plan);
    const existingTitles = new Set((await db.listDocuments(kb.id)).map((d) => d.title));
    const toAdd = SEED_DOCUMENTS.filter((d) => !existingTitles.has(d.filename)).length;
    const count = await db.countDocumentsByOwner(kb.userId);
    if (count + toAdd > quota.maxDocuments) {
      throw new ApiError("DOC_LIMIT", 403, { count, limit: quota.maxDocuments, plan: user.plan });
    }
  }

  const results = await seedKnowledgeBase(kb.id);
  return ctx.json({
    success: true,
    message: ctx.t("SEEDED", { count: results.length }),
    data: results,
  });
});
