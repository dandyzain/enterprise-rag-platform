import { executeHybridSearch } from "./hybrid-search";
import { SearchResultChunk, CitationItem, SearchMode } from "./types";

export interface SemanticSearchOptions {
  knowledgeBaseId: string;
  query: string;
  searchMode?: SearchMode; // "hybrid" | "semantic" | "keyword"
  threshold?: number; // default: 0.65
  topK?: number; // default: 5
  filterDocumentIds?: string[];
  enableReranking?: boolean; // default: true
}

export interface SemanticSearchResult {
  query: string;
  chunks: SearchResultChunk[];
  citations: CitationItem[];
  hasContext: boolean;
  searchMode: SearchMode;
}

/**
 * Executes search against document chunks using Hybrid Search (Dense + Sparse BM25 via RRF),
 * pure Semantic Vector search, or pure Lexical Keyword search, with two-stage re-ranking.
 */
export async function performSemanticSearch(
  options: SemanticSearchOptions
): Promise<SemanticSearchResult> {
  const {
    knowledgeBaseId,
    query,
    searchMode = "hybrid",
    threshold = 0.65,
    topK = 5,
    filterDocumentIds,
    enableReranking = true,
  } = options;

  if (!query || query.trim().length === 0) {
    return {
      query: "",
      chunks: [],
      citations: [],
      hasContext: false,
      searchMode,
    };
  }

  // Execute hybrid or selected search with optional two-stage reranker
  const chunks = await executeHybridSearch({
    knowledgeBaseId,
    query,
    searchMode,
    threshold,
    topK,
    filterDocumentIds,
    enableReranking,
  });

  // Transform to citation models with hybrid and rerank ranking telemetry
  const citations: CitationItem[] = chunks.map((chunk, index) => {
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
      denseRank: chunk.denseRank,
      sparseRank: chunk.sparseRank,
      bm25Score: chunk.bm25Score,
      rrfScore: chunk.rrfScore,
      matchType: chunk.matchType,
      initialRank: chunk.initialRank,
      reRank: chunk.reRank,
      rerankScore: chunk.rerankScore,
      rerankDelta: chunk.rerankDelta,
    };
  });

  return {
    query,
    chunks,
    citations,
    hasContext: chunks.length > 0,
    searchMode,
  };
}


