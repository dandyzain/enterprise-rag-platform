import { NextRequest, NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/types";
import type { UserSession } from "@/lib/auth/types";
import {
  getSessionFromRequest,
  isValidVisitorId,
  newVisitorId,
  opaqueId,
  VISITOR_COOKIE_NAME,
  visitorCookieHeader,
} from "@/lib/auth/session";
import { checkRateLimit, RateLimitRule } from "@/lib/ratelimit";
import { detectLocale, MessageCode, translate } from "./messages";

/** An expected, user-facing failure with a stable code and HTTP status. */
export class ApiError extends Error {
  constructor(
    public readonly code: MessageCode,
    public readonly status: number,
    public readonly params: Record<string, string | number> = {},
    public readonly headers: Record<string, string> = {},
    public readonly details?: unknown
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export interface Actor {
  /** Signed-in account or demo profile, null for anonymous visitors. */
  user: UserSession | null;
  /** Owner key for data created by this actor (user id, or an opaque per-visitor id). */
  ownerId: string;
  /** Random per-browser id from the visitor cookie. */
  visitorId: string;
  ip: string;
}

export interface ApiContext<P = Record<string, string>> {
  req: NextRequest;
  params: P;
  locale: Locale;
  actor: Actor;
  t: (code: MessageCode, params?: Record<string, string | number>) => string;
  /** Throws ApiError(401) when nobody is signed in. */
  requireUser: () => UserSession;
  /** Consumes one unit of a rate-limit bucket; throws ApiError(429) when exhausted. */
  rateLimit: (bucket: string, rule: RateLimitRule, key?: string) => Promise<RateLimitHeaders>;
  json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => NextResponse;
}

export type RateLimitHeaders = Record<string, string>;

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

type Handler<P> = (ctx: ApiContext<P>) => Promise<Response>;

/**
 * Wraps a route handler with: locale detection, session + visitor resolution,
 * consistent localized error responses (no internal error details leak to the
 * client) and the visitor cookie.
 */
export function apiRoute<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: NextRequest, routeCtx?: { params?: Promise<P> }) => {
    const locale = detectLocale(req.headers, req.cookies.get("app_locale")?.value);
    const t = (code: MessageCode, params?: Record<string, string | number>) => translate(code, locale, params);

    const existingVisitor = req.cookies.get(VISITOR_COOKIE_NAME)?.value;
    const visitorId = isValidVisitorId(existingVisitor) ? existingVisitor : newVisitorId();
    const isNewVisitor = visitorId !== existingVisitor;

    let response: Response;
    try {
      const user = await getSessionFromRequest(req);
      const actor: Actor = {
        user,
        ownerId: user ? user.id : opaqueId("anon", visitorId),
        visitorId,
        ip: getClientIp(req),
      };
      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;

      const ctx: ApiContext<P> = {
        req,
        params,
        locale,
        actor,
        t,
        requireUser: () => {
          if (!actor.user) throw new ApiError("UNAUTHENTICATED", 401);
          return actor.user;
        },
        rateLimit: async (bucket, rule, key) => {
          const identity = key ?? (actor.user ? `u:${actor.user.id}` : `ip:${actor.ip}`);
          const result = await checkRateLimit(`${bucket}:${identity}`, rule);
          const headers = {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetInSeconds),
          };
          if (!result.allowed) {
            throw new ApiError("RATE_LIMITED", 429, { seconds: result.resetInSeconds }, {
              ...headers,
              "Retry-After": String(result.resetInSeconds),
            });
          }
          return headers;
        },
        json: (body, init) =>
          NextResponse.json(body, { status: init?.status ?? 200, headers: init?.headers }),
      };

      response = await handler(ctx);
    } catch (err) {
      response = errorResponse(err, locale);
    }

    if (isNewVisitor) {
      try {
        response.headers.append("Set-Cookie", visitorCookieHeader(visitorId));
      } catch {
        // Immutable headers (should not happen for responses we construct) — skip the cookie.
      }
    }
    return response;
  };
}

export function errorResponse(err: unknown, locale: Locale): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        code: err.code,
        error: translate(err.code, locale, err.params),
        ...(err.code === "RATE_LIMITED" || err.code === "QUOTA_CHAT"
          ? { resetInSeconds: Number(err.params.seconds ?? 0) }
          : {}),
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      { status: err.status, headers: err.headers }
    );
  }
  console.error("[API] Unhandled error:", err);
  return NextResponse.json(
    { success: false, code: "INTERNAL", error: translate("INTERNAL", locale) },
    { status: 500 }
  );
}

/** Parse a JSON body, mapping malformed JSON to a 400 instead of a 500. */
export async function readJson<T = unknown>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("INVALID_JSON", 400);
  }
}
