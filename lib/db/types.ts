import type { UserPlan, UserRecord, UserRole } from "@/lib/auth/types";
import type {
  ChatMessageItem,
  ChatSessionItem,
  CitationItem,
  DocumentChunkItem,
  DocumentItem,
  DocumentStatus,
  GroundednessReport,
  KnowledgeBaseItem,
  KnowledgeBaseVisibility,
  MessageFeedback,
  SearchResultChunk,
} from "@/lib/rag/types";

/** Id of the shared, read-only demo knowledge base (kept for existing `?kb=` links). */
export const SYSTEM_KB_ID = "default-kb-1";
export const SYSTEM_OWNER_ID = "system";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("EMAIL_TAKEN");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export interface NewChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  embedding: number[];
}

export interface DenseSearchParams {
  knowledgeBaseId: string;
  embedding: number[];
  /** Only chunks indexed with this embedding model are comparable. */
  embeddingModel: string;
  threshold: number;
  limit: number;
  documentIds?: string[];
}

export interface SparseSearchParams {
  knowledgeBaseId: string;
  query: string;
  limit: number;
  documentIds?: string[];
}

export interface SparseSearchHit {
  chunk: Omit<SearchResultChunk, "similarity">;
  score: number;
  rank: number;
}

export interface StoredFile {
  buffer: Buffer;
  mimeType: string;
}

export interface StorageStats {
  documentCount: number;
  totalChunks: number;
  totalBytes: number;
}

/**
 * Persistence contract implemented by the Postgres store (production) and the
 * in-memory store (local demo). There is intentionally no silent fallback
 * between the two: errors from Postgres surface as errors.
 */
export interface Store {
  readonly mode: "postgres" | "memory";

  // Users
  createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
    plan: UserPlan;
  }): Promise<UserRecord>;
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  bumpSessionVersion(userId: string): Promise<void>;

  // Knowledge bases
  listKnowledgeBasesForOwner(ownerId: string | null): Promise<KnowledgeBaseItem[]>;
  getKnowledgeBase(id: string): Promise<KnowledgeBaseItem | null>;
  createKnowledgeBase(data: {
    id?: string;
    name: string;
    description?: string | null;
    userId: string;
    visibility?: KnowledgeBaseVisibility;
  }): Promise<KnowledgeBaseItem>;
  setKnowledgeBaseVisibility(id: string, visibility: KnowledgeBaseVisibility): Promise<void>;
  countKnowledgeBasesByOwner(ownerId: string): Promise<number>;

  // Documents
  createDocument(data: {
    knowledgeBaseId: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    status: DocumentStatus;
    chunkCount?: number;
    embeddingModel?: string | null;
  }): Promise<DocumentItem>;
  updateDocument(
    id: string,
    data: { status?: DocumentStatus; chunkCount?: number; embeddingModel?: string | null; fileUrl?: string }
  ): Promise<void>;
  listDocuments(knowledgeBaseId: string): Promise<DocumentItem[]>;
  getDocument(id: string): Promise<DocumentItem | null>;
  deleteDocument(id: string): Promise<boolean>;
  countDocumentsByOwner(ownerId: string): Promise<number>;

  // Original files
  saveDocumentFile(documentId: string, file: StoredFile): Promise<void>;
  getDocumentFile(documentId: string): Promise<StoredFile | null>;

  // Chunks & retrieval
  replaceChunks(documentId: string, chunks: NewChunk[]): Promise<void>;
  getDocumentChunks(documentId: string): Promise<DocumentChunkItem[]>;
  searchDense(params: DenseSearchParams): Promise<SearchResultChunk[]>;
  searchSparse(params: SparseSearchParams): Promise<SparseSearchHit[]>;
  getStorageStats(knowledgeBaseId: string): Promise<StorageStats>;
  getGlobalStats(): Promise<{ knowledgeBases: number; documents: number; chunks: number }>;

  // Chat
  createChatSession(data: { knowledgeBaseId: string; userId: string; title: string }): Promise<ChatSessionItem>;
  listChatSessions(knowledgeBaseId: string, userId: string): Promise<ChatSessionItem[]>;
  getChatSession(id: string): Promise<ChatSessionItem | null>;
  renameChatSession(id: string, title: string): Promise<void>;
  deleteChatSession(id: string): Promise<boolean>;
  createChatMessage(data: {
    id?: string;
    chatSessionId: string;
    role: "USER" | "ASSISTANT";
    content: string;
    citations?: CitationItem[] | null;
    groundedness?: GroundednessReport | null;
  }): Promise<ChatMessageItem>;
  listChatMessages(chatSessionId: string): Promise<ChatMessageItem[]>;
  getChatMessage(id: string): Promise<ChatMessageItem | null>;
  setMessageFeedback(id: string, feedback: MessageFeedback | null): Promise<void>;

  /** Health probe: throws if the backing store is unreachable. */
  ping(): Promise<void>;
}
