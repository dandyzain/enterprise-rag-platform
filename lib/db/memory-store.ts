import type { UserRecord } from "@/lib/auth/types";
import type {
  ChatMessageItem,
  ChatSessionItem,
  DocumentChunkItem,
  DocumentItem,
  KnowledgeBaseItem,
} from "@/lib/rag/types";
import { scoreBM25 } from "@/lib/rag/bm25";
import {
  EmailAlreadyRegisteredError,
  Store,
  StoredFile,
  SYSTEM_KB_ID,
  SYSTEM_OWNER_ID,
} from "./types";

interface MemoryChunk extends DocumentChunkItem {
  embedding: number[];
}

interface MemoryState {
  users: Map<string, UserRecord>;
  knowledgeBases: Map<string, KnowledgeBaseItem>;
  documents: Map<string, DocumentItem>;
  files: Map<string, StoredFile>;
  chunks: Map<string, MemoryChunk>;
  chatSessions: Map<string, ChatSessionItem>;
  messages: Map<string, ChatMessageItem>;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function freshState(): MemoryState {
  return {
    users: new Map(),
    knowledgeBases: new Map([
      [
        SYSTEM_KB_ID,
        {
          id: SYSTEM_KB_ID,
          userId: SYSTEM_OWNER_ID,
          name: "Enterprise Core Knowledge",
          description: "Public demo knowledge base: sample SOP, security policy and DevOps guides.",
          visibility: "public",
          createdAt: new Date(),
        },
      ],
    ]),
    documents: new Map(),
    files: new Map(),
    chunks: new Map(),
    chatSessions: new Map(),
    messages: new Map(),
  };
}

/**
 * Non-persistent store used when DATABASE_URL is not configured.
 * Data lives only as long as the server process (lost on restart / serverless cold start).
 */
export function createMemoryStore(): Store & { reset(): void } {
  let state = freshState();

  const docsOfKb = (kbId: string) =>
    Array.from(state.documents.values()).filter((d) => d.knowledgeBaseId === kbId);

  const withFileFlag = (doc: DocumentItem): DocumentItem => ({
    ...doc,
    hasOriginalFile: state.files.has(doc.id),
  });

  return {
    mode: "memory",

    reset() {
      state = freshState();
    },

    async ping() {},

    // Users
    async createUser(data) {
      const email = data.email.toLowerCase();
      for (const u of state.users.values()) {
        if (u.email === email) throw new EmailAlreadyRegisteredError();
      }
      const user: UserRecord = {
        id: `usr_${crypto.randomUUID()}`,
        email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        plan: data.plan,
        sessionVersion: 1,
        createdAt: new Date(),
      };
      state.users.set(user.id, user);
      return { ...user };
    },
    async getUserById(id) {
      const u = state.users.get(id);
      return u ? { ...u } : null;
    },
    async getUserByEmail(email) {
      const needle = email.toLowerCase();
      for (const u of state.users.values()) {
        if (u.email === needle) return { ...u };
      }
      return null;
    },
    async bumpSessionVersion(userId) {
      const u = state.users.get(userId);
      if (u) u.sessionVersion += 1;
    },

    // Knowledge bases
    async listKnowledgeBasesForOwner(ownerId) {
      return Array.from(state.knowledgeBases.values())
        .filter((kb) => kb.visibility === "public" || (ownerId !== null && kb.userId === ownerId))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((kb) => ({ ...kb }));
    },
    async getKnowledgeBase(id) {
      const kb = state.knowledgeBases.get(id);
      return kb ? { ...kb } : null;
    },
    async createKnowledgeBase(data) {
      const item: KnowledgeBaseItem = {
        id: data.id ?? crypto.randomUUID(),
        userId: data.userId,
        name: data.name,
        description: data.description ?? null,
        visibility: data.visibility ?? "private",
        createdAt: new Date(),
      };
      state.knowledgeBases.set(item.id, item);
      return { ...item };
    },
    async setKnowledgeBaseVisibility(id, visibility) {
      const kb = state.knowledgeBases.get(id);
      if (kb) kb.visibility = visibility;
    },
    async countKnowledgeBasesByOwner(ownerId) {
      return Array.from(state.knowledgeBases.values()).filter((kb) => kb.userId === ownerId).length;
    },

    // Documents
    async createDocument(data) {
      const doc: DocumentItem = {
        id: crypto.randomUUID(),
        knowledgeBaseId: data.knowledgeBaseId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        status: data.status,
        chunkCount: data.chunkCount ?? 0,
        embeddingModel: data.embeddingModel ?? null,
        createdAt: new Date(),
      };
      state.documents.set(doc.id, doc);
      return withFileFlag(doc);
    },
    async updateDocument(id, data) {
      const doc = state.documents.get(id);
      if (!doc) return;
      if (data.status !== undefined) doc.status = data.status;
      if (data.chunkCount !== undefined) doc.chunkCount = data.chunkCount;
      if (data.embeddingModel !== undefined) doc.embeddingModel = data.embeddingModel;
      if (data.fileUrl !== undefined) doc.fileUrl = data.fileUrl;
    },
    async listDocuments(kbId) {
      return docsOfKb(kbId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(withFileFlag);
    },
    async getDocument(id) {
      const doc = state.documents.get(id);
      return doc ? withFileFlag(doc) : null;
    },
    async deleteDocument(id) {
      const existed = state.documents.delete(id);
      state.files.delete(id);
      for (const [chunkId, chunk] of state.chunks) {
        if (chunk.documentId === id) state.chunks.delete(chunkId);
      }
      return existed;
    },
    async countDocumentsByOwner(ownerId) {
      const kbIds = new Set(
        Array.from(state.knowledgeBases.values())
          .filter((kb) => kb.userId === ownerId)
          .map((kb) => kb.id)
      );
      return Array.from(state.documents.values()).filter((d) => kbIds.has(d.knowledgeBaseId)).length;
    },

    // Files
    async saveDocumentFile(documentId, file) {
      state.files.set(documentId, { buffer: Buffer.from(file.buffer), mimeType: file.mimeType });
    },
    async getDocumentFile(documentId) {
      return state.files.get(documentId) ?? null;
    },

    // Chunks
    async replaceChunks(documentId, chunks) {
      for (const [chunkId, chunk] of state.chunks) {
        if (chunk.documentId === documentId) state.chunks.delete(chunkId);
      }
      for (const c of chunks) {
        const id = crypto.randomUUID();
        state.chunks.set(id, {
          id,
          documentId,
          content: c.content,
          chunkIndex: c.chunkIndex,
          pageNumber: c.pageNumber,
          embedding: c.embedding,
          createdAt: new Date(),
        });
      }
    },
    async getDocumentChunks(documentId) {
      return Array.from(state.chunks.values())
        .filter((c) => c.documentId === documentId)
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
        .map((c) => ({
          id: c.id,
          documentId: c.documentId,
          content: c.content,
          chunkIndex: c.chunkIndex,
          pageNumber: c.pageNumber,
          createdAt: c.createdAt,
        }));
    },
    async searchDense({ knowledgeBaseId, embedding, embeddingModel, threshold, limit, documentIds }) {
      const allowedDocs = new Map(
        docsOfKb(knowledgeBaseId)
          .filter((d) => d.status === "INDEXED")
          .filter((d) => !d.embeddingModel || d.embeddingModel === embeddingModel)
          .filter((d) => !documentIds || documentIds.length === 0 || documentIds.includes(d.id))
          .map((d) => [d.id, d])
      );
      const results = [];
      for (const chunk of state.chunks.values()) {
        const doc = allowedDocs.get(chunk.documentId);
        if (!doc) continue;
        const similarity = cosineSimilarity(embedding, chunk.embedding);
        if (similarity < threshold) continue;
        results.push({
          id: chunk.id,
          documentId: chunk.documentId,
          documentTitle: doc.title,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          similarity,
        });
      }
      return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    },
    async searchSparse({ knowledgeBaseId, query, limit, documentIds }) {
      const docs = new Map(
        docsOfKb(knowledgeBaseId)
          .filter((d) => d.status === "INDEXED")
          .filter((d) => !documentIds || documentIds.length === 0 || documentIds.includes(d.id))
          .map((d) => [d.id, d])
      );
      const candidates = [];
      for (const chunk of state.chunks.values()) {
        const doc = docs.get(chunk.documentId);
        if (!doc) continue;
        candidates.push({
          id: chunk.id,
          documentId: chunk.documentId,
          documentTitle: doc.title,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
        });
      }
      return scoreBM25(candidates, query)
        .slice(0, limit)
        .map((r) => ({ chunk: r.chunk, score: r.score, rank: r.rank }));
    },
    async getStorageStats(kbId) {
      const docs = docsOfKb(kbId);
      return {
        documentCount: docs.length,
        totalChunks: docs.reduce((sum, d) => sum + d.chunkCount, 0),
        totalBytes: docs.reduce((sum, d) => sum + d.fileSize, 0),
      };
    },
    async getGlobalStats() {
      return {
        knowledgeBases: state.knowledgeBases.size,
        documents: state.documents.size,
        chunks: state.chunks.size,
      };
    },

    // Chat
    async createChatSession(data) {
      const item: ChatSessionItem = {
        id: crypto.randomUUID(),
        knowledgeBaseId: data.knowledgeBaseId,
        userId: data.userId,
        title: data.title,
        createdAt: new Date(),
      };
      state.chatSessions.set(item.id, item);
      return { ...item };
    },
    async listChatSessions(kbId, userId) {
      return Array.from(state.chatSessions.values())
        .filter((s) => s.knowledgeBaseId === kbId && s.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((s) => ({ ...s }));
    },
    async getChatSession(id) {
      const s = state.chatSessions.get(id);
      return s ? { ...s } : null;
    },
    async renameChatSession(id, title) {
      const s = state.chatSessions.get(id);
      if (s) s.title = title;
    },
    async deleteChatSession(id) {
      const existed = state.chatSessions.delete(id);
      for (const [msgId, msg] of state.messages) {
        if (msg.chatSessionId === id) state.messages.delete(msgId);
      }
      return existed;
    },
    async createChatMessage(data) {
      const item: ChatMessageItem = {
        id: data.id ?? crypto.randomUUID(),
        chatSessionId: data.chatSessionId,
        role: data.role,
        content: data.content,
        citations: data.citations ?? null,
        groundedness: data.groundedness ?? null,
        feedback: null,
        createdAt: new Date(),
      };
      state.messages.set(item.id, item);
      return { ...item };
    },
    async listChatMessages(sessionId) {
      return Array.from(state.messages.values())
        .filter((m) => m.chatSessionId === sessionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((m) => ({ ...m }));
    },
    async getChatMessage(id) {
      const m = state.messages.get(id);
      return m ? { ...m } : null;
    },
    async setMessageFeedback(id, feedback) {
      const m = state.messages.get(id);
      if (m) m.feedback = feedback;
    },
  };
}
