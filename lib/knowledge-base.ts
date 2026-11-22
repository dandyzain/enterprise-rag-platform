// Shared by API routes, lib/db and client components, so it must not import
// anything server-only (such as the Prisma client).

/**
 * Id of the built-in knowledge base used when a request names none.
 *
 * Knowledge base ids are UUID columns in PostgreSQL, so this has to be a valid
 * UUID. The row itself is created by the migration
 * prisma/migrations/20261122120100_seed_default_knowledge_base.
 */
export const DEFAULT_KNOWLEDGE_BASE_ID = "00000000-0000-4000-8000-000000000001";

/** The default knowledge base's id before ids had to be UUIDs. */
const LEGACY_DEFAULT_KNOWLEDGE_BASE_ID = "default-kb-1";

/**
 * Maps the legacy default id to the current one, so API clients, shared links
 * (`/dashboard?kb=default-kb-1`) and scripts written against the old id keep
 * working. Any other id is returned unchanged.
 */
export function resolveKnowledgeBaseId(id: string): string {
  return id === LEGACY_DEFAULT_KNOWLEDGE_BASE_ID ? DEFAULT_KNOWLEDGE_BASE_ID : id;
}
