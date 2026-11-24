/**
 * End-to-end API tests against a real PostgreSQL + pgvector database.
 * Runs only when TEST_DATABASE_URL is set (migrations must be applied), e.g.:
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/rag_test pnpm test
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, json, textFile } from "./helpers/client";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("PostgreSQL store (integration)", () => {
  // Route modules are imported after DATABASE_URL is set so the store runs in Postgres mode.
  let routes: Record<string, Record<string, unknown>>;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe(
      `TRUNCATE users, messages, chat_sessions, document_files, document_chunks, documents RESTART IDENTITY CASCADE`
    );
    await prisma.$executeRawUnsafe(`DELETE FROM knowledge_bases WHERE id <> 'default-kb-1'`);
    await prisma.$disconnect();

    routes = {
      register: await import("@/app/api/auth/register/route"),
      login: await import("@/app/api/auth/login/route"),
      kbs: await import("@/app/api/knowledge-bases/route"),
      share: await import("@/app/api/knowledge-bases/[id]/share/route"),
      exportKb: await import("@/app/api/knowledge-bases/[id]/export/route"),
      documents: await import("@/app/api/documents/route"),
      documentById: await import("@/app/api/documents/[id]/route"),
      file: await import("@/app/api/documents/[id]/file/route"),
      reindex: await import("@/app/api/documents/[id]/reindex/route"),
      ingest: await import("@/app/api/documents/ingest/route"),
      search: await import("@/app/api/search/route"),
      sessions: await import("@/app/api/chat/sessions/route"),
      sessionById: await import("@/app/api/chat/sessions/[id]/route"),
      chat: await import("@/app/api/chat/route"),
      feedback: await import("@/app/api/chat/messages/[id]/feedback/route"),
      health: await import("@/app/api/health/route"),
    };
    const { db } = await import("@/lib/db");
    expect(db.mode).toBe("postgres");
  });

  it("runs the full account -> upload -> search -> chat flow on Postgres", async () => {
    const alice = createClient("203.0.113.21");
    const reg = await alice.call(routes.register.POST, "/api/auth/register", {
      json: { name: "Alice", email: "alice.pg@example.com", password: "s3cure-passw0rd" },
    });
    expect(reg.status).toBe(201);

    const relogin = createClient("203.0.113.22");
    const login = await relogin.call(routes.login.POST, "/api/auth/login", {
      json: { email: "alice.pg@example.com", password: "s3cure-passw0rd" },
    });
    expect(login.status).toBe(200);

    const kbRes = await alice.call(routes.kbs.POST, "/api/knowledge-bases", { json: { name: "PG KB" } });
    const kbId = (await json<{ data: { id: string } }>(kbRes)).data.id;

    const content = [
      "SEC-POL-04 requires AES-256 GCM encryption for data at rest.",
      "Data in transit must use TLS 1.3. Administrative sessions expire after 8 hours.",
      ...Array.from({ length: 120 }, (_, i) => `Filler paragraph ${i} describing unrelated onboarding steps.`),
    ].join("\n\n");
    const form = new FormData();
    form.append("file", textFile("security-policy.txt", content));
    form.append("knowledgeBaseId", kbId);
    const up = await alice.call(routes.ingest.POST, "/api/documents/ingest", { form });
    expect(up.status).toBe(201);
    const { documentId, totalChunks } = (await json<{ data: { documentId: string; totalChunks: number } }>(up)).data;
    expect(totalChunks).toBeGreaterThan(1);

    // Hybrid (pgvector + full-text) and keyword-only search
    for (const searchMode of ["hybrid", "keyword", "semantic"]) {
      const res = await alice.call(routes.search.POST, "/api/search", {
        json: { query: "SEC-POL-04 AES-256 encryption", knowledgeBaseId: kbId, searchMode, threshold: 0.1 },
      });
      expect(res.status).toBe(200);
      const chunks = (await json<{ data: { chunks: Array<{ content: string }> } }>(res)).data.chunks;
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain("SEC-POL-04");
    }

    // Original file download + re-index
    const file = await alice.call(routes.file.GET, `/api/documents/${documentId}/file`, { params: { id: documentId } });
    expect(file.status).toBe(200);
    expect(await file.text()).toContain("TLS 1.3");
    const re = await alice.call(routes.reindex.POST, `/api/documents/${documentId}/reindex`, {
      method: "POST",
      params: { id: documentId },
    });
    expect(re.status).toBe(200);

    // Chat with a persisted session + feedback
    const sess = await alice.call(routes.sessions.POST, "/api/chat/sessions", {
      json: { knowledgeBaseId: kbId, title: "Chat 1" },
    });
    const sessionId = (await json<{ data: { id: string } }>(sess)).data.id;
    const chatRes = await alice.call(routes.chat.POST, "/api/chat", {
      json: {
        messages: [{ role: "user", content: "Which encryption does SEC-POL-04 require?" }],
        knowledgeBaseId: kbId,
        chatSessionId: sessionId,
      },
    });
    expect(chatRes.status).toBe(200);
    const messageId = chatRes.headers.get("x-message-id")!;
    expect(await chatRes.text()).toContain("AES-256");
    const fb = await alice.call(routes.feedback.PUT, `/api/chat/messages/${messageId}/feedback`, {
      method: "PUT",
      json: { feedback: "dislike" },
      params: { id: messageId },
    });
    expect(fb.status).toBe(200);
    const history = await alice.call(routes.sessionById.GET, `/api/chat/sessions/${sessionId}`, {
      params: { id: sessionId },
    });
    const msgs = (await json<{ data: Array<{ role: string; feedback: string | null; citations: unknown[] }> }>(history)).data;
    expect(msgs).toHaveLength(2);
    expect(msgs[1].feedback).toBe("dislike");
    expect(msgs[1].citations.length).toBeGreaterThan(0);

    // Isolation on Postgres too
    const bob = createClient("203.0.113.23");
    await bob.call(routes.register.POST, "/api/auth/register", {
      json: { name: "Bob", email: "bob.pg@example.com", password: "s3cure-passw0rd" },
    });
    expect((await bob.call(routes.documents.GET, `/api/documents?kbId=${kbId}`)).status).toBe(404);

    // Sharing -> read-only
    await alice.call(routes.share.POST, `/api/knowledge-bases/${kbId}/share`, {
      json: { enabled: true },
      params: { id: kbId },
    });
    expect((await bob.call(routes.documents.GET, `/api/documents?kbId=${kbId}`)).status).toBe(200);
    expect(
      (await bob.call(routes.documentById.DELETE, `/api/documents/${documentId}`, { method: "DELETE", params: { id: documentId } }))
        .status
    ).toBe(403);

    // Export, then delete (cascades chunks + file)
    const exp = await alice.call(routes.exportKb.GET, `/api/knowledge-bases/${kbId}/export`, { params: { id: kbId } });
    expect((await json<{ documents: unknown[] }>(exp)).documents).toHaveLength(1);
    const del = await alice.call(routes.documentById.DELETE, `/api/documents/${documentId}`, {
      method: "DELETE",
      params: { id: documentId },
    });
    expect(del.status).toBe(200);
    expect((await alice.call(routes.file.GET, `/api/documents/${documentId}/file`, { params: { id: documentId } })).status).toBe(404);

    const health = await (routes.health.GET as () => Promise<Response>)();
    const h = await json<{ status: string; system: { storage: { persistent: boolean } } }>(health);
    expect(h.status).toBe("HEALTHY");
    expect(h.system.storage.persistent).toBe(true);
  });
});
