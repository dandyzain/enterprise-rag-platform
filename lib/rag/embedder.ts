import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

export type EmbeddingProvider = "openai" | "google" | "local-deterministic";

export interface EmbedderConfig {
  provider?: EmbeddingProvider;
  model?: string;
  dimensions?: number;
}

export const DEFAULT_VECTOR_DIM = 1536;

/**
 * Deterministic unit-vector embedding generator using character & word n-gram hashing.
 * Ensures tests and initial environments work cleanly without API keys.
 */
function generateDeterministicVector(text: string, dimensions = DEFAULT_VECTOR_DIM): number[] {
  const vec = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let charIdx = 0; charIdx < word.length; charIdx++) {
      hash = (hash << 5) - hash + word.charCodeAt(charIdx);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % dimensions;
    vec[bucket] += 1.0;

    // Bi-gram hashing
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let biHash = 0;
      for (let c = 0; c < bigram.length; c++) {
        biHash = (biHash << 5) - biHash + bigram.charCodeAt(c);
        biHash |= 0;
      }
      const biBucket = Math.abs(biHash) % dimensions;
      vec[biBucket] += 0.75;
    }
  }

  // Normalize to L2 unit norm
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) {
    vec[0] = 1.0;
    return vec;
  }

  return vec.map((v) => v / norm);
}

/**
 * Generate embedding for a single query text.
 */
export async function getQueryEmbedding(
  query: string,
  config: EmbedderConfig = {}
): Promise<number[]> {
  const provider =
    config.provider ??
    (process.env.OPENAI_API_KEY
      ? "openai"
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "google"
      : "local-deterministic");

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const modelName = config.model ?? "text-embedding-3-small";
      const { embedding } = await embed({
        model: openai.embedding(modelName),
        value: query,
      });
      return embedding;
    }

    if (provider === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const modelName = config.model ?? "text-embedding-004";
      const { embedding } = await embed({
        model: google.textEmbeddingModel(modelName),
        value: query,
      });
      return embedding;
    }
  } catch (error) {
    console.warn(`[Embedder] Failed with provider ${provider}, falling back:`, error);
  }

  return generateDeterministicVector(query, config.dimensions ?? DEFAULT_VECTOR_DIM);
}

/**
 * Generate embeddings for multiple text chunks in batches.
 */
export async function getBatchEmbeddings(
  texts: string[],
  config: EmbedderConfig = {}
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const provider =
    config.provider ??
    (process.env.OPENAI_API_KEY
      ? "openai"
      : process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "google"
      : "local-deterministic");

  try {
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const modelName = config.model ?? "text-embedding-3-small";
      const { embeddings } = await embedMany({
        model: openai.embedding(modelName),
        values: texts,
      });
      return embeddings;
    }

    if (provider === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const modelName = config.model ?? "text-embedding-004";
      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel(modelName),
        values: texts,
      });
      return embeddings;
    }
  } catch (error) {
    console.warn(`[Embedder] Batch failed with provider ${provider}, using fallback:`, error);
  }

  // Fallback to deterministic high-dimensional vector
  const dim = config.dimensions ?? DEFAULT_VECTOR_DIM;
  return texts.map((t) => generateDeterministicVector(t, dim));
}
