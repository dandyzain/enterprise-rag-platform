/**
 * BM25 (Best Matching 25) Lexical & Keyword Search Engine
 * Specifically tuned for enterprise documents with alphanumeric codes, acronyms, and technical metrics.
 */

export interface BM25DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

export interface BM25Result {
  chunk: BM25DocumentChunk;
  score: number;
  rank: number;
}

// Stop words (common English & Indonesian noise terms to filter from scoring, while preserving codes/numbers)
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
  "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will", "with",
  "ada", "adalah", "akan", "antara", "atau", "bagi", "bahkan", "bahwa", "bila",
  "bisa", "dan", "dapat", "dari", "dengan", "di", "dia", "hanya", "ia", "ini",
  "itu", "jika", "juga", "karena", "ke", "kepada", "kita", "lagi", "lain", "maka",
  "maupun", "oleh", "pada", "para", "secara", "seperti", "serta", "sudah", "tentang",
  "tersebut", "tidak", "untuk", "yang"
]);

/**
 * Tokenizes text into normalized lexical terms.
 * Preserves alphanumeric codes like "SEC-POL-04", "ISO-27001", "AES-256-GCM", "99.95%".
 */
export function tokenizeLexical(text: string): string[] {
  if (!text) return [];

  // Normalize delimiters like underscore and slash to spaces so filenames like SEC-POL-04_Kebijakan match
  const normalized = text.toLowerCase().replace(/[_/]/g, " ");

  // Match sequences of word characters, including dashes or dots within words/numbers
  const matches = normalized.match(/[a-z0-9]+(?:[-.][a-z0-9]+)*/g);
  if (!matches) return [];

  return matches.filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Executes BM25 scoring over a collection of document chunks.
 *
 * @param chunks The candidate chunks in the Knowledge Base
 * @param query The user's search query
 * @param k1 Term frequency saturation parameter (default: 1.2)
 * @param b Document length normalization parameter (default: 0.75)
 */
export function scoreBM25(
  chunks: BM25DocumentChunk[],
  query: string,
  k1 = 1.2,
  b = 0.75
): BM25Result[] {
  const queryTokens = tokenizeLexical(query);
  if (queryTokens.length === 0 || chunks.length === 0) {
    return [];
  }

  const N = chunks.length;

  // 1. Precompute chunk token lengths and term frequencies
  const docTokensMap = new Map<string, string[]>();
  const docLengthMap = new Map<string, number>();
  const docTermFreqMap = new Map<string, Map<string, number>>();
  let totalDocLength = 0;

  for (const chunk of chunks) {
    const fullText = chunk.documentTitle ? `${chunk.documentTitle} ${chunk.content}` : chunk.content;
    const tokens = tokenizeLexical(fullText);
    docTokensMap.set(chunk.id, tokens);
    docLengthMap.set(chunk.id, tokens.length);
    totalDocLength += tokens.length;

    const tfMap = new Map<string, number>();
    for (const t of tokens) {
      tfMap.set(t, (tfMap.get(t) || 0) + 1);
    }
    docTermFreqMap.set(chunk.id, tfMap);
  }

  const avgDocLength = totalDocLength / Math.max(N, 1);

  // 2. Precompute Document Frequency (DF) for each query term
  const dfMap = new Map<string, number>();
  for (const qToken of queryTokens) {
    let df = 0;
    for (const chunk of chunks) {
      const tfMap = docTermFreqMap.get(chunk.id);
      if (tfMap && tfMap.has(qToken)) {
        df++;
      }
    }
    dfMap.set(qToken, df);
  }

  // 3. Compute BM25 Score for each chunk
  const results: { chunk: BM25DocumentChunk; score: number }[] = [];

  for (const chunk of chunks) {
    const tfMap = docTermFreqMap.get(chunk.id) || new Map();
    const docLen = docLengthMap.get(chunk.id) || 1;
    let score = 0;

    for (const qToken of queryTokens) {
      const tf = tfMap.get(qToken) || 0;
      if (tf === 0) continue;

      const df = dfMap.get(qToken) || 0;
      // Robertson-Sparck Jones IDF formula with add-1 smoothing
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

      // BM25 term weight
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(avgDocLength, 1)));
      score += idf * (numerator / denominator);
    }

    if (score > 0) {
      results.push({ chunk, score });
    }
  }

  // 4. Sort descending by score and assign 1-based ranks
  results.sort((a, b) => b.score - a.score);

  return results.map((item, index) => ({
    chunk: item.chunk,
    score: Number(item.score.toFixed(4)),
    rank: index + 1,
  }));
}
