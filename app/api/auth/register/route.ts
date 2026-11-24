import { z } from "zod";
import { db, EmailAlreadyRegisteredError } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { attachSessionCookie, issueUserToken, toUserSession } from "@/lib/auth/session";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { getAdminEmails, isAuthConfigured } from "@/lib/env";
import { RATE_LIMITS } from "@/lib/ratelimit";

export const POST = apiRoute(async (ctx) => {
  if (!isAuthConfigured()) throw new ApiError("AUTH_NOT_CONFIGURED", 503);
  const body = await readJson<Record<string, unknown>>(ctx.req);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 100) throw new ApiError("NAME_REQUIRED", 400);
  if (!z.email().safeParse(email).success || email.length > 254) throw new ApiError("INVALID_EMAIL", 400);
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError("PASSWORD_TOO_SHORT", 400, { min: MIN_PASSWORD_LENGTH });
  }

  await ctx.rateLimit("register", RATE_LIMITS.register, `ip:${ctx.actor.ip}`);

  try {
    const account = await db.createUser({
      email,
      name,
      passwordHash: await hashPassword(password),
      role: getAdminEmails().has(email) ? "ADMIN" : "MEMBER",
      plan: "FREE",
    });
    const user = toUserSession(account);
    const res = ctx.json(
      { success: true, message: ctx.t("REGISTER_SUCCESS", { name: user.name }), user },
      { status: 201 }
    );
    attachSessionCookie(res, issueUserToken(account));
    return res;
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) throw new ApiError("EMAIL_TAKEN", 409);
    throw err;
  }
});
