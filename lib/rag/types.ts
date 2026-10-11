// Types for Enterprise RAG Platform & Vector Engine

export type DocumentStatus = "PROCESSING" | "INDEXED" | "FAILED";

export interface KnowledgeBaseItem {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
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

export interface ChatMessageItem {
  id: string;
  chatSessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: CitationItem[] | null;
  groundedness?: GroundednessReport | null;
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

