import { db } from "@/lib/db";
import { getQueryEmbedding } from "./embedder";
import { SearchResultChunk, CitationItem } from "./types";

export interface SemanticSearchOptions {
  knowledgeBaseId: string;
  query: string;
  threshold?: number; // default: 0.65
  topK?: number; // default: 5
}

export interface SemanticSearchResult {
  query: string;
  chunks: SearchResultChunk[];
  citations: CitationItem[];
  hasContext: boolean;
}

/**
 * Executes semantic vector search against document chunks using cosine distance.
 */
export async function performSemanticSearch(
  options: SemanticSearchOptions
): Promise<SemanticSearchResult> {
  const {
    knowledgeBaseId,
    query,
    threshold = 0.65,
    topK = 5,
  } = options;

  if (!query || query.trim().length === 0) {
    return {
      query: "",
      chunks: [],
      citations: [],
      hasContext: false,
    };
  }

  // 1. Generate embedding for user query
  const queryEmbedding = await getQueryEmbedding(query);

  // 2. Perform Cosine Similarity Search (<=> in pgvector or fallback store)
  const chunks = await db.searchSimilarChunks(
    knowledgeBaseId,
    queryEmbedding,
    threshold,
    topK
  );

  // 3. Transform to citation models
  const citations: CitationItem[] = chunks.map((chunk, index) => {
    // Generate clean 180-char snippet
    const snippet =
      chunk.content.length > 200
        ? `${chunk.content.slice(0, 197)}...`
        : chunk.content;

    return {
      index: index + 1,
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      pageNumber: chunk.pageNumber,
      similarity: Number((chunk.similarity * 100).toFixed(1)),
      snippet,
    };
  });

  return {
    query,
    chunks,
    citations,
    hasContext: chunks.length > 0,
  };
}
