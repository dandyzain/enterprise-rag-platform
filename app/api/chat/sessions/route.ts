import { z } from "zod";
import { db } from "@/lib/db";
import { apiRoute, readJson } from "@/lib/api/route";
import { loadReadableKb } from "@/lib/api/access";
import { idSchema, parseWith } from "@/lib/api/schemas";
import { RATE_LIMITS } from "@/lib/ratelimit";

const CreateSessionSchema = z.object({
  knowledgeBaseId: idSchema,
  title: z.string().trim().min(1).max(120),
});

/** Chat sessions are private to the caller (account, demo profile, or anonymous browser). */
export const GET = apiRoute(async (ctx) => {
  const kbId = parseWith(idSchema, ctx.req.nextUrl.searchParams.get("kbId") || "default-kb-1");
  const kb = await loadReadableKb(ctx.actor, kbId);
  const sessions = await db.listChatSessions(kb.id, ctx.actor.ownerId);
  return ctx.json({ success: true, data: sessions });
});

export const POST = apiRoute(async (ctx) => {
  await ctx.rateLimit("write", RATE_LIMITS.write);
  const body = parseWith(CreateSessionSchema, await readJson(ctx.req));
  const kb = await loadReadableKb(ctx.actor, body.knowledgeBaseId);
  const session = await db.createChatSession({
    knowledgeBaseId: kb.id,
    title: body.title,
    userId: ctx.actor.ownerId,
  });
  return ctx.json({ success: true, data: session }, { status: 201 });
});
