import { db } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { withPermissions } from "@/lib/api/access";
import { BackupSchema } from "@/lib/api/schemas";
import { indexExistingChunks } from "@/lib/rag/ingest";
import { getPlanQuota, RATE_LIMITS } from "@/lib/ratelimit";

export const maxDuration = 60;

const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

/** Restore a JSON backup into a new knowledge base owned by the caller. */
export const POST = apiRoute(async (ctx) => {
  const user = ctx.requireUser();
  await ctx.rateLimit("import", RATE_LIMITS.import);

  let raw: unknown;
  const contentType = ctx.req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await ctx.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError("BACKUP_INVALID", 400);
    if (file.size > MAX_BACKUP_BYTES) throw new ApiError("FILE_TOO_LARGE", 413, { size: (file.size / 1048576).toFixed(1), plan: user.plan, limit: 25 });
    try {
      raw = JSON.parse(await file.text());
    } catch {
      throw new ApiError("BACKUP_INVALID", 400);
    }
  } else {
    raw = await readJson(ctx.req);
  }

  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError("BACKUP_INVALID", 400);
  const payload = parsed.data;

  const quota = getPlanQuota(user.plan);
  if ((await db.countKnowledgeBasesByOwner(user.id)) >= quota.maxKnowledgeBases) {
    throw new ApiError("KB_LIMIT", 403, { limit: quota.maxKnowledgeBases, plan: user.plan });
  }
  const docs = payload.documents ?? [];
  const ownedDocs = await db.countDocumentsByOwner(user.id);
  if (ownedDocs + docs.length > quota.maxDocuments) {
    throw new ApiError("DOC_LIMIT", 403, { count: ownedDocs, limit: quota.maxDocuments, plan: user.plan });
  }

  const baseName = payload.knowledgeBase.name || "Knowledge Base";
  const suffix = ctx.locale === "id" ? " (Pulihan)" : " (Restored)";
  const kb = await db.createKnowledgeBase({
    name: (baseName.endsWith(suffix) ? baseName : `${baseName}${suffix}`).slice(0, 120),
    description: payload.knowledgeBase.description ?? null,
    userId: user.id,
  });

  let totalChunks = 0;
  for (const doc of docs) {
    const chunks = (doc.chunks ?? []).map((c, i) => ({
      content: c.content,
      chunkIndex: c.chunkIndex ?? i,
      pageNumber: c.pageNumber ?? null,
    }));
    const created = await db.createDocument({
      knowledgeBaseId: kb.id,
      title: doc.title,
      fileUrl: "",
      fileType: doc.fileType || "text/plain",
      fileSize: doc.fileSize ?? chunks.reduce((sum, c) => sum + c.content.length, 0),
      status: chunks.length > 0 ? "PROCESSING" : "INDEXED",
    });
    if (chunks.length > 0) {
      totalChunks += await indexExistingChunks(created.id, chunks);
    }
  }

  return ctx.json({
    success: true,
    message: ctx.t("BACKUP_RESTORED", { name: kb.name, documents: docs.length, chunks: totalChunks }),
    data: {
      knowledgeBase: withPermissions(ctx.actor, [kb])[0],
      totalDocuments: docs.length,
      totalChunks,
    },
  });
});
