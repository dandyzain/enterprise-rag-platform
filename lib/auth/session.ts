import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminEmails, getAuthSecret, isProduction } from "@/lib/env";
import type { UserPlan, UserRecord, UserRole, UserSession } from "./types";

export const AUTH_COOKIE_NAME = "cortex_auth_session";
export const VISITOR_COOKIE_NAME = "cortex_vid";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const VISITOR_TTL_SECONDS = 60 * 60 * 24 * 365;

/** Display data for the sandboxed demo profiles. Each visitor gets their own isolated copy. */
export const DEMO_PROFILES: Record<UserRole, { name: string; email: string; plan: UserPlan }> = {
  ADMIN: { name: "Alex Pratama (Admin)", email: "alex.admin@demo.local", plan: "ENTERPRISE" },
  MEMBER: { name: "Sarah Wijaya", email: "sarah.analyst@demo.local", plan: "PRO" },
  GUEST: { name: "Tamu Publik", email: "guest.public@demo.local", plan: "FREE" },
};

type TokenPayload =
  | { v: 1; kind: "user"; sub: string; sv: number; iat: number; exp: number }
  | { v: 1; kind: "demo"; sub: string; role: UserRole; iat: number; exp: number };

const nowSeconds = () => Math.floor(Date.now() / 1000);

function hmac(secret: string, data: string): Buffer {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

export function signToken(payload: TokenPayload, secret = getAuthSecret()): string {
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(secret, body).toString("base64url")}`;
}

export function verifyToken(token: string, secret = getAuthSecret()): TokenPayload | null {
  if (!secret || typeof token !== "string" || token.length > 4096) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = hmac(secret, body);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as TokenPayload;
    if (payload?.v !== 1 || typeof payload.exp !== "number" || payload.exp <= nowSeconds()) return null;
    if (payload.kind !== "user" && payload.kind !== "demo") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Stable, non-reversible id derived from a secret value (visitor cookie). */
export function opaqueId(prefix: string, value: string): string {
  const secret = getAuthSecret() ?? "cortex-unsigned";
  return `${prefix}-${hmac(secret, value).toString("hex").slice(0, 24)}`;
}

export function demoUserId(role: UserRole, visitorId: string): string {
  return opaqueId(`demo-${role.toLowerCase()}`, visitorId);
}

/** Effective role: ADMIN_EMAILS promotes an account at sign-in time. */
export function effectiveRole(user: Pick<UserRecord, "email" | "role">): UserRole {
  return getAdminEmails().has(user.email.toLowerCase()) ? "ADMIN" : user.role;
}

export function toUserSession(user: UserRecord): UserSession {
  const role = effectiveRole(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    plan: role === "ADMIN" ? "ENTERPRISE" : user.plan,
    createdAt: user.createdAt.toISOString(),
    isDemo: false,
  };
}

export function demoSession(role: UserRole, id: string): UserSession {
  const profile = DEMO_PROFILES[role] ?? DEMO_PROFILES.GUEST;
  return {
    id,
    email: profile.email,
    name: profile.name,
    role,
    plan: profile.plan,
    isDemo: true,
  };
}

export function issueUserToken(user: UserRecord): string {
  const iat = nowSeconds();
  return signToken({ v: 1, kind: "user", sub: user.id, sv: user.sessionVersion, iat, exp: iat + SESSION_TTL_SECONDS });
}

export function issueDemoToken(role: UserRole, visitorId: string): { token: string; user: UserSession } {
  const iat = nowSeconds();
  const id = demoUserId(role, visitorId);
  return {
    token: signToken({ v: 1, kind: "demo", sub: id, role, iat, exp: iat + SESSION_TTL_SECONDS }),
    user: demoSession(role, id),
  };
}

function readToken(req: NextRequest): string | null {
  const cookieVal = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieVal) return cookieVal;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
  return null;
}

/**
 * Resolve the signed-in user for a request (cookie or `Authorization: Bearer`).
 * Account tokens are checked against the database so role/plan changes and
 * sign-out (session version bump) take effect immediately.
 */
export async function getSessionFromRequest(req: NextRequest): Promise<UserSession | null> {
  const token = readToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  if (payload.kind === "demo") {
    return demoSession(payload.role, payload.sub);
  }

  const user = await db.getUserById(payload.sub);
  if (!user || user.sessionVersion !== payload.sv) return null;
  return toUserSession(user);
}

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: isProduction,
};

export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({ ...baseCookie, name: AUTH_COOKIE_NAME, value: token, maxAge: SESSION_TTL_SECONDS });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({ ...baseCookie, name: AUTH_COOKIE_NAME, value: "", maxAge: 0 });
}

export function newVisitorId(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function isValidVisitorId(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{32}$/.test(value));
}

export function visitorCookieHeader(visitorId: string): string {
  const parts = [
    `${VISITOR_COOKIE_NAME}=${visitorId}`,
    "Path=/",
    `Max-Age=${VISITOR_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}
