import { z } from "zod";
import { db } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import {
  attachSessionCookie,
  issueDemoToken,
  issueUserToken,
  toUserSession,
} from "@/lib/auth/session";
import { getDummyPasswordHash, MAX_PASSWORD_LENGTH, verifyPassword } from "@/lib/auth/password";
import { isAuthConfigured, isDemoLoginEnabled } from "@/lib/env";
import { RATE_LIMITS } from "@/lib/ratelimit";
import type { UserRole } from "@/lib/auth/types";

const DEMO_ROLES: Record<string, UserRole> = { admin: "ADMIN", member: "MEMBER", guest: "GUEST" };

export const POST = apiRoute(async (ctx) => {
  if (!isAuthConfigured()) throw new ApiError("AUTH_NOT_CONFIGURED", 503);
  const body = await readJson<Record<string, unknown>>(ctx.req);

  // Sandboxed demo profiles: each browser gets its own isolated Admin / Member / Guest workspace.
  if (body?.demoRole !== undefined) {
    if (!isDemoLoginEnabled()) throw new ApiError("DEMO_DISABLED", 403);
    const role = DEMO_ROLES[String(body.demoRole).toLowerCase()];
    if (!role) throw new ApiError("VALIDATION", 400);
    await ctx.rateLimit("demo-login", RATE_LIMITS.login, `ip:${ctx.actor.ip}`);
    const { token, user } = issueDemoToken(role, ctx.actor.visitorId);
    const res = ctx.json({
      success: true,
      message: ctx.t("DEMO_SUCCESS", { name: user.name, plan: user.plan }),
      user,
    });
    attachSessionCookie(res, token);
    return res;
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!z.email().safeParse(email).success) throw new ApiError("INVALID_EMAIL", 400);
  if (!password || password.length > MAX_PASSWORD_LENGTH) throw new ApiError("INVALID_CREDENTIALS", 401);

  // Brute-force protection per IP and per account.
  await ctx.rateLimit("login", RATE_LIMITS.login, `ip:${ctx.actor.ip}`);
  await ctx.rateLimit("login", RATE_LIMITS.login, `email:${email}`);

  const account = await db.getUserByEmail(email);
  // Always run scrypt so response time does not reveal whether the e-mail exists.
  const valid = await verifyPassword(password, account?.passwordHash ?? (await getDummyPasswordHash()));
  if (!account || !valid) throw new ApiError("INVALID_CREDENTIALS", 401);

  const user = toUserSession(account);
  const res = ctx.json({ success: true, message: ctx.t("LOGIN_SUCCESS", { name: user.name }), user });
  attachSessionCookie(res, issueUserToken(account));
  return res;
});
