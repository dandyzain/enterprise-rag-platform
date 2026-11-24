import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { aiConfig } from "@/lib/env";

export type ChatProvider = "openai" | "google";

export interface ByokKeys {
  openai?: string | null;
  gemini?: string | null;
}

export type ChatRoute =
  /** The caller's own key pays for the request: plan quota does not apply (abuse limit still does). */
  | { mode: "byok"; provider: ChatProvider; apiKey: string }
  /** The server's key pays: plan quota applies. */
  | { mode: "server"; provider: ChatProvider }
  /** No model available: deterministic grounded summary. Plan quota applies. */
  | { mode: "offline" };

const OPENAI_KEY_RE = /^sk-[A-Za-z0-9_-]{20,200}$/;
const GEMINI_KEY_RE = /^[A-Za-z0-9_-]{30,100}$/;

export function sanitizeByokKey(provider: ChatProvider, raw: string | null | undefined): string | null {
  const key = raw?.trim();
  if (!key) return null;
  return (provider === "openai" ? OPENAI_KEY_RE : GEMINI_KEY_RE).test(key) ? key : null;
}

/**
 * Decide who pays for a chat request.
 *
 * BYOK only applies when the caller supplied a valid key for the provider that
 * will actually be used. A key for one provider can never unlock the server's
 * key for another provider (previous bypass: fake Gemini key + "openai"
 * provider = unlimited requests on the host's OpenAI key).
 */
export function resolveChatRoute(input: {
  requested: ChatProvider;
  byok: ByokKeys;
  server: { openai: boolean; google: boolean };
}): ChatRoute {
  const byokKey =
    input.requested === "google"
      ? sanitizeByokKey("google", input.byok.gemini)
      : sanitizeByokKey("openai", input.byok.openai);
  if (byokKey) return { mode: "byok", provider: input.requested, apiKey: byokKey };

  if (input.requested === "google" && input.server.google) return { mode: "server", provider: "google" };
  if (input.requested === "openai" && input.server.openai) return { mode: "server", provider: "openai" };
  if (input.server.openai) return { mode: "server", provider: "openai" };
  if (input.server.google) return { mode: "server", provider: "google" };
  return { mode: "offline" };
}

export function chatModelId(provider: ChatProvider): string {
  return provider === "google" ? aiConfig.googleChatModel() : aiConfig.openaiChatModel();
}

export function createChatModel(route: Exclude<ChatRoute, { mode: "offline" }>): LanguageModel {
  const modelId = chatModelId(route.provider);
  if (route.provider === "google") {
    const provider = createGoogleGenerativeAI(
      route.mode === "byok" ? { apiKey: route.apiKey } : { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }
    );
    return provider(modelId);
  }
  const provider = createOpenAI(
    route.mode === "byok" ? { apiKey: route.apiKey } : { apiKey: process.env.OPENAI_API_KEY }
  );
  return provider(modelId);
}

export function serverModelAvailability() {
  return { openai: aiConfig.hasServerOpenAI(), google: aiConfig.hasServerGoogle() };
}
