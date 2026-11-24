import { db } from "@/lib/db";
import { EmbeddingError, getQueryEmbedding, LOCAL_EMBEDDING_MODEL } from "./embedder";
import { SearchResultChunk, SearchMode } from "./types";
import { rerankCandidates } from "./reranker";

export interface HybridSearchOptions {
  knowledgeBaseId: string;
  query: string;
  searchMode?: SearchMode; // default: "hybrid"
  threshold?: number; // default: 0.65
  topK?: number; // default: 5
  filterDocumentIds?: string[];
  enableReranking?: boolean; // default: true
}

/** Reciprocal Rank Fusion constant (standard baseline = 60). */
const RRF_K = 60;

/**
 * Dense retrieval. Returns [] (and lets BM25 carry the query) if the embedding
 * provider is unavailable, instead of comparing vectors from different models.
 */
async function denseRetrieve(
  knowledgeBaseId: string,
  query: string,
  threshold: number,
  limit: number,
  documentIds?: string[],
  adaptive = false
): Promise<SearchResultChunk[]> {
  let queryEmbedding;
  try {
    queryEmbedding = await getQueryEmbedding(query);
  } catch (err) {
    if (err instanceof EmbeddingError) {
      console.warn("[Search] Query embedding failed, using keyword retrieval only:", err.cause ?? err);
      return [];
    }
    throw err;
  }

  // Hash vectors (no API key) produce much lower cosine scores than real embeddings.
  const isLocal = queryEmbedding.model === LOCAL_EMBEDDING_MODEL;
  const effectiveThreshold = isLocal ? Math.min(threshold, 0.05) : threshold;

  const params = {
    knowledgeBaseId,
    embedding: queryEmbedding.embedding,
    embeddingModel: queryEmbedding.model,
    limit,
    documentIds,
  };
  let results = await db.searchDense({ ...params, threshold: effectiveThreshold });
  if (results.length === 0 && adaptive) {
    results = await db.searchDense({ ...params, threshold: Math.min(effectiveThreshold * 0.1, 0.05) });
  }
  return results;
}

/**
 * Hybrid retrieval: dense vectors + sparse keyword ranking fused with RRF,
 * followed by an optional lexical re-ranking stage.
 */
export async function executeHybridSearch(options: HybridSearchOptions): Promise<SearchResultChunk[]> {
  const {
    knowledgeBaseId,
    query,
    searchMode = "hybrid",
    threshold = 0.65,
    topK = 5,
    filterDocumentIds,
    enableReranking = true,
  } = options;

  if (!query || query.trim().length === 0) return [];
  const documentIds = filterDocumentIds && filterDocumentIds.length > 0 ? filterDocumentIds : undefined;
  const poolSize = enableReranking ? Math.max(topK * 3, 15) : topK;

  // 1. Semantic only
  if (searchMode === "semantic") {
    const dense = await denseRetrieve(knowledgeBaseId, query, threshold, poolSize, documentIds, true);
    const chunks = dense.map((r, i) => ({ ...r, denseRank: i + 1, matchType: "vector" as const }));
    return enableReranking ? rerankCandidates({ query, candidates: chunks, topK }) : chunks.slice(0, topK);
  }

  // 2. Keyword only
  if (searchMode === "keyword") {
    const sparse = await db.searchSparse({ knowledgeBaseId, query, limit: poolSize, documentIds });
    const maxScore = sparse[0]?.score || 1;
    const chunks = sparse.map((hit) => ({
      ...hit.chunk,
      similarity: Number(Math.min(1, hit.score / Math.max(maxScore, 1e-9)).toFixed(3)),
      sparseRank: hit.rank,
      bm25Score: hit.score,
      matchType: "bm25" as const,
    }));
    return enableReranking ? rerankCandidates({ query, candidates: chunks, topK }) : chunks.slice(0, topK);
  }

  // 3. Hybrid (RRF over both candidate pools)
  const candidatePoolSize = Math.max(topK * 3, 15);
  const [dense, sparse] = await Promise.all([
    denseRetrieve(knowledgeBaseId, query, threshold * 0.8, candidatePoolSize, documentIds),
    db.searchSparse({ knowledgeBaseId, query, limit: candidatePoolSize, documentIds }),
  ]);

  const denseMap = new Map(dense.map((c, idx) => [c.id, { rank: idx + 1, chunk: c }]));
  const sparseMap = new Map(sparse.map((hit) => [hit.chunk.id, hit]));
  const ids = new Set<string>([...denseMap.keys(), ...sparseMap.keys()]);

  const fused: SearchResultChunk[] = [];
  for (const id of ids) {
    const d = denseMap.get(id);
    const s = sparseMap.get(id);
    const base = d?.chunk ?? (s ? { ...s.chunk, similarity: 0 } : null);
    if (!base) continue;

    const rrfScore = (d ? 1 / (RRF_K + d.rank) : 0) + (s ? 1 / (RRF_K + s.rank) : 0);
    const matchType: "hybrid" | "vector" | "bm25" = d && s ? "hybrid" : d ? "vector" : "bm25";
    const baseSim = d ? d.chunk.similarity : 0.7;
    fused.push({
      ...base,
      similarity: Number(Math.min(0.99, baseSim + (d && s ? 0.08 : 0)).toFixed(3)),
      denseRank: d?.rank,
      sparseRank: s?.rank,
      bm25Score: s?.score,
      rrfScore: Number(rrfScore.toFixed(5)),
      matchType,
    });
  }

  fused.sort((a, b) => (b.rrfScore ?? 0) - (a.rrfScore ?? 0));
  return enableReranking ? rerankCandidates({ query, candidates: fused, topK }) : fused.slice(0, topK);
}
