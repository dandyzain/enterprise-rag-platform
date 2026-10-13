import { db } from "@/lib/db";
import { getQueryEmbedding } from "./embedder";
import { scoreBM25, BM25DocumentChunk } from "./bm25";
import { SearchResultChunk, SearchMode } from "./types";
import { rerankCandidates } from "./reranker";

export interface HybridSearchOptions {
  knowledgeBaseId: string;
  query: string;
  searchMode?: SearchMode; // default: "hybrid"
  threshold?: number; // default: 0.65 (adaptive in fallback)
  topK?: number; // default: 5
  filterDocumentIds?: string[];
  enableReranking?: boolean; // default: true
}

/**
 * Reciprocal Rank Fusion constant (standard industry baseline = 60).
 * Prevents extreme bias toward rank 1 while smoothly distributing weights.
 */
const RRF_K = 60;

/**
 * Executes hybrid search combining Dense Semantic Vectors with Sparse BM25 Lexical Keyword Search.
 * Uses Reciprocal Rank Fusion (RRF) to merge ranks, with optional cross-encoder two-stage re-ranking.
 */
export async function executeHybridSearch(
  options: HybridSearchOptions
): Promise<SearchResultChunk[]> {
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
    return [];
  }

  // 1. Semantic Vector Search Only
  if (searchMode === "semantic") {
    const queryEmbedding = await getQueryEmbedding(query);
    let denseResults = await db.searchSimilarChunks(
      knowledgeBaseId,
      queryEmbedding,
      threshold,
      enableReranking ? topK * 3 : topK
    );
    // Adaptive fallback if strict threshold returns 0 results
    if (denseResults.length === 0) {
      denseResults = await db.searchSimilarChunks(
        knowledgeBaseId,
        queryEmbedding,
        Math.min(threshold * 0.1, 0.05),
        enableReranking ? topK * 3 : topK
      );
    }
    if (filterDocumentIds && filterDocumentIds.length > 0) {
      const allowedSet = new Set(filterDocumentIds);
      denseResults = denseResults.filter((r) => allowedSet.has(r.documentId));
    }
    const chunks = denseResults.map((r, i) => ({
      ...r,
      denseRank: i + 1,
      matchType: "vector" as const,
    }));
    return enableReranking
      ? rerankCandidates({ query, candidates: chunks, topK })
      : chunks.slice(0, topK);
  }

  // 2. Keyword BM25 Search Only
  if (searchMode === "keyword") {
    let allKbChunks = await db.getAllChunksByKb(knowledgeBaseId);
    if (filterDocumentIds && filterDocumentIds.length > 0) {
      const allowedSet = new Set(filterDocumentIds);
      allKbChunks = allKbChunks.filter((c) => allowedSet.has(c.documentId));
    }
    const candidateChunks: BM25DocumentChunk[] = allKbChunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      content: c.content,
      chunkIndex: c.chunkIndex,
      pageNumber: c.pageNumber,
    }));

    const bm25Results = scoreBM25(candidateChunks, query);
    const maxScore = bm25Results[0]?.score || 1;

    const chunks = bm25Results
      .slice(0, enableReranking ? topK * 3 : topK)
      .map((item) => ({
        id: item.chunk.id,
        documentId: item.chunk.documentId,
        documentTitle: item.chunk.documentTitle,
        content: item.chunk.content,
        chunkIndex: item.chunk.chunkIndex,
        pageNumber: item.chunk.pageNumber,
        similarity: Number(
          Math.min(1.0, item.score / Math.max(maxScore, 1)).toFixed(3)
        ),
        sparseRank: item.rank,
        bm25Score: item.score,
        matchType: "bm25" as const,
      }));

    return enableReranking
      ? rerankCandidates({ query, candidates: chunks, topK })
      : chunks.slice(0, topK);
  }

  // 3. Hybrid Search (Dense + Sparse with Reciprocal Rank Fusion)
  // Retrieve expanded candidate pools from both channels (topK * 3)
  const candidatePoolSize = Math.max(topK * 3, 15);

  // A. Dense vector retrieval
  const queryEmbedding = await getQueryEmbedding(query);
  let denseCandidates = await db.searchSimilarChunks(
    knowledgeBaseId,
    queryEmbedding,
    // Slightly more lenient threshold to gather good semantic candidates for RRF fusion
    threshold * 0.8,
    candidatePoolSize
  );

  if (filterDocumentIds && filterDocumentIds.length > 0) {
    const allowedSet = new Set(filterDocumentIds);
    denseCandidates = denseCandidates.filter((r) => allowedSet.has(r.documentId));
  }

  // Map chunkId -> { rank: number, similarity: number, chunk: SearchResultChunk }
  const denseMap = new Map<
    string,
    { rank: number; similarity: number; chunk: SearchResultChunk }
  >();
  denseCandidates.forEach((c, idx) => {
    denseMap.set(c.id, {
      rank: idx + 1,
      similarity: c.similarity,
      chunk: c,
    });
  });

  // B. Sparse BM25 retrieval
  let allKbChunks = await db.getAllChunksByKb(knowledgeBaseId);
  if (filterDocumentIds && filterDocumentIds.length > 0) {
    const allowedSet = new Set(filterDocumentIds);
    allKbChunks = allKbChunks.filter((c) => allowedSet.has(c.documentId));
  }

  const bm25Candidates: BM25DocumentChunk[] = allKbChunks.map((c) => ({
    id: c.id,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    content: c.content,
    chunkIndex: c.chunkIndex,
    pageNumber: c.pageNumber,
  }));

  const bm25Results = scoreBM25(bm25Candidates, query).slice(0, candidatePoolSize);

  // Map chunkId -> { rank: number, score: number, chunk: BM25DocumentChunk }
  const sparseMap = new Map<
    string,
    { rank: number; score: number; chunk: BM25DocumentChunk }
  >();
  bm25Results.forEach((b) => {
    sparseMap.set(b.chunk.id, {
      rank: b.rank,
      score: b.score,
      chunk: b.chunk,
    });
  });

  // C. Calculate Reciprocal Rank Fusion (RRF) scores
  const allCandidateIds = new Set<string>([
    ...Array.from(denseMap.keys()),
    ...Array.from(sparseMap.keys()),
  ]);

  interface FusedItem {
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
    rrfScore: number;
    matchType: "hybrid" | "vector" | "bm25";
  }

  const fusedItems: FusedItem[] = [];

  for (const id of allCandidateIds) {
    const denseEntry = denseMap.get(id);
    const sparseEntry = sparseMap.get(id);

    let rrfScore = 0;
    if (denseEntry) {
      rrfScore += 1.0 / (RRF_K + denseEntry.rank);
    }
    if (sparseEntry) {
      rrfScore += 1.0 / (RRF_K + sparseEntry.rank);
    }

    let matchType: "hybrid" | "vector" | "bm25" = "hybrid";
    if (denseEntry && !sparseEntry) {
      matchType = "vector";
    } else if (!denseEntry && sparseEntry) {
      matchType = "bm25";
    }

    const chunkData = denseEntry?.chunk || sparseEntry?.chunk;
    if (!chunkData) continue;

    // Harmonize similarity score:
    const baseSim = denseEntry ? denseEntry.similarity : 0.70;
    const isBoth = denseEntry && sparseEntry;
    const finalSimilarity = Number(
      Math.min(0.99, baseSim + (isBoth ? 0.08 : 0)).toFixed(3)
    );

    fusedItems.push({
      id,
      documentId: chunkData.documentId,
      documentTitle: chunkData.documentTitle,
      content: chunkData.content,
      chunkIndex: chunkData.chunkIndex,
      pageNumber: chunkData.pageNumber,
      similarity: finalSimilarity,
      denseRank: denseEntry?.rank,
      sparseRank: sparseEntry?.rank,
      bm25Score: sparseEntry?.score,
      rrfScore: Number(rrfScore.toFixed(5)),
      matchType,
    });
  }

  // D. Sort by RRF score descending
  fusedItems.sort((a, b) => b.rrfScore - a.rrfScore);

  // E. Stage 2 Cross-Encoder Re-Ranking
  if (enableReranking) {
    return rerankCandidates({ query, candidates: fusedItems, topK });
  }

  return fusedItems.slice(0, topK);
}

