import { getStorageMode } from "@/lib/env";
import { createMemoryStore } from "./memory-store";
import { createPostgresStore } from "./postgres-store";
import type { Store } from "./types";

export * from "./types";

const globalForStore = globalThis as unknown as { __cortexStore?: Store };

/**
 * The single persistence backend for this process.
 *
 * - DATABASE_URL set   -> PostgreSQL + pgvector (errors surface, no silent fallback)
 * - DATABASE_URL unset -> explicit in-memory demo store (reported as non-persistent)
 */
function initStore(): Store {
  return getStorageMode() === "postgres" ? createPostgresStore() : createMemoryStore();
}

export const db: Store = globalForStore.__cortexStore ?? initStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__cortexStore = db;
}

/** Test helper: wipe the in-memory store between test cases. */
export function resetMemoryStore(): void {
  const maybe = db as Store & { reset?: () => void };
  if (db.mode === "memory" && typeof maybe.reset === "function") maybe.reset();
}
