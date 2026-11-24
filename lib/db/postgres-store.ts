import { Prisma, PrismaClient } from "@prisma/client";
import type { UserPlan, UserRecord, UserRole } from "@/lib/auth/types";
import type {
  ChatMessageItem,
  CitationItem,
  DocumentItem,
  DocumentStatus,
  GroundednessReport,
  KnowledgeBaseItem,
  KnowledgeBaseVisibility,
  MessageFeedback,
} from "@/lib/rag/types";
import { EmailAlreadyRegisteredError, Store } from "./types";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

const CHUNK_INSERT_BATCH = 100;

const toVectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

function mapKb(r: {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  visibility: string;
  createdAt: Date;
}): KnowledgeBaseItem {
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    description: r.description,
    visibility: (r.visibility as KnowledgeBaseVisibility) || "private",
    createdAt: r.createdAt,
  };
}

function mapDoc(
  r: {
    id: string;
    knowledgeBaseId: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    status: string;
    chunkCount: number;
    embeddingModel: string | null;
    createdAt: Date;
  },
  hasOriginalFile: boolean
): DocumentItem {
  return {
    id: r.id,
    knowledgeBaseId: r.knowledgeBaseId,
    title: r.title,
    fileUrl: r.fileUrl,
    fileType: r.fileType,
    fileSize: r.fileSize,
    status: r.status as DocumentStatus,
    chunkCount: r.chunkCount,
    embeddingModel: r.embeddingModel,
    hasOriginalFile,
    createdAt: r.createdAt,
  };
}

function mapUser(r: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  plan: string;
  sessionVersion: number;
  createdAt: Date;
}): UserRecord {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.passwordHash,
    role: r.role as UserRole,
    plan: r.plan as UserPlan,
    sessionVersion: r.sessionVersion,
    createdAt: r.createdAt,
  };
}

function mapMessage(r: {
  id: string;
  chatSessionId: string;
  role: string;
  content: string;
  citations: Prisma.JsonValue | null;
  feedback: string | null;
  createdAt: Date;
}): ChatMessageItem {
  let citations: CitationItem[] | null = null;
  let groundedness: GroundednessReport | null = null;
  const raw = typeof r.citations === "string" ? safeJson(r.citations) : r.citations;
  if (Array.isArray(raw)) {
    citations = raw as unknown as CitationItem[];
  } else if (raw && typeof raw === "object") {
    const obj = raw as { items?: CitationItem[]; groundedness?: GroundednessReport };
    citations = obj.items ?? null;
    groundedness = obj.groundedness ?? null;
  }
  return {
    id: r.id,
    chatSessionId: r.chatSessionId,
    role: r.role as "USER" | "ASSISTANT",
    content: r.content,
    citations,
    groundedness,
    feedback: (r.feedback as MessageFeedback | null) ?? null,
    createdAt: r.createdAt,
  };
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function createPostgresStore(): Store {
  const prisma = getPrisma();

  const docSelect = {
    id: true,
    knowledgeBaseId: true,
    title: true,
    fileUrl: true,
    fileType: true,
    fileSize: true,
    status: true,
    chunkCount: true,
    embeddingModel: true,
    createdAt: true,
    file: { select: { documentId: true } },
  } as const;

  return {
    mode: "postgres",

    async ping() {
      await prisma.$queryRawUnsafe("SELECT 1");
    },

    // Users
    async createUser(data) {
      try {
        const row = await prisma.user.create({
          data: {
            id: `usr_${crypto.randomUUID()}`,
            email: data.email.toLowerCase(),
            name: data.name,
            passwordHash: data.passwordHash,
            role: data.role,
            plan: data.plan,
          },
        });
        return mapUser(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new EmailAlreadyRegisteredError();
        }
        throw err;
      }
    },
    async getUserById(id) {
      const row = await prisma.user.findUnique({ where: { id } });
      return row ? mapUser(row) : null;
    },
    async getUserByEmail(email) {
      const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      return row ? mapUser(row) : null;
    },
    async bumpSessionVersion(userId) {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      });
    },

    // Knowledge bases
    async listKnowledgeBasesForOwner(ownerId) {
      const rows = await prisma.knowledgeBase.findMany({
        where: {
          OR: [{ visibility: "public" }, ...(ownerId ? [{ userId: ownerId }] : [])],
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapKb);
    },
    async getKnowledgeBase(id) {
      const row = await prisma.knowledgeBase.findUnique({ where: { id } });
      return row ? mapKb(row) : null;
    },
    async createKnowledgeBase(data) {
      const row = await prisma.knowledgeBase.create({
        data: {
          id: data.id ?? crypto.randomUUID(),
          userId: data.userId,
          name: data.name,
          description: data.description ?? null,
          visibility: data.visibility ?? "private",
        },
      });
      return mapKb(row);
    },
    async setKnowledgeBaseVisibility(id, visibility) {
      await prisma.knowledgeBase.update({ where: { id }, data: { visibility } });
    },
    async countKnowledgeBasesByOwner(ownerId) {
      return prisma.knowledgeBase.count({ where: { userId: ownerId } });
    },

    // Documents
    async createDocument(data) {
      const row = await prisma.document.create({
        data: {
          id: crypto.randomUUID(),
          knowledgeBaseId: data.knowledgeBaseId,
          title: data.title.slice(0, 255),
          fileUrl: data.fileUrl,
          fileType: data.fileType.slice(0, 100),
          fileSize: data.fileSize,
          status: data.status,
          chunkCount: data.chunkCount ?? 0,
          embeddingModel: data.embeddingModel ?? null,
        },
        select: docSelect,
      });
      return mapDoc(row, Boolean(row.file));
    },
    async updateDocument(id, data) {
      await prisma.document.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.chunkCount !== undefined ? { chunkCount: data.chunkCount } : {}),
          ...(data.embeddingModel !== undefined ? { embeddingModel: data.embeddingModel } : {}),
          ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl } : {}),
        },
      });
    },
    async listDocuments(knowledgeBaseId) {
      const rows = await prisma.document.findMany({
        where: { knowledgeBaseId },
        orderBy: { createdAt: "desc" },
        select: docSelect,
      });
      return rows.map((r) => mapDoc(r, Boolean(r.file)));
    },
    async getDocument(id) {
      const row = await prisma.document.findUnique({ where: { id }, select: docSelect });
      return row ? mapDoc(row, Boolean(row.file)) : null;
    },
    async deleteDocument(id) {
      const res = await prisma.document.deleteMany({ where: { id } });
      return res.count > 0;
    },
    async countDocumentsByOwner(ownerId) {
      return prisma.document.count({ where: { knowledgeBase: { userId: ownerId } } });
    },

    // Files
    async saveDocumentFile(documentId, file) {
      await prisma.documentFile.upsert({
        where: { documentId },
        create: { documentId, content: new Uint8Array(file.buffer), mimeType: file.mimeType },
        update: { content: new Uint8Array(file.buffer), mimeType: file.mimeType },
      });
    },
    async getDocumentFile(documentId) {
      const row = await prisma.documentFile.findUnique({ where: { documentId } });
      return row ? { buffer: Buffer.from(row.content), mimeType: row.mimeType } : null;
    },

    // Chunks
    async replaceChunks(documentId, chunks) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`DELETE FROM document_chunks WHERE document_id = $1`, documentId);
        for (let i = 0; i < chunks.length; i += CHUNK_INSERT_BATCH) {
          const batch = chunks.slice(i, i + CHUNK_INSERT_BATCH);
          await tx.$executeRawUnsafe(
            `INSERT INTO document_chunks (id, document_id, content, chunk_index, page_number, embedding, created_at)
             SELECT t.id, $1, t.content, t.chunk_index, t.page_number, t.embedding::vector, NOW()
             FROM unnest($2::text[], $3::text[], $4::int[], $5::int[], $6::text[])
               AS t(id, content, chunk_index, page_number, embedding)`,
            documentId,
            batch.map(() => crypto.randomUUID()),
            batch.map((c) => c.content),
            batch.map((c) => c.chunkIndex),
            batch.map((c) => c.pageNumber),
            batch.map((c) => toVectorLiteral(c.embedding))
          );
        }
      });
    },
    async getDocumentChunks(documentId) {
      const rows = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: "asc" },
        select: { id: true, documentId: true, content: true, chunkIndex: true, pageNumber: true, createdAt: true },
      });
      return rows;
    },
    async searchDense({ knowledgeBaseId, embedding, embeddingModel, threshold, limit, documentIds }) {
      const hasFilter = Boolean(documentIds && documentIds.length > 0);
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
        `SELECT dc.id, dc.document_id, d.title, dc.content, dc.chunk_index, dc.page_number,
                (1 - (dc.embedding <=> $1::vector)) AS similarity
         FROM document_chunks dc
         JOIN documents d ON d.id = dc.document_id
         WHERE d.knowledge_base_id = $2
           AND d.status = 'INDEXED'
           AND (d.embedding_model IS NULL OR d.embedding_model = $3)
           AND dc.embedding IS NOT NULL
           AND (1 - (dc.embedding <=> $1::vector)) >= $4
           ${hasFilter ? "AND dc.document_id = ANY($6::text[])" : ""}
         ORDER BY dc.embedding <=> $1::vector
         LIMIT $5`,
        toVectorLiteral(embedding),
        knowledgeBaseId,
        embeddingModel,
        threshold,
        limit,
        ...(hasFilter ? [documentIds] : [])
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
    },
    async searchSparse({ knowledgeBaseId, query, limit, documentIds }) {
      const hasFilter = Boolean(documentIds && documentIds.length > 0);
      // OR-combine the query terms so partial matches still rank (plainto/websearch are AND-only).
      // Each term is parsed by Postgres itself (plainto_tsquery) so codes like "SEC-POL-04"
      // or "99.99" tokenize exactly like the indexed content.
      const terms = query
        .toLowerCase()
        .replace(/[_/]/g, " ")
        .match(/[\p{L}\p{N}]+(?:[-.][\p{L}\p{N}]+)*/gu);
      if (!terms || terms.length === 0) return [];
      const uniqueTerms = Array.from(new Set(terms)).slice(0, 32);

      const rows = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          document_id: string;
          title: string;
          content: string;
          chunk_index: number;
          page_number: number | null;
          score: number;
        }>
      >(
        `WITH q AS (
           SELECT string_agg(pq::text, ' | ')::tsquery AS query
           FROM (SELECT plainto_tsquery('simple', t) AS pq FROM unnest($2::text[]) AS t) parts
           WHERE pq::text <> ''
         )
         SELECT dc.id, dc.document_id, d.title, dc.content, dc.chunk_index, dc.page_number,
                ts_rank_cd(to_tsvector('simple', dc.content), q.query) AS score
         FROM document_chunks dc
         JOIN documents d ON d.id = dc.document_id
         CROSS JOIN q
         WHERE d.knowledge_base_id = $1
           AND d.status = 'INDEXED'
           AND q.query IS NOT NULL
           AND to_tsvector('simple', dc.content) @@ q.query
           ${hasFilter ? "AND dc.document_id = ANY($4::text[])" : ""}
         ORDER BY score DESC
         LIMIT $3`,
        knowledgeBaseId,
        uniqueTerms,
        limit,
        ...(hasFilter ? [documentIds] : [])
      );
      return rows.map((r, i) => ({
        chunk: {
          id: r.id,
          documentId: r.document_id,
          documentTitle: r.title,
          content: r.content,
          chunkIndex: r.chunk_index,
          pageNumber: r.page_number,
        },
        score: Number(Number(r.score).toFixed(4)),
        rank: i + 1,
      }));
    },
    async getStorageStats(knowledgeBaseId) {
      const agg = await prisma.document.aggregate({
        where: { knowledgeBaseId },
        _count: { _all: true },
        _sum: { chunkCount: true, fileSize: true },
      });
      return {
        documentCount: agg._count._all,
        totalChunks: agg._sum.chunkCount ?? 0,
        totalBytes: agg._sum.fileSize ?? 0,
      };
    },
    async getGlobalStats() {
      const [knowledgeBases, documents, chunks] = await Promise.all([
        prisma.knowledgeBase.count(),
        prisma.document.count(),
        prisma.documentChunk.count(),
      ]);
      return { knowledgeBases, documents, chunks };
    },

    // Chat
    async createChatSession(data) {
      return prisma.chatSession.create({
        data: {
          id: crypto.randomUUID(),
          knowledgeBaseId: data.knowledgeBaseId,
          userId: data.userId,
          title: data.title.slice(0, 255),
        },
      });
    },
    async listChatSessions(knowledgeBaseId, userId) {
      return prisma.chatSession.findMany({
        where: { knowledgeBaseId, userId },
        orderBy: { createdAt: "desc" },
      });
    },
    async getChatSession(id) {
      return prisma.chatSession.findUnique({ where: { id } });
    },
    async renameChatSession(id, title) {
      await prisma.chatSession.update({ where: { id }, data: { title: title.slice(0, 255) } });
    },
    async deleteChatSession(id) {
      const res = await prisma.chatSession.deleteMany({ where: { id } });
      return res.count > 0;
    },
    async createChatMessage(data) {
      const row = await prisma.message.create({
        data: {
          id: data.id ?? crypto.randomUUID(),
          chatSessionId: data.chatSessionId,
          role: data.role,
          content: data.content,
          citations: {
            items: data.citations ?? [],
            groundedness: data.groundedness ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      return mapMessage(row);
    },
    async listChatMessages(chatSessionId) {
      const rows = await prisma.message.findMany({
        where: { chatSessionId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(mapMessage);
    },
    async getChatMessage(id) {
      const row = await prisma.message.findUnique({ where: { id } });
      return row ? mapMessage(row) : null;
    },
    async setMessageFeedback(id, feedback) {
      await prisma.message.update({ where: { id }, data: { feedback } });
    },
  };
}
