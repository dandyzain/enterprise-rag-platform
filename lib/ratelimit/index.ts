import { NextRequest } from "next/server";
import { UserPlan, UserSession } from "@/lib/auth/types";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-Memory Sliding Window Store (Upstash Redis fallback)
const rateLimitStore = new Map<string, RateLimitRecord>();

export interface PlanQuota {
  maxRequestsPerHour: number;
  maxDocuments: number;
  maxFileSizeMb: number;
  allowedModels: string[];
}

export const PLAN_QUOTAS: Record<UserPlan, PlanQuota> = {
  FREE: {
    maxRequestsPerHour: 15,
    maxDocuments: 3,
    maxFileSizeMb: 10,
    allowedModels: ["gpt-4o-mini", "gemini-1.5-flash"],
  },
  PRO: {
    maxRequestsPerHour: 120,
    maxDocuments: 25,
    maxFileSizeMb: 25,
    allowedModels: ["gpt-4o-mini", "gemini-1.5-flash", "gpt-4o"],
  },
  ENTERPRISE: {
    maxRequestsPerHour: 1000,
    maxDocuments: 500,
    maxFileSizeMb: 50,
    allowedModels: ["gpt-4o-mini", "gemini-1.5-flash", "gpt-4o", "gemini-1.5-pro"],
  },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Check and consume rate limit for a user or IP address based on their subscription plan.
 */
export function checkRateLimit(
  identifier: string,
  plan: UserPlan = "FREE"
): RateLimitResult {
  const quota = PLAN_QUOTAS[plan] || PLAN_QUOTAS.FREE;
  const limit = quota.maxRequestsPerHour;
  const windowMs = 60 * 60 * 1000; // 1 hour
  const now = Date.now();

  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  rateLimitStore.set(identifier, record);

  return {
    allowed: true,
    limit,
    remaining: limit - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

/**
 * Helper to extract client identifier (UserId if logged in, or Client IP)
 */
export function getClientIdentifier(req: NextRequest, user?: UserSession | null): string {
  if (user && user.id) {
    return `usr_${user.id}`;
  }
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return `ip_${ip}`;
}
