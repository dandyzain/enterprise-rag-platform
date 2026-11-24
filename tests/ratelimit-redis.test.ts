import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, rateLimitBackend, resetMemoryRateLimits } from "@/lib/ratelimit";

describe("Upstash Redis rate limiter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetMemoryRateLimits();
  });

  it("uses an atomic INCR/EXPIRE pipeline shared across instances", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example-redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    let counter = 0;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const commands = JSON.parse(String(init.body));
      expect(commands[0][0]).toBe("INCR");
      expect(commands[1]).toEqual(["EXPIRE", "cortex:rl:chat:u:1", "3600", "NX"]);
      counter += 1;
      return new Response(JSON.stringify([{ result: counter }, { result: 1 }, { result: 1800 }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(rateLimitBackend()).toBe("redis");
    const rule = { limit: 2, windowSeconds: 3600 };
    expect((await checkRateLimit("chat:u:1", rule)).allowed).toBe(true);
    expect((await checkRateLimit("chat:u:1", rule)).remaining).toBe(0);
    const third = await checkRateLimit("chat:u:1", rule);
    expect(third.allowed).toBe(false);
    expect(third.resetInSeconds).toBe(1800);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("falls back to the in-memory limiter when Redis is unreachable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example-redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rule = { limit: 1, windowSeconds: 60 };
    expect((await checkRateLimit("k", rule)).allowed).toBe(true);
    expect((await checkRateLimit("k", rule)).allowed).toBe(false);
  });
});
