import { describe, expect, it } from "vitest";
import { resolveChatRoute, sanitizeByokKey } from "@/lib/ai/models";

const OPENAI_KEY = "sk-proj-abcdefghijklmnopqrstuvwxyz012345";
const GEMINI_KEY = "AIzaSyA1234567890abcdefghijklmnopqrstuv";

describe("resolveChatRoute (who pays for a chat request)", () => {
  it("regression: a fake Gemini key cannot unlock the server's OpenAI key", () => {
    const route = resolveChatRoute({
      requested: "openai",
      byok: { gemini: "aaaaaaaaaaaaaaaaaaaaaaaa" },
      server: { openai: true, google: false },
    });
    expect(route).toEqual({ mode: "server", provider: "openai" });
  });

  it("a Gemini key does not count as BYOK when OpenAI is requested", () => {
    const route = resolveChatRoute({
      requested: "openai",
      byok: { gemini: GEMINI_KEY },
      server: { openai: true, google: false },
    });
    expect(route.mode).toBe("server");
  });

  it("uses the caller's key for the requested provider", () => {
    expect(
      resolveChatRoute({ requested: "openai", byok: { openai: OPENAI_KEY }, server: { openai: true, google: true } })
    ).toEqual({ mode: "byok", provider: "openai", apiKey: OPENAI_KEY });
    expect(
      resolveChatRoute({ requested: "google", byok: { gemini: GEMINI_KEY }, server: { openai: false, google: false } })
    ).toEqual({ mode: "byok", provider: "google", apiKey: GEMINI_KEY });
  });

  it("falls back to the other server provider, then offline", () => {
    expect(resolveChatRoute({ requested: "google", byok: {}, server: { openai: true, google: false } })).toEqual({
      mode: "server",
      provider: "openai",
    });
    expect(resolveChatRoute({ requested: "openai", byok: {}, server: { openai: false, google: false } })).toEqual({
      mode: "offline",
    });
  });

  it("ignores malformed keys", () => {
    expect(sanitizeByokKey("openai", "sk-")).toBeNull();
    expect(sanitizeByokKey("openai", "not-a-key")).toBeNull();
    expect(sanitizeByokKey("openai", `${OPENAI_KEY}\nX-Injected: 1`)).toBeNull();
    expect(sanitizeByokKey("google", "short")).toBeNull();
  });
});
