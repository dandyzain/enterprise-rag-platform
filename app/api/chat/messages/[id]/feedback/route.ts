import { z } from "zod";
import { db } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { loadOwnedSession } from "@/lib/api/access";
import { RATE_LIMITS } from "@/lib/ratelimit";

const FeedbackSchema = z.object({ feedback: z.enum(["like", "dislike"]).nullable() });

/** Persist 👍 / 👎 on an assistant answer (used for answer-quality evaluation). */
export const PUT = apiRoute<{ id: string }>(async (ctx) => {
  await ctx.rateLimit("write", RATE_LIMITS.write);
  const parsed = FeedbackSchema.safeParse(await readJson(ctx.req));
  if (!parsed.success) throw new ApiError("VALIDATION", 400);

  const message = await db.getChatMessage(ctx.params.id);
  if (!message || message.role !== "ASSISTANT") throw new ApiError("MESSAGE_NOT_FOUND", 404);
  await loadOwnedSession(ctx.actor, message.chatSessionId).catch(() => {
    throw new ApiError("MESSAGE_NOT_FOUND", 404);
  });

  await db.setMessageFeedback(message.id, parsed.data.feedback);
  return ctx.json({ success: true, data: { id: message.id, feedback: parsed.data.feedback } });
});
