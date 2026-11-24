import { beforeEach, describe, expect, it } from "vitest";
import * as register from "@/app/api/auth/register/route";
import * as login from "@/app/api/auth/login/route";
import * as logout from "@/app/api/auth/logout/route";
import * as me from "@/app/api/auth/me/route";
import * as kbs from "@/app/api/knowledge-bases/route";
import * as kbShare from "@/app/api/knowledge-bases/[id]/share/route";
import * as kbExport from "@/app/api/knowledge-bases/[id]/export/route";
import * as kbImport from "@/app/api/knowledge-bases/import/route";
import * as documents from "@/app/api/documents/route";
import * as documentById from "@/app/api/documents/[id]/route";
import * as documentFile from "@/app/api/documents/[id]/file/route";
import * as ingest from "@/app/api/documents/ingest/route";
import * as sessions from "@/app/api/chat/sessions/route";
import * as sessionById from "@/app/api/chat/sessions/[id]/route";
import * as chat from "@/app/api/chat/route";
import * as feedback from "@/app/api/chat/messages/[id]/feedback/route";
import * as search from "@/app/api/search/route";
import { createClient, json, textFile } from "./helpers/client";
import { resetAll } from "./helpers/reset";

type Client = ReturnType<typeof createClient>;

async function signUp(client: Client, email: string, password = "s3cure-passw0rd") {
  const res = await client.call(register.POST, "/api/auth/register", {
    json: { name: email.split("@")[0], email, password },
  });
  expect(res.status).toBe(201);
  return (await json<{ user: { id: string } }>(res)).user;
}

async function createKb(client: Client, name = "Private KB") {
  const res = await client.call(kbs.POST, "/api/knowledge-bases", { json: { name } });
  expect(res.status).toBe(201);
  return (await json<{ data: { id: string } }>(res)).data;
}

async function upload(client: Client, kbId: string, name = "secret.txt", content = "Project Falcon budget is 42 million.") {
  const form = new FormData();
  form.append("file", textFile(name, content));
  form.append("knowledgeBaseId", kbId);
  return client.call(ingest.POST, "/api/documents/ingest", { form });
}

beforeEach(() => resetAll());

describe("authentication", () => {
  it("requires the correct password (no more 'any password works')", async () => {
    const alice = createClient();
    await signUp(alice, "alice@example.com");

    const attacker = createClient("198.51.100.7");
    const wrong = await attacker.call(login.POST, "/api/auth/login", {
      json: { email: "alice@example.com", password: "guess-guess" },
    });
    expect(wrong.status).toBe(401);
    expect((await json(wrong)).code).toBe("INVALID_CREDENTIALS");

    const unknown = await attacker.call(login.POST, "/api/auth/login", {
      json: { email: "nobody@example.com", password: "whatever-123" },
    });
    expect(unknown.status).toBe(401);

    const ok = await attacker.call(login.POST, "/api/auth/login", {
      json: { email: "alice@example.com", password: "s3cure-passw0rd" },
    });
    expect(ok.status).toBe(200);
  });

  it("does not grant ADMIN because the e-mail contains 'admin'", async () => {
    const client = createClient();
    const res = await client.call(register.POST, "/api/auth/register", {
      json: { name: "Mallory", email: "admin@evil.example", password: "s3cure-passw0rd" },
    });
    const body = await json<{ user: { role: string; plan: string } }>(res);
    expect(body.user.role).toBe("MEMBER");
    expect(body.user.plan).toBe("FREE");
  });

  it("rejects duplicate registration and short passwords", async () => {
    const client = createClient();
    await signUp(client, "bob@example.com");
    const dup = await client.call(register.POST, "/api/auth/register", {
      json: { name: "Bob", email: "BOB@example.com", password: "s3cure-passw0rd" },
    });
    expect(dup.status).toBe(409);
    const short = await client.call(register.POST, "/api/auth/register", {
      json: { name: "Eve", email: "eve@example.com", password: "123" },
    });
    expect(short.status).toBe(400);
  });

  it("logout revokes the token server-side", async () => {
    const client = createClient();
    await signUp(client, "carol@example.com");
    const stolenCookie = client.jar.get("cortex_auth_session")!;

    await client.call(logout.POST, "/api/auth/logout", { method: "POST" });

    const replay = createClient();
    replay.jar.set("cortex_auth_session", stolenCookie);
    const res = await replay.call(me.GET, "/api/auth/me");
    expect((await json<{ user: unknown }>(res)).user).toBeNull();
  });

  it("rate-limits repeated failed logins", async () => {
    const attacker = createClient("198.51.100.99");
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await attacker.call(login.POST, "/api/auth/login", {
        json: { email: "victim@example.com", password: `guess-${i}-xx` },
      });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe("authorization / tenant isolation", () => {
  it("another user cannot read, download, delete or export my documents", async () => {
    const alice = createClient("203.0.113.1");
    await signUp(alice, "alice@example.com");
    const kb = await createKb(alice);
    const uploaded = await upload(alice, kb.id);
    expect(uploaded.status).toBe(201);
    const docId = (await json<{ data: { documentId: string } }>(uploaded)).data.documentId;

    const bob = createClient("203.0.113.2");
    await signUp(bob, "bob@example.com");

    expect((await bob.call(documentById.GET, `/api/documents/${docId}`, { params: { id: docId } })).status).toBe(404);
    expect((await bob.call(documentFile.GET, `/api/documents/${docId}/file`, { params: { id: docId } })).status).toBe(404);
    expect(
      (await bob.call(documentById.DELETE, `/api/documents/${docId}`, { method: "DELETE", params: { id: docId } })).status
    ).toBe(404);
    expect((await bob.call(kbExport.GET, `/api/knowledge-bases/${kb.id}/export`, { params: { id: kb.id } })).status).toBe(404);
    expect((await bob.call(documents.GET, `/api/documents?kbId=${kb.id}`)).status).toBe(404);
    const searchRes = await bob.call(search.POST, "/api/search", {
      json: { query: "Falcon budget", knowledgeBaseId: kb.id },
    });
    expect(searchRes.status).toBe(404);

    // The owner still can.
    const own = await alice.call(documentFile.GET, `/api/documents/${docId}/file`, { params: { id: docId } });
    expect(own.status).toBe(200);
    expect(own.headers.get("content-disposition")).toContain("attachment");
    expect(await own.text()).toContain("Project Falcon");
  });

  it("the knowledge-base list does not leak other tenants", async () => {
    const alice = createClient("203.0.113.1");
    await signUp(alice, "alice@example.com");
    await createKb(alice, "Alice Confidential");

    const bob = createClient("203.0.113.2");
    await signUp(bob, "bob@example.com");
    const res = await bob.call(documents.GET, "/api/documents?kbId=default-kb-1");
    const names = (await json<{ data: { knowledgeBases: Array<{ name: string }> } }>(res)).data.knowledgeBases.map(
      (k) => k.name
    );
    expect(names).not.toContain("Alice Confidential");
  });

  it("chat sessions are private and cannot be hijacked through /api/chat", async () => {
    const alice = createClient("203.0.113.1");
    await signUp(alice, "alice@example.com");
    const created = await alice.call(sessions.POST, "/api/chat/sessions", {
      json: { knowledgeBaseId: "default-kb-1", title: "Chat 1" },
    });
    const sessionId = (await json<{ data: { id: string } }>(created)).data.id;

    const bob = createClient("203.0.113.2");
    expect((await bob.call(sessionById.GET, `/api/chat/sessions/${sessionId}`, { params: { id: sessionId } })).status).toBe(404);
    expect(
      (await bob.call(sessionById.DELETE, `/api/chat/sessions/${sessionId}`, { method: "DELETE", params: { id: sessionId } }))
        .status
    ).toBe(404);
    const hijack = await bob.call(chat.POST, "/api/chat", {
      json: { messages: [{ role: "user", content: "hi" }], knowledgeBaseId: "default-kb-1", chatSessionId: sessionId },
    });
    expect(hijack.status).toBe(404);

    const list = await bob.call(sessions.GET, "/api/chat/sessions?kbId=default-kb-1");
    expect((await json<{ data: unknown[] }>(list)).data).toHaveLength(0);
  });

  it("anonymous visitors and demo profiles cannot modify the public demo knowledge base", async () => {
    const anon = createClient("203.0.113.5");
    expect((await upload(anon, "default-kb-1")).status).toBe(401);

    const demo = createClient("203.0.113.6");
    const demoLogin = await demo.call(login.POST, "/api/auth/login", { json: { demoRole: "ADMIN" } });
    expect(demoLogin.status).toBe(200);
    const res = await upload(demo, "default-kb-1");
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("KB_READ_ONLY");
  });

  it("demo profiles are isolated per browser", async () => {
    const a = createClient("203.0.113.7");
    const b = createClient("203.0.113.8");
    await a.call(login.POST, "/api/auth/login", { json: { demoRole: "MEMBER" } });
    await b.call(login.POST, "/api/auth/login", { json: { demoRole: "MEMBER" } });
    const kb = await createKb(a, "Visitor A notes");

    const res = await b.call(documents.GET, `/api/documents?kbId=${kb.id}`);
    expect(res.status).toBe(404);
  });

  it("link sharing gives read-only access", async () => {
    const alice = createClient("203.0.113.1");
    await signUp(alice, "alice@example.com");
    const kb = await createKb(alice);
    const uploaded = await upload(alice, kb.id);
    const docId = (await json<{ data: { documentId: string } }>(uploaded)).data.documentId;

    const share = await alice.call(kbShare.POST, `/api/knowledge-bases/${kb.id}/share`, {
      json: { enabled: true },
      params: { id: kb.id },
    });
    expect(share.status).toBe(200);

    const bob = createClient("203.0.113.2");
    await signUp(bob, "bob@example.com");
    const read = await bob.call(documents.GET, `/api/documents?kbId=${kb.id}`);
    expect(read.status).toBe(200);
    expect((await json<{ data: { knowledgeBase: { canWrite: boolean } } }>(read)).data.knowledgeBase.canWrite).toBe(false);

    const del = await bob.call(documentById.DELETE, `/api/documents/${docId}`, { method: "DELETE", params: { id: docId } });
    expect(del.status).toBe(403);
    expect((await bob.call(kbExport.GET, `/api/knowledge-bases/${kb.id}/export`, { params: { id: kb.id } })).status).toBe(403);
  });

  it("restored backups belong to the caller and respect quotas", async () => {
    const anon = createClient("203.0.113.9");
    const res = await anon.call(kbImport.POST, "/api/knowledge-bases/import", {
      json: { knowledgeBase: { name: "X" }, documents: [] },
    });
    expect(res.status).toBe(401);

    const alice = createClient("203.0.113.1");
    await signUp(alice, "alice@example.com");
    const tooMany = await alice.call(kbImport.POST, "/api/knowledge-bases/import", {
      json: {
        knowledgeBase: { name: "Big" },
        documents: Array.from({ length: 5 }, (_, i) => ({ title: `d${i}`, chunks: [{ content: "text" }] })),
      },
    });
    expect(tooMany.status).toBe(403);
    expect((await json(tooMany)).code).toBe("DOC_LIMIT");
  });
});

describe("chat quota (BYOK bypass regression)", () => {
  it("a fake BYOK header no longer bypasses the plan quota", async () => {
    const client = createClient("192.0.2.50");
    let last: Response | null = null;
    for (let i = 0; i < 16; i++) {
      last = await client.call(chat.POST, "/api/chat", {
        headers: { "x-custom-gemini-key": "aaaaaaaaaaaaaaaaaaaaaaaa" },
        json: { messages: [{ role: "user", content: `question ${i}` }], modelProvider: "openai" },
      });
      if (last.status === 200) await last.text();
    }
    expect(last!.status).toBe(429);
    const body = await json<{ code: string; resetInSeconds: number }>(last!);
    expect(body.code).toBe("QUOTA_CHAT");
    expect(body.resetInSeconds).toBeGreaterThan(0);
  });
});

describe("chat persistence and feedback", () => {
  it("stores answers with a message id and persists feedback", async () => {
    const alice = createClient("203.0.113.1");
    await signUp(alice, "alice@example.com");
    const kb = await createKb(alice);
    await upload(alice, kb.id, "policy.txt", "SEC-POL-04 requires AES-256 encryption for data at rest.");
    const created = await alice.call(sessions.POST, "/api/chat/sessions", {
      json: { knowledgeBaseId: kb.id, title: "Chat 1" },
    });
    const sessionId = (await json<{ data: { id: string } }>(created)).data.id;

    const res = await alice.call(chat.POST, "/api/chat", {
      json: {
        messages: [{ role: "user", content: "What encryption does SEC-POL-04 require?" }],
        knowledgeBaseId: kb.id,
        chatSessionId: sessionId,
        locale: "en",
      },
    });
    expect(res.status).toBe(200);
    const messageId = res.headers.get("x-message-id")!;
    const answer = await res.text();
    expect(answer).toContain("AES-256");
    expect(answer).toContain("[1]");

    const fb = await alice.call(feedback.PUT, `/api/chat/messages/${messageId}/feedback`, {
      method: "PUT",
      json: { feedback: "like" },
      params: { id: messageId },
    });
    expect(fb.status).toBe(200);

    const history = await alice.call(sessionById.GET, `/api/chat/sessions/${sessionId}`, { params: { id: sessionId } });
    const messages = (await json<{ data: Array<{ id: string; role: string; feedback: string | null }> }>(history)).data;
    expect(messages.map((m) => m.role)).toEqual(["USER", "ASSISTANT"]);
    expect(messages.find((m) => m.id === messageId)?.feedback).toBe("like");

    const list = await alice.call(sessions.GET, `/api/chat/sessions?kbId=${kb.id}`);
    expect((await json<{ data: Array<{ title: string }> }>(list)).data[0].title).not.toBe("Chat 1");

    const bob = createClient("203.0.113.2");
    const stolen = await bob.call(feedback.PUT, `/api/chat/messages/${messageId}/feedback`, {
      method: "PUT",
      json: { feedback: "dislike" },
      params: { id: messageId },
    });
    expect(stolen.status).toBe(404);
  });
});

describe("error responses", () => {
  it("are localized and never leak internals", async () => {
    const client = createClient();
    const res = await client.call(documents.GET, "/api/documents?kbId=does-not-exist", {
      headers: { "x-locale": "id" },
    });
    expect(res.status).toBe(404);
    expect((await json<{ error: string }>(res)).error).toBe("Knowledge Base tidak ditemukan.");

    const bad = await client.call(search.POST, "/api/search", {
      headers: { "content-type": "application/json" },
      method: "POST",
      json: undefined,
    });
    expect(bad.status).toBe(400);
  });

  it("sets an httpOnly visitor cookie for anonymous visitors", async () => {
    const client = createClient();
    await client.call(me.GET, "/api/auth/me");
    expect(client.jar.get("cortex_vid")).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});
