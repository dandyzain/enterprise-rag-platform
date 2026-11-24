import type { UserPlan } from "@/lib/auth/types";
import { getRedisRestConfig } from "@/lib/env";

export interface PlanQuota {
  maxRequestsPerHour: number;
  maxDocuments: number;
  maxKnowledgeBases: number;
  maxFileSizeMb: number;
}

export const PLAN_QUOTAS: Record<UserPlan, PlanQuota> = {
  FREE: { maxRequestsPerHour: 15, maxDocuments: 3, maxKnowledgeBases: 3, maxFileSizeMb: 10 },
  PRO: { maxRequestsPerHour: 120, maxDocuments: 25, maxKnowledgeBases: 20, maxFileSizeMb: 25 },
  ENTERPRISE: { maxRequestsPerHour: 1000, maxDocuments: 500, maxKnowledgeBases: 200, maxFileSizeMb: 50 },
};

export function getPlanQuota(plan: UserPlan | undefined | null): PlanQuota {
  return PLAN_QUOTAS[plan ?? "FREE"] ?? PLAN_QUOTAS.FREE;
}

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

/** Rules for non-chat endpoints (per user when signed in, otherwise per IP). */
export const RATE_LIMITS = {
  /** Brute-force protection for sign-in, per IP and per e-mail. */
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  search: { limit: 120, windowSeconds: 60 * 60 },
  ingest: { limit: 30, windowSeconds: 60 * 60 },
  seed: { limit: 10, windowSeconds: 60 * 60 },
  import: { limit: 10, windowSeconds: 60 * 60 },
  /** Abuse guard when the caller pays with their own key (BYOK). */
  byokChat: { limit: 300, windowSeconds: 60 * 60 },
  write: { limit: 300, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

// ---------------------------------------------------------------------------
// In-memory fixed window (single instance / local development fallback)
// ---------------------------------------------------------------------------
interface MemoryRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryRecord>();
const MAX_MEMORY_KEYS = 50_000;

function pruneMemory(now: number) {
  if (memoryStore.size < MAX_MEMORY_KEYS) return;
  for (const [key, rec] of memoryStore) {
    if (rec.resetAt <= now) memoryStore.delete(key);
  }
}

function memoryLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  pruneMemory(now);
  const windowMs = rule.windowSeconds * 1000;
  let rec = memoryStore.get(key);
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, rec);
  }
  const resetInSeconds = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
  if (rec.count >= rule.limit) {
    return { allowed: false, limit: rule.limit, remaining: 0, resetInSeconds };
  }
  rec.count += 1;
  return { allowed: true, limit: rule.limit, remaining: rule.limit - rec.count, resetInSeconds };
}

export function resetMemoryRateLimits(): void {
  memoryStore.clear();
}

// ---------------------------------------------------------------------------
// Upstash Redis REST fixed window (shared across serverless instances)
// ---------------------------------------------------------------------------
async function redisLimit(
  key: string,
  rule: RateLimitRule,
  config: { url: string; token: string }
): Promise<RateLimitResult> {
  const redisKey = `cortex:rl:${key}`;
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(rule.windowSeconds), "NX"],
      ["TTL", redisKey],
    ]),
    signal: AbortSignal.timeout(1500),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
  const data = (await res.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(data[0]?.result);
  const ttl = Number(data[2]?.result);
  if (!Number.isFinite(count)) throw new Error(data[0]?.error || "Invalid Upstash response");
  const resetInSeconds = ttl > 0 ? ttl : rule.windowSeconds;
  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetInSeconds,
  };
}

let warnedRedisFailure = false;

/**
 * Consume one request from a fixed-window bucket.
 * Uses Upstash Redis when configured (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN),
 * otherwise — or if Redis is unreachable — an in-process counter.
 */
export async function checkRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const redis = getRedisRestConfig();
  if (redis) {
    try {
      return await redisLimit(key, rule, redis);
    } catch (err) {
      if (!warnedRedisFailure) {
        console.warn("[RateLimit] Upstash Redis unavailable, using in-memory limiter:", err);
        warnedRedisFailure = true;
      }
    }
  }
  return memoryLimit(key, rule);
}

export function rateLimitBackend(): "redis" | "memory" {
  return getRedisRestConfig() ? "redis" : "memory";
}
