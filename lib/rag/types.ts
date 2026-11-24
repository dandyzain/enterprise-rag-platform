// Types for Enterprise RAG Platform & Vector Engine

export type DocumentStatus = "PROCESSING" | "INDEXED" | "FAILED";

/**
 * - private: owner only
 * - link:    owner can write, anyone with the link can read (search / chat)
 * - public:  the shared, read-only demo knowledge base
 */
export type KnowledgeBaseVisibility = "private" | "link" | "public";

export interface KnowledgeBaseItem {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  visibility: KnowledgeBaseVisibility;
  createdAt: Date;
  /** Set by the API for the current viewer: may they upload / delete / share / back up? */
  canWrite?: boolean;
}

export interface DocumentItem {
  id: string;
  knowledgeBaseId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  chunkCount: number;
  /** Embedding model the chunks were indexed with (e.g. "openai:text-embedding-3-small"). */
  embeddingModel?: string | null;
  /** Whether the original uploaded file is stored and can be downloaded / re-indexed. */
  hasOriginalFile?: boolean;
  createdAt: Date;
}

export interface DocumentChunkItem {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  embedding?: number[] | null;
  createdAt: Date;
}

export type SearchMode = "hybrid" | "semantic" | "keyword";

export interface SearchResultChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
  denseRank?: number;
  sparseRank?: number;
  bm25Score?: number;
  rrfScore?: number;
  matchType?: "vector" | "bm25" | "hybrid";
  initialRank?: number;
  reRank?: number;
  rerankScore?: number;
  rerankDelta?: number;
}

export interface CitationItem {
  index: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  similarity: number;
  snippet: string;
  denseRank?: number;
  sparseRank?: number;
  bm25Score?: number;
  rrfScore?: number;
  matchType?: "vector" | "bm25" | "hybrid";
  initialRank?: number;
  reRank?: number;
  rerankScore?: number;
  rerankDelta?: number;
}

export interface GroundednessAuditItem {
  sentence: string;
  isGrounded: boolean;
  citationIndex?: number;
  matchedSnippet?: string;
  confidence: number;
}

export interface GroundednessReport {
  score: number; // 0 - 100%
  status: "HIGH" | "MEDIUM" | "LOW";
  verifiedClaimsCount: number;
  totalClaimsCount: number;
  citationsReferenced: number[];
  hallucinationRisk: "MINIMAL" | "MODERATE" | "HIGH";
  auditItems: GroundednessAuditItem[];
}

export interface ChatSessionItem {
  id: string;
  knowledgeBaseId: string;
  userId: string;
  title: string;
  createdAt: Date;
}

export type MessageFeedback = "like" | "dislike";

export interface ChatMessageItem {
  id: string;
  chatSessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: CitationItem[] | null;
  groundedness?: GroundednessReport | null;
  feedback?: MessageFeedback | null;
  createdAt: Date;
}

export interface IngestionResult {
  documentId: string;
  title: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  pages: number;
  status: DocumentStatus;
  processingTimeMs: number;
}

