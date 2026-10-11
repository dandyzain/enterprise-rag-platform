import { PrismaClient } from "@prisma/client";
import {
  DocumentItem,
  DocumentChunkItem,
  KnowledgeBaseItem,
  SearchResultChunk,
  ChatSessionItem,
  ChatMessageItem,
  CitationItem,
  DocumentStatus,
  GroundednessReport,
} from "@/lib/rag/types";

// Global Prisma Singleton for Next.js hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// In-Memory Fallback Store (Used when DATABASE_URL is not set or DB is offline)
interface InMemoryStore {
  knowledgeBases: Map<string, KnowledgeBaseItem>;
  documents: Map<string, DocumentItem>;
  chunks: Map<string, DocumentChunkItem>;
  chatSessions: Map<string, ChatSessionItem>;
  messages: Map<string, ChatMessageItem>;
}

const defaultKbId = "default-kb-1";

const memoryStore: InMemoryStore = {
  knowledgeBases: new Map([
    [
      defaultKbId,
      {
        id: defaultKbId,
        userId: "user_enterprise",
        name: "Enterprise Core Knowledge",
        description: "Dokumentasi standar SOP, arsitektur sistem, dan panduan operasional perusahaan.",
        createdAt: new Date(),
      },
    ],
  ]),
  documents: new Map(),
  chunks: new Map(),
  chatSessions: new Map(),
  messages: new Map(),
};

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const db = {
  // Knowledge Base Methods
  async getKnowledgeBases(): Promise<KnowledgeBaseItem[]> {
    try {
      if (process.env.DATABASE_URL) {
        const rows = await prisma.knowledgeBase.findMany({
          orderBy: { createdAt: "desc" },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            userId: r.userId,
            name: r.name,
            description: r.description,
            createdAt: r.createdAt,
          }));
        }
      }
    } catch (err) {
      console.warn("[DB] PostgreSQL unavailable, falling back to memory store:", err);
    }
    return Array.from(memoryStore.knowledgeBases.values());
  },

  async createKnowledgeBase(name: string, description?: string): Promise<KnowledgeBaseItem> {
    const id = crypto.randomUUID();
    const item: KnowledgeBaseItem = {
      id,
      userId: "user_enterprise",
      name,
      description: description ?? null,
      createdAt: new Date(),
    };

    try {
      if (process.env.DATABASE_URL) {
        const created = await prisma.knowledgeBase.create({
          data: {
            id,
            userId: "user_enterprise",
            name,
            description: description ?? null,
          },
        });
        return {
          id: created.id,
          userId: created.userId,
          name: created.name,
          description: created.description,
          createdAt: created.createdAt,
        };
      }
    } catch (err) {
      console.warn("[DB] Failed to create in PostgreSQL, saving to memory store:", err);
    }

    memoryStore.knowledgeBases.set(id, item);
    return item;
  },

  // Document Methods
  async createDocument(data: {
    knowledgeBaseId: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    status: DocumentStatus;
    chunkCount?: number;
  }): Promise<DocumentItem> {
    const id = crypto.randomUUID();
    const docItem: DocumentItem = {
      id,
      knowledgeBaseId: data.knowledgeBaseId,
      title: data.title,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize,
      status: data.status,
      chunkCount: data.chunkCount ?? 0,
      createdAt: new Date(),
    };

    try {
      if (process.env.DATABASE_URL) {
        const created = await prisma.document.create({
          data: {
            id,
            knowledgeBaseId: data.knowledgeBaseId,
            title: data.title,
            fileUrl: data.fileUrl,
            fileType: data.fileType,
            fileSize: data.fileSize,
            status: data.status,
            chunkCount: data.chunkCount ?? 0,
          },
        });
        return {
          id: created.id,
          knowledgeBaseId: created.knowledgeBaseId,
          title: created.title,
          fileUrl: created.fileUrl,
          fileType: created.fileType,
          fileSize: created.fileSize,
          status: created.status as DocumentStatus,
          chunkCount: created.chunkCount,
          createdAt: created.createdAt,
        };
      }
    } catch (err) {
      console.warn("[DB] Document create fallback to memory store:", err);
    }

    memoryStore.documents.set(id, docItem);
    return docItem;
  },

  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    chunkCount?: number
  ): Promise<void> {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status,
            ...(typeof chunkCount === "number" ? { chunkCount } : {}),
          },
        });
        return;
      }
    } catch (err) {
      console.warn("[DB] updateDocumentStatus fallback:", err);
    }

    const doc = memoryStore.documents.get(documentId);
    if (doc) {
      doc.status = status;
      if (typeof chunkCount === "number") {
        doc.chunkCount = chunkCount;
      }
      memoryStore.documents.set(documentId, doc);
    }
  },

  async getDocumentsByKb(knowledgeBaseId: string): Promise<DocumentItem[]> {
    try {
      if (process.env.DATABASE_URL) {
        const rows = await prisma.document.findMany({
          where: { knowledgeBaseId },
          orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => ({
          id: r.id,
          knowledgeBaseId: r.knowledgeBaseId,
          title: r.title,
          fileUrl: r.fileUrl,
          fileType: r.fileType,
          fileSize: r.fileSize,
          status: r.status as DocumentStatus,
          chunkCount: r.chunkCount,
          createdAt: r.createdAt,
        }));
      }
    } catch (err) {
      console.warn("[DB] getDocumentsByKb fallback:", err);
    }

    return Array.from(memoryStore.documents.values())
      .filter((d) => d.knowledgeBaseId === knowledgeBaseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getDocumentById(documentId: string): Promise<DocumentItem | null> {
    try {
      if (process.env.DATABASE_URL) {
        const doc = await prisma.document.findUnique({
          where: { id: documentId },
        });
        if (doc) {
          return {
            id: doc.id,
            knowledgeBaseId: doc.knowledgeBaseId,
            title: doc.title,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            status: doc.status as DocumentStatus,
            chunkCount: doc.chunkCount,
            createdAt: doc.createdAt,
          };
        }
      }
    } catch (err) {
      console.warn("[DB] getDocumentById fallback:", err);
    }
    return memoryStore.documents.get(documentId) ?? null;
  },

  // Document Chunk & Vector Methods
  async insertChunks(
    chunks: Array<{
      documentId: string;
      content: string;
      chunkIndex: number;
      pageNumber: number | null;
      embedding: number[];
    }>
  ): Promise<void> {
    try {
      if (process.env.DATABASE_URL) {
        // Execute raw SQL insert with pgvector vector cast
        for (const c of chunks) {
          const vectorStr = `[${c.embedding.join(",")}]`;
          const id = crypto.randomUUID();
          await prisma.$executeRawUnsafe(
            `INSERT INTO document_chunks (id, document_id, content, chunk_index, page_number, embedding, created_at)
             VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::vector, NOW())`,
            id,
            c.documentId,
            c.content,
            c.chunkIndex,
            c.pageNumber,
            vectorStr
          );
        }
        return;
      }
    } catch (err) {
      console.warn("[DB] insertChunks failed in PostgreSQL, saving in memory store:", err);
    }

    for (const c of chunks) {
      const id = crypto.randomUUID();
      memoryStore.chunks.set(id, {
        id,
        documentId: c.documentId,
        content: c.content,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        embedding: c.embedding,
        createdAt: new Date(),
      });
    }
  },

  // Vector Cosine Similarity Search
  async searchSimilarChunks(
    knowledgeBaseId: string,
    queryEmbedding: number[],
    threshold = 0.65,
    topK = 5
  ): Promise<SearchResultChunk[]> {
    try {
      if (process.env.DATABASE_URL) {
        const vectorStr = `[${queryEmbedding.join(",")}]`;
        // Cosine distance <=> where similarity = 1 - distance
        const rows = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            document_id: string;
            title: string;
            content: string;
            chunk_index: number;
            page_number: number | null;
            similarity: number;
          }>
        >(
          `SELECT 
             dc.id, 
             dc.document_id, 
             d.title, 
             dc.content, 
             dc.chunk_index, 
             dc.page_number, 
             (1 - (dc.embedding <=> $1::vector)) AS similarity
           FROM document_chunks dc
           JOIN documents d ON d.id = dc.document_id
           WHERE d.knowledge_base_id = $2::uuid
             AND (1 - (dc.embedding <=> $1::vector)) >= $3
           ORDER BY similarity DESC
           LIMIT $4`,
          vectorStr,
          knowledgeBaseId,
          threshold,
          topK
        );

        return rows.map((r) => ({
          id: r.id,
          documentId: r.document_id,
          documentTitle: r.title,
          content: r.content,
          chunkIndex: r.chunk_index,
          pageNumber: r.page_number,
          similarity: Number(r.similarity),
        }));
      }
    } catch (err) {
      console.warn("[DB] searchSimilarChunks falling back to memory store:", err);
    }

    // In-Memory Cosine Similarity Calculation
    const targetDocIds = new Set(
      Array.from(memoryStore.documents.values())
        .filter((d) => d.knowledgeBaseId === knowledgeBaseId)
        .map((d) => d.id)
    );

    const hasExternalKey = Boolean(
      process.env.OPENAI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    );
    const effectiveThreshold = hasExternalKey ? threshold : Math.min(threshold, 0.15);

    const results: SearchResultChunk[] = [];
    for (const chunk of memoryStore.chunks.values()) {
      if (!targetDocIds.has(chunk.documentId) || !chunk.embedding) continue;
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (sim >= effectiveThreshold) {
        const doc = memoryStore.documents.get(chunk.documentId);
        results.push({
          id: chunk.id,
          documentId: chunk.documentId,
          documentTitle: doc?.title ?? "Dokumen Tanpa Judul",
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          similarity: sim,
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  },

  // Stats calculation
  async getStorageStats(knowledgeBaseId: string) {
    const docs = await this.getDocumentsByKb(knowledgeBaseId);
    let totalChunks = 0;
    let totalBytes = 0;
    for (const d of docs) {
      totalChunks += d.chunkCount;
      totalBytes += d.fileSize;
    }
    return {
      documentCount: docs.length,
      totalChunks,
      totalBytes,
      vectorDimension: 1536,
    };
  },

  // Document Deletion & Chunk Inspection
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.document.delete({
          where: { id: documentId },
        });
        return true;
      }
    } catch (err) {
      console.warn("[DB] deleteDocument fallback:", err);
    }

    // In-memory fallback
    const existed = memoryStore.documents.delete(documentId);
    for (const [chunkId, chunk] of memoryStore.chunks.entries()) {
      if (chunk.documentId === documentId) {
        memoryStore.chunks.delete(chunkId);
      }
    }
    return existed;
  },

  async getDocumentChunks(documentId: string): Promise<DocumentChunkItem[]> {
    try {
      if (process.env.DATABASE_URL) {
        const rows = await prisma.documentChunk.findMany({
          where: { documentId },
          orderBy: { chunkIndex: "asc" },
        });
        return rows.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          content: r.content,
          chunkIndex: r.chunkIndex,
          pageNumber: r.pageNumber,
          createdAt: r.createdAt,
        }));
      }
    } catch (err) {
      console.warn("[DB] getDocumentChunks fallback:", err);
    }

    return Array.from(memoryStore.chunks.values())
      .filter((c) => c.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  },

  async getAllChunksByKb(
    knowledgeBaseId: string
  ): Promise<Array<DocumentChunkItem & { documentTitle: string }>> {
    try {
      if (process.env.DATABASE_URL) {
        const rows = await prisma.documentChunk.findMany({
          where: {
            document: { knowledgeBaseId },
          },
          include: {
            document: { select: { title: true } },
          },
          orderBy: { chunkIndex: "asc" },
        });
        return rows.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          documentTitle: r.document.title,
          content: r.content,
          chunkIndex: r.chunkIndex,
          pageNumber: r.pageNumber,
          createdAt: r.createdAt,
        }));
      }
    } catch (err) {
      console.warn("[DB] getAllChunksByKb fallback:", err);
    }

    const docs = Array.from(memoryStore.documents.values()).filter(
      (d) => d.knowledgeBaseId === knowledgeBaseId
    );
    const docMap = new Map(docs.map((d) => [d.id, d.title]));

    const result: Array<DocumentChunkItem & { documentTitle: string }> = [];
    for (const chunk of memoryStore.chunks.values()) {
      if (docMap.has(chunk.documentId)) {
        result.push({
          ...chunk,
          documentTitle: docMap.get(chunk.documentId) || "Dokumen",
        });
      }
    }
    return result;
  },


  // Persistent Chat Sessions
  async createChatSession(data: {
    knowledgeBaseId: string;
    title: string;
    userId?: string;
  }): Promise<ChatSessionItem> {
    const id = crypto.randomUUID();
    const item: ChatSessionItem = {
      id,
      knowledgeBaseId: data.knowledgeBaseId,
      userId: data.userId ?? "user_enterprise",
      title: data.title,
      createdAt: new Date(),
    };

    try {
      if (process.env.DATABASE_URL) {
        const row = await prisma.chatSession.create({
          data: {
            id,
            knowledgeBaseId: data.knowledgeBaseId,
            userId: data.userId ?? "user_enterprise",
            title: data.title,
          },
        });
        return {
          id: row.id,
          knowledgeBaseId: row.knowledgeBaseId,
          userId: row.userId,
          title: row.title,
          createdAt: row.createdAt,
        };
      }
    } catch (err) {
      console.warn("[DB] createChatSession fallback:", err);
    }

    memoryStore.chatSessions.set(id, item);
    return item;
  },

  async getChatSessions(knowledgeBaseId: string): Promise<ChatSessionItem[]> {
    try {
      if (process.env.DATABASE_URL) {
        const rows = await prisma.chatSession.findMany({
          where: { knowledgeBaseId },
          orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => ({
          id: r.id,
          knowledgeBaseId: r.knowledgeBaseId,
          userId: r.userId,
          title: r.title,
          createdAt: r.createdAt,
        }));
      }
    } catch (err) {
      console.warn("[DB] getChatSessions fallback:", err);
    }

    return Array.from(memoryStore.chatSessions.values())
      .filter((s) => s.knowledgeBaseId === knowledgeBaseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async deleteChatSession(sessionId: string): Promise<boolean> {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.chatSession.delete({
          where: { id: sessionId },
        });
        return true;
      }
    } catch (err) {
      console.warn("[DB] deleteChatSession fallback:", err);
    }

    const existed = memoryStore.chatSessions.delete(sessionId);
    for (const [msgId, msg] of memoryStore.messages.entries()) {
      if (msg.chatSessionId === sessionId) {
        memoryStore.messages.delete(msgId);
      }
    }
    return existed;
  },

  async updateChatSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { title },
        });
        return;
      }
    } catch (err) {
      console.warn("[DB] updateChatSessionTitle fallback:", err);
    }

    const session = memoryStore.chatSessions.get(sessionId);
    if (session) {
      session.title = title;
      memoryStore.chatSessions.set(sessionId, session);
    }
  },

  async getChatSessionById(sessionId: string): Promise<ChatSessionItem | null> {
    try {
      if (process.env.DATABASE_URL) {
        const row = await prisma.chatSession.findUnique({
          where: { id: sessionId },
        });
        if (row) {
          return {
            id: row.id,
            knowledgeBaseId: row.knowledgeBaseId,
            userId: row.userId,
            title: row.title,
            createdAt: row.createdAt,
          };
        }
      }
    } catch (err) {
      console.warn("[DB] getChatSessionById fallback:", err);
    }

    return memoryStore.chatSessions.get(sessionId) ?? null;
  },

  // Persistent Messages
  async createChatMessage(data: {
    chatSessionId: string;
    role: "USER" | "ASSISTANT";
    content: string;
    citations?: CitationItem[] | null;
    groundedness?: GroundednessReport | null;
  }): Promise<ChatMessageItem> {
    const id = crypto.randomUUID();
    const item: ChatMessageItem = {
      id,
      chatSessionId: data.chatSessionId,
      role: data.role,
      content: data.content,
      citations: data.citations ?? null,
      groundedness: data.groundedness ?? null,
      createdAt: new Date(),
    };

    try {
      if (process.env.DATABASE_URL) {
        const payload = {
          items: data.citations ?? [],
          groundedness: data.groundedness ?? null,
        };
        const row = await prisma.message.create({
          data: {
            id,
            chatSessionId: data.chatSessionId,
            role: data.role,
            content: data.content,
            citations: JSON.stringify(payload),
          },
        });
        return {
          id: row.id,
          chatSessionId: row.chatSessionId,
          role: row.role as "USER" | "ASSISTANT",
          content: row.content,
          citations: data.citations ?? null,
          groundedness: data.groundedness ?? null,
          createdAt: row.createdAt,
        };
      }
    } catch (err) {
      console.warn("[DB] createChatMessage fallback:", err);
    }

    memoryStore.messages.set(id, item);
    return item;
  },

  async getChatMessages(chatSessionId: string): Promise<ChatMessageItem[]> {
    try {
      if (process.env.DATABASE_URL) {
        const rows = await prisma.message.findMany({
          where: { chatSessionId },
          orderBy: { createdAt: "asc" },
        });
        return rows.map((r) => {
          let parsedCitations: CitationItem[] | null = null;
          let parsedGroundedness: GroundednessReport | null = null;
          if (r.citations) {
            try {
              const raw = typeof r.citations === "string" ? JSON.parse(r.citations) : r.citations;
              if (Array.isArray(raw)) {
                parsedCitations = raw;
              } else if (raw && typeof raw === "object") {
                parsedCitations = raw.items || null;
                parsedGroundedness = raw.groundedness || null;
              }
            } catch {
              // fallback ignore
            }
          }
          return {
            id: r.id,
            chatSessionId: r.chatSessionId,
            role: r.role as "USER" | "ASSISTANT",
            content: r.content,
            citations: parsedCitations,
            groundedness: parsedGroundedness,
            createdAt: r.createdAt,
          };
        });
      }
    } catch (err) {
      console.warn("[DB] getChatMessages fallback:", err);
    }

    return Array.from(memoryStore.messages.values())
      .filter((m) => m.chatSessionId === chatSessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },
};
