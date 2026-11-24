import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { demoUserId, signToken, verifyToken } from "@/lib/auth/session";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("uses a random salt per hash", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toEqual(b);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", "scrypt$a$b$c$d$e")).toBe(false);
  });
});

describe("session tokens", () => {
  afterEach(() => vi.useRealTimers());

  const payload = () => {
    const iat = Math.floor(Date.now() / 1000);
    return { v: 1 as const, kind: "user" as const, sub: "usr_1", sv: 1, iat, exp: iat + 60 };
  };

  it("round-trips a valid token", () => {
    const token = signToken(payload());
    expect(verifyToken(token)?.sub).toBe("usr_1");
  });

  it("rejects a tampered payload", () => {
    const token = signToken(payload());
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload(), sub: "usr_admin" })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = signToken(payload(), "another-secret-another-secret-another-secret");
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signToken(payload());
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 120_000);
    expect(verifyToken(token)).toBeNull();
  });

  it("gives each visitor an isolated demo identity", () => {
    expect(demoUserId("ADMIN", "visitor-a")).not.toEqual(demoUserId("ADMIN", "visitor-b"));
    expect(demoUserId("ADMIN", "visitor-a")).toEqual(demoUserId("ADMIN", "visitor-a"));
    expect(demoUserId("ADMIN", "visitor-a")).not.toContain("visitor-a");
  });
});
