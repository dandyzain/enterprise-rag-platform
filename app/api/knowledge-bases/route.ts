import { z } from "zod";
import { db } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { listVisibleKnowledgeBases, withPermissions } from "@/lib/api/access";
import { getPlanQuota, RATE_LIMITS } from "@/lib/ratelimit";

const CreateKnowledgeBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
});

export const GET = apiRoute(async (ctx) => {
  const kbs = await listVisibleKnowledgeBases(ctx.actor);
  return ctx.json({ success: true, data: kbs });
});

export const POST = apiRoute(async (ctx) => {
  const user = ctx.requireUser();
  await ctx.rateLimit("write", RATE_LIMITS.write);

  const parsed = CreateKnowledgeBaseSchema.safeParse(await readJson(ctx.req));
  if (!parsed.success) throw new ApiError("KB_NAME_REQUIRED", 400);

  const quota = getPlanQuota(user.plan);
  const owned = await db.countKnowledgeBasesByOwner(user.id);
  if (owned >= quota.maxKnowledgeBases) {
    throw new ApiError("KB_LIMIT", 403, { limit: quota.maxKnowledgeBases, plan: user.plan });
  }

  const kb = await db.createKnowledgeBase({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    userId: user.id,
  });

  return ctx.json(
    {
      success: true,
      message: ctx.t("KB_CREATED", { name: kb.name }),
      data: withPermissions(ctx.actor, [kb])[0],
    },
    { status: 201 }
  );
});
