import { db } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { loadOwnedSession } from "@/lib/api/access";
import { RATE_LIMITS } from "@/lib/ratelimit";

export const GET = apiRoute<{ id: string }>(async (ctx) => {
  const session = await loadOwnedSession(ctx.actor, ctx.params.id);
  const messages = await db.listChatMessages(session.id);
  return ctx.json({ success: true, data: messages });
});

export const PATCH = apiRoute<{ id: string }>(async (ctx) => {
  await ctx.rateLimit("write", RATE_LIMITS.write);
  const session = await loadOwnedSession(ctx.actor, ctx.params.id);
  const body = await readJson<{ title?: unknown }>(ctx.req);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) throw new ApiError("SESSION_TITLE_REQUIRED", 400);

  await db.renameChatSession(session.id, title);
  return ctx.json({
    success: true,
    message: ctx.t("SESSION_RENAMED"),
    data: { id: session.id, title },
  });
});

export const DELETE = apiRoute<{ id: string }>(async (ctx) => {
  await ctx.rateLimit("write", RATE_LIMITS.write);
  const session = await loadOwnedSession(ctx.actor, ctx.params.id);
  await db.deleteChatSession(session.id);
  return ctx.json({ success: true, message: ctx.t("SESSION_DELETED") });
});
