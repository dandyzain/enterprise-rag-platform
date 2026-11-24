import type { UserSession } from "@/lib/auth/types";
import { db, SYSTEM_KB_ID, SYSTEM_OWNER_ID } from "@/lib/db";
import type { ChatSessionItem, DocumentItem, KnowledgeBaseItem } from "@/lib/rag/types";
import { ensureDemoKnowledgeBaseSeeded } from "@/lib/rag/seed";
import { Actor, ApiError } from "./route";

/** A real (non-demo) administrator account. Demo "Admin" profiles are sandboxed. */
export function isRealAdmin(user: UserSession | null): boolean {
  return Boolean(user && user.role === "ADMIN" && !user.isDemo);
}

export function canReadKb(actor: Actor, kb: KnowledgeBaseItem): boolean {
  if (kb.visibility === "public" || kb.visibility === "link") return true;
  return kb.userId === actor.ownerId;
}

export function canWriteKb(actor: Actor, kb: KnowledgeBaseItem): boolean {
  if (kb.userId === SYSTEM_OWNER_ID) return isRealAdmin(actor.user);
  return Boolean(actor.user) && kb.userId === actor.ownerId;
}

/** Not-found and forbidden look identical to callers without read access (no id enumeration). */
export async function loadReadableKb(actor: Actor, kbId: string): Promise<KnowledgeBaseItem> {
  const kb = await db.getKnowledgeBase(kbId);
  if (!kb || !canReadKb(actor, kb)) throw new ApiError("KB_NOT_FOUND", 404);
  if (kb.id === SYSTEM_KB_ID) await ensureDemoKnowledgeBaseSeeded();
  return kb;
}

export async function loadWritableKb(actor: Actor, kbId: string): Promise<KnowledgeBaseItem> {
  const kb = await db.getKnowledgeBase(kbId);
  if (!kb || !canReadKb(actor, kb)) throw new ApiError("KB_NOT_FOUND", 404);
  if (!actor.user) throw new ApiError("UNAUTHENTICATED", 401);
  if (!canWriteKb(actor, kb)) throw new ApiError("KB_READ_ONLY", 403);
  return kb;
}

export async function loadReadableDocument(
  actor: Actor,
  documentId: string
): Promise<{ document: DocumentItem; kb: KnowledgeBaseItem }> {
  const document = await db.getDocument(documentId);
  if (!document) throw new ApiError("DOC_NOT_FOUND", 404);
  const kb = await db.getKnowledgeBase(document.knowledgeBaseId);
  if (!kb || !canReadKb(actor, kb)) throw new ApiError("DOC_NOT_FOUND", 404);
  return { document, kb };
}

export async function loadWritableDocument(
  actor: Actor,
  documentId: string
): Promise<{ document: DocumentItem; kb: KnowledgeBaseItem }> {
  const result = await loadReadableDocument(actor, documentId);
  if (!actor.user) throw new ApiError("UNAUTHENTICATED", 401);
  if (!canWriteKb(actor, result.kb)) throw new ApiError("KB_READ_ONLY", 403);
  return result;
}

/** Chat sessions are private to whoever created them. */
export async function loadOwnedSession(actor: Actor, sessionId: string): Promise<ChatSessionItem> {
  const session = await db.getChatSession(sessionId);
  if (!session || session.userId !== actor.ownerId) throw new ApiError("SESSION_NOT_FOUND", 404);
  return session;
}

/** Annotate knowledge bases with the viewer's write permission (drives UI affordances). */
export function withPermissions(actor: Actor, kbs: KnowledgeBaseItem[]): KnowledgeBaseItem[] {
  return kbs.map((kb) => ({ ...kb, canWrite: canWriteKb(actor, kb) }));
}

/** Knowledge bases visible in the viewer's switcher: own + public demo (+ an opened shared one). */
export async function listVisibleKnowledgeBases(
  actor: Actor,
  include?: KnowledgeBaseItem | null
): Promise<KnowledgeBaseItem[]> {
  const kbs = await db.listKnowledgeBasesForOwner(actor.user ? actor.ownerId : null);
  if (include && !kbs.some((k) => k.id === include.id) && canReadKb(actor, include)) {
    kbs.push(include);
  }
  return withPermissions(actor, kbs);
}
