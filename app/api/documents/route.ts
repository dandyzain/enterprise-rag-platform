import { db } from "@/lib/db";
import { apiRoute } from "@/lib/api/route";
import { canWriteKb, listVisibleKnowledgeBases, loadReadableKb } from "@/lib/api/access";
import { idSchema, parseWith } from "@/lib/api/schemas";

export const GET = apiRoute(async (ctx) => {
  const kbId = parseWith(idSchema, ctx.req.nextUrl.searchParams.get("kbId") || "default-kb-1");
  const kb = await loadReadableKb(ctx.actor, kbId);

  const [documents, stats, knowledgeBases] = await Promise.all([
    db.listDocuments(kb.id),
    db.getStorageStats(kb.id),
    listVisibleKnowledgeBases(ctx.actor, kb),
  ]);

  return ctx.json({
    success: true,
    data: {
      documents,
      stats,
      knowledgeBases,
      knowledgeBase: { ...kb, canWrite: canWriteKb(ctx.actor, kb) },
      storage: { mode: db.mode, persistent: db.mode === "postgres" },
    },
  });
});
