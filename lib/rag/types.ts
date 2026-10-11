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

export interface SearchResultChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  similarity: number;
}

export interface CitationItem {
  index: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  similarity: number;
  snippet: string;
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
