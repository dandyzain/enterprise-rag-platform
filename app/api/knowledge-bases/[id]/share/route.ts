import { z } from "zod";
import { db, SYSTEM_OWNER_ID } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { loadWritableKb } from "@/lib/api/access";
import { getAppUrl } from "@/lib/env";

const ShareSchema = z.object({ enabled: z.boolean() });

/** Toggle read-only link sharing for a knowledge base the caller owns. */
export const POST = apiRoute<{ id: string }>(async (ctx) => {
  const kb = await loadWritableKb(ctx.actor, ctx.params.id);
  if (kb.userId === SYSTEM_OWNER_ID) throw new ApiError("KB_READ_ONLY", 403);

  const parsed = ShareSchema.safeParse(await readJson(ctx.req));
  if (!parsed.success) throw new ApiError("VALIDATION", 400);

  const visibility = parsed.data.enabled ? "link" : "private";
  await db.setKnowledgeBaseVisibility(kb.id, visibility);

  return ctx.json({
    success: true,
    message: ctx.t(parsed.data.enabled ? "KB_SHARED" : "KB_UNSHARED"),
    data: { id: kb.id, visibility, shareUrl: `${getAppUrl()}/dashboard?kb=${encodeURIComponent(kb.id)}` },
  });
});
