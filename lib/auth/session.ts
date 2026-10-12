import { NextRequest, NextResponse } from "next/server";
import { UserSession, UserRole, UserPlan } from "./types";
import crypto from "crypto";

export const AUTH_COOKIE_NAME = "cortex_auth_session";
const AUTH_SECRET = process.env.AUTH_SECRET || "cortex-enterprise-rag-secret-token-key-2026";

export const DEMO_USERS: Record<string, UserSession> = {
  admin: {
    id: "usr_admin_001",
    email: "alex.admin@enterprise.corp",
    name: "Alex Pratama (Admin)",
    role: "ADMIN",
    plan: "ENTERPRISE",
    avatarUrl: "",
    createdAt: new Date().toISOString(),
  },
  member: {
    id: "usr_member_002",
    email: "sarah.analyst@cortex.ai",
    name: "Sarah Wijaya",
    role: "MEMBER",
    plan: "PRO",
    avatarUrl: "",
    createdAt: new Date().toISOString(),
  },
  guest: {
    id: "usr_guest_003",
    email: "guest.public@demo.local",
    name: "Tamu Publik",
    role: "GUEST",
    plan: "FREE",
    avatarUrl: "",
    createdAt: new Date().toISOString(),
  },
};

/**
 * Sign user session into an HMAC-SHA256 authenticated token
 */
export function signSessionToken(user: UserSession): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed session token
 */
export function verifySessionToken(token: string): UserSession | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Extract active authenticated user session from NextRequest cookies or Authorization header.
 * Returns null if no valid session token exists.
 */
export function getSessionFromRequest(req: NextRequest): UserSession | null {
  // 1. Try Cookie
  const cookieVal = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieVal) {
    const verified = verifySessionToken(cookieVal);
    if (verified) return verified;
  }

  // 2. Try Authorization Bearer Header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const verified = verifySessionToken(token);
    if (verified) return verified;
  }

  // 3. No authenticated session
  return null;
}

/**
 * Set session cookie on a NextResponse
 */
export function attachSessionCookie(response: NextResponse, user: UserSession): void {
  const token = signSessionToken(user);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clear session cookie on a NextResponse
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
