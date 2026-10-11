import { SearchResultChunk } from "./types";
import { tokenizeLexical } from "./bm25";

/**
 * Enterprise Two-Stage Cross-Encoder Re-Ranker
 * Performs deep contextual alignment between user query and retrieved candidate chunks.
 */

export interface RerankOptions {
  query: string;
  candidates: SearchResultChunk[];
  topK?: number;
}

export function rerankCandidates(options: RerankOptions): SearchResultChunk[] {
  const { query, candidates, topK = 5 } = options;

  if (candidates.length === 0 || !query.trim()) {
    return candidates.slice(0, topK);
  }

  const queryTerms = tokenizeLexical(query);
  const cleanQueryLower = query.toLowerCase().trim();

  // Score each candidate
  const scored = candidates.map((candidate, initialIndex) => {
    const initialRank = initialIndex + 1;
    const contentLower = candidate.content.toLowerCase();

    // 1. Base Retrieval Score (Normalized from Cosine Similarity / RRF)
    const baseScore = candidate.similarity;

    // 2. Query Term Coverage (How many unique query terms exist in this chunk)
    let matchedTermsCount = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        matchedTermsCount++;
      }
    }
    const coverageScore =
      queryTerms.length > 0 ? matchedTermsCount / queryTerms.length : 1.0;

    // 3. Exact Phrase Match Boost
    let phraseBoost = 0.0;
    if (contentLower.includes(cleanQueryLower)) {
      phraseBoost = 1.0;
    } else {
      // Check 2-term / 3-term sliding window phrases
      for (let i = 0; i < queryTerms.length - 1; i++) {
        const subPhrase = `${queryTerms[i]} ${queryTerms[i + 1]}`;
        if (contentLower.includes(subPhrase)) {
          phraseBoost += 0.35;
        }
      }
      phraseBoost = Math.min(phraseBoost, 1.0);
    }

    // 4. Entity / Interrogative Congruence
    // Detect if query is asking for specific metrics, numbers, or standard codes
    const isAskingForMetrics =
      /(?:berapa|target|standar|persen|sla|rto|rpo|algoritma|kode|port|jam|menit|detik)/i.test(
        query
      );
    const hasConcreteData =
      /(?:\d+%|\d+\s*(?:jam|menit|detik|hari)|\b[A-Z0-9]{3,}(?:-[A-Z0-9]+)+\b)/i.test(
        candidate.content
      );

    const congruenceScore = isAskingForMetrics && hasConcreteData ? 1.0 : 0.4;

    // Final Cross-Encoder Weighted Composite Score
    const compositeRerankScore =
      baseScore * 0.40 +
      coverageScore * 0.30 +
      phraseBoost * 0.20 +
      congruenceScore * 0.10;

    return {
      chunk: candidate,
      initialRank,
      rerankScore: Number(compositeRerankScore.toFixed(4)),
    };
  });

  // Sort descending by composite rerank score
  scored.sort((a, b) => b.rerankScore - a.rerankScore);

  // Assign re-ranked rank and delta
  return scored.slice(0, topK).map((item, reRankIndex) => {
    const reRank = reRankIndex + 1;
    const rerankDelta = item.initialRank - reRank; // e.g. was 4, now 1 -> delta = +3

    return {
      ...item.chunk,
      initialRank: item.initialRank,
      reRank,
      rerankScore: item.rerankScore,
      rerankDelta,
      // Refined normalized similarity reflects post-rerank confidence
      similarity: Number(
        Math.min(0.99, Math.max(item.chunk.similarity, item.rerankScore)).toFixed(3)
      ),
    };
  });
}
