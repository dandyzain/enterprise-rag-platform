import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { aiConfig } from "@/lib/env";

export type EmbeddingProvider = "openai" | "google" | "local";

/** Must match the `vector(1536)` column in the database schema. */
export const DEFAULT_VECTOR_DIM = 1536;
export const LOCAL_EMBEDDING_MODEL = "local:hash-ngram-1536";

export class EmbeddingError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/** Provider chosen from the server environment (documents are indexed with server keys only). */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (aiConfig.hasServerOpenAI()) return "openai";
  if (aiConfig.hasServerGoogle()) return "google";
  return "local";
}

/** Identifier stored per document so vectors from different models are never compared. */
export function getEmbeddingModelId(provider = getEmbeddingProvider()): string {
  if (provider === "openai") return `openai:${aiConfig.openaiEmbeddingModel()}`;
  if (provider === "google") return `google:${aiConfig.googleEmbeddingModel()}`;
  return LOCAL_EMBEDDING_MODEL;
}

/**
 * Deterministic word + bigram hashing vectors. Lets the demo work without API keys;
 * quality is lexical, not semantic.
 */
export function generateDeterministicVector(text: string, dimensions = DEFAULT_VECTOR_DIM): number[] {
  const vec = new Array(dimensions).fill(0);
  const words = text.toLowerCase().trim().split(/\s+/);

  const bucketOf = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % dimensions;
  };

  for (let i = 0; i < words.length; i++) {
    vec[bucketOf(words[i])] += 1.0;
    if (i < words.length - 1) vec[bucketOf(`${words[i]}_${words[i + 1]}`)] += 0.75;
  }

  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) {
    vec[0] = 1.0;
    return vec;
  }
  return vec.map((v) => v / norm);
}

function providerModel(provider: Exclude<EmbeddingProvider, "local">) {
  return provider === "openai"
    ? openai.embedding(aiConfig.openaiEmbeddingModel())
    : google.embeddingModel(aiConfig.googleEmbeddingModel());
}

const providerOptions = {
  // Gemini embeddings default to 3072 dims; request 1536 to match the pgvector column.
  google: { outputDimensionality: DEFAULT_VECTOR_DIM },
};

export interface QueryEmbedding {
  embedding: number[];
  model: string;
}

/** Embed a search query with the same model used for indexing. Throws EmbeddingError on provider failure. */
export async function getQueryEmbedding(query: string): Promise<QueryEmbedding> {
  const provider = getEmbeddingProvider();
  const model = getEmbeddingModelId(provider);
  if (provider === "local") return { embedding: generateDeterministicVector(query), model };
  try {
    const { embedding } = await embed({
      model: providerModel(provider),
      value: query,
      dimensions: DEFAULT_VECTOR_DIM,
      providerOptions,
      maxRetries: 1,
    });
    return { embedding, model };
  } catch (err) {
    throw new EmbeddingError(`Query embedding failed (${model})`, err);
  }
}

/** Embed document chunks. Throws EmbeddingError instead of silently mixing in fallback vectors. */
export async function getBatchEmbeddings(texts: string[]): Promise<{ embeddings: number[][]; model: string }> {
  const provider = getEmbeddingProvider();
  const model = getEmbeddingModelId(provider);
  if (texts.length === 0) return { embeddings: [], model };
  if (provider === "local") {
    return { embeddings: texts.map((t) => generateDeterministicVector(t)), model };
  }
  try {
    const { embeddings } = await embedMany({
      model: providerModel(provider),
      values: texts,
      dimensions: DEFAULT_VECTOR_DIM,
      providerOptions,
      maxRetries: 2,
    });
    return { embeddings, model };
  } catch (err) {
    throw new EmbeddingError(`Batch embedding failed (${model})`, err);
  }
}
