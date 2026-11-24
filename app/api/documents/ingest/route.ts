import { db, SYSTEM_OWNER_ID } from "@/lib/db";
import { apiRoute, ApiError } from "@/lib/api/route";
import { loadWritableKb } from "@/lib/api/access";
import { idSchema, parseWith } from "@/lib/api/schemas";
import { ingestDocument } from "@/lib/rag/ingest";
import { resolveUploadMimeType, sanitizeFilename } from "@/lib/rag/file-types";
import { getPlanQuota, RATE_LIMITS } from "@/lib/ratelimit";

export const maxDuration = 60;

export const POST = apiRoute(async (ctx) => {
  const user = ctx.requireUser();
  await ctx.rateLimit("ingest", RATE_LIMITS.ingest);

  const formData = await ctx.req.formData();
  const file = formData.get("file");
  const kbId = parseWith(idSchema, (formData.get("knowledgeBaseId") as string | null) || "default-kb-1");
  if (!(file instanceof File)) throw new ApiError("FILE_REQUIRED", 400);

  const kb = await loadWritableKb(ctx.actor, kbId);
  const quota = getPlanQuota(user.plan);

  const filename = sanitizeFilename(file.name);
  const mimeType = resolveUploadMimeType(filename);
  if (!mimeType) throw new ApiError("FILE_TYPE", 400);

  if (file.size > quota.maxFileSizeMb * 1024 * 1024) {
    throw new ApiError("FILE_TOO_LARGE", 413, {
      size: (file.size / (1024 * 1024)).toFixed(1),
      plan: user.plan,
      limit: quota.maxFileSizeMb,
    });
  }

  // Document quota is per account (across all of the owner's knowledge bases).
  if (kb.userId !== SYSTEM_OWNER_ID) {
    const count = await db.countDocumentsByOwner(kb.userId);
    if (count >= quota.maxDocuments) {
      throw new ApiError("DOC_LIMIT", 403, { count, limit: quota.maxDocuments, plan: user.plan });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ingestDocument({
    knowledgeBaseId: kb.id,
    filename,
    mimeType,
    fileBuffer: buffer,
    fileSize: buffer.length,
  });

  return ctx.json(
    {
      success: true,
      message: ctx.t("DOC_INDEXED", { name: filename, chunks: result.totalChunks }),
      data: result,
    },
    { status: 201 }
  );
});
