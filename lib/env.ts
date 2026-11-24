/**
 * Central, server-only runtime configuration.
 *
 * Everything that depends on environment variables is resolved here so the
 * rest of the code base never reads `process.env` directly for app settings.
 */

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const DEV_AUTH_SECRET = "cortex-dev-only-auth-secret-do-not-use-in-production";

/**
 * Secret used to sign session tokens.
 *
 * - Production: `AUTH_SECRET` must be set (>= 32 chars). Without it sign-in is
 *   disabled instead of silently falling back to a public, guessable secret.
 * - Development / test: a clearly labelled dev secret is used as a fallback.
 */
export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (secret && !isProduction) return secret;
  if (isProduction) return null;
  return DEV_AUTH_SECRET;
}

export function isAuthConfigured(): boolean {
  return getAuthSecret() !== null;
}

/** Demo profile sign-in (Admin / Member / Guest sandboxes). Enabled unless explicitly disabled. */
export function isDemoLoginEnabled(): boolean {
  return process.env.ENABLE_DEMO_LOGIN !== "false";
}

/** E-mail addresses (comma separated) that receive the ADMIN role on registration / sign-in. */
export function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Public base URL used for robots.txt, sitemap and Open Graph metadata. */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd}`;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export type StorageMode = "postgres" | "memory";

/** Postgres when DATABASE_URL is set, otherwise the explicit (non-persistent) in-memory store. */
export function getStorageMode(): StorageMode {
  return process.env.DATABASE_URL ? "postgres" : "memory";
}

/** Auto-populate the public demo knowledge base with sample documents when it is empty. */
export function shouldSeedDemoKb(): boolean {
  return process.env.SEED_DEMO_KB !== "false";
}

export const aiConfig = {
  openaiChatModel: () => process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-5.4-mini",
  openaiEmbeddingModel: () => process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
  googleChatModel: () => process.env.GOOGLE_CHAT_MODEL?.trim() || "gemini-flash-latest",
  googleEmbeddingModel: () => process.env.GOOGLE_EMBEDDING_MODEL?.trim() || "gemini-embedding-001",
  hasServerOpenAI: () => Boolean(process.env.OPENAI_API_KEY?.trim()),
  hasServerGoogle: () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
};

/** Upstash Redis REST credentials (also accepts the Vercel KV variable names). */
export function getRedisRestConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}
