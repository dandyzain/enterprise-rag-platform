import { db } from "@/lib/db";
import { ApiError } from "@/lib/api/route";
import { DocumentParseError, parseDocumentBuffer } from "./parser";
import { chunkDocumentPages } from "./chunker";
import { EmbeddingError, getBatchEmbeddings } from "./embedder";
import { validateBinaryFile } from "./validator";
import { sanitizeDocumentText } from "./sanitizer";
import { DocumentItem, IngestionResult } from "./types";

export interface IngestDocumentParams {
  knowledgeBaseId: string;
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
  fileSize: number;
  /** Store the original file for download / re-indexing (default true). */
  storeOriginal?: boolean;
}

const CHUNKING = { maxTokens: 600, overlapTokens: 100, separators: ["\n\n", "\n", " ", ""] };

/**
 * Parse -> redact PII -> chunk -> embed -> persist. Shared by upload and re-index.
 * Throws ApiError with a user-facing code for expected failures.
 */
async function indexBuffer(
  document: DocumentItem,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ totalChunks: number; pages: number }> {
  let parsed;
  try {
    parsed = await parseDocumentBuffer(fileBuffer, document.title, mimeType);
  } catch (err) {
    if (err instanceof DocumentParseError) throw new ApiError("FILE_NO_TEXT", 422);
    throw err;
  }
  if (parsed.fullText.trim().length === 0) throw new ApiError("FILE_NO_TEXT", 422);

  const sanitizedPages = parsed.pages.map((p) => ({ ...p, text: sanitizeDocumentText(p.text).sanitizedText }));
  const chunks = chunkDocumentPages(sanitizedPages, CHUNKING);
  if (chunks.length === 0) throw new ApiError("FILE_NO_TEXT", 422);

  const totalChunks = await embedAndStore(
    document.id,
    chunks.map((c) => ({ content: c.content, chunkIndex: c.chunkIndex, pageNumber: c.pageNumber }))
  );
  return { totalChunks, pages: parsed.totalPages };
}

async function embedAndStore(
  documentId: string,
  chunks: Array<{ content: string; chunkIndex: number; pageNumber: number | null }>
): Promise<number> {
  let embedded;
  try {
    embedded = await getBatchEmbeddings(chunks.map((c) => c.content));
  } catch (err) {
    if (err instanceof EmbeddingError) {
      console.error("[Ingestion] Embedding provider failed:", err.cause ?? err);
      throw new ApiError("EMBEDDING_FAILED", 502);
    }
    throw err;
  }
  await db.replaceChunks(
    documentId,
    chunks.map((c, i) => ({ ...c, embedding: embedded.embeddings[i] }))
  );
  await db.updateDocument(documentId, {
    status: "INDEXED",
    chunkCount: chunks.length,
    embeddingModel: embedded.model,
  });
  return chunks.length;
}

export function validateUpload(fileBuffer: Buffer, mimeType: string): void {
  const validation = validateBinaryFile(fileBuffer, mimeType);
  if (!validation.valid) {
    throw new ApiError(validation.code ?? "FILE_TYPE", 400);
  }
}

export async function ingestDocument(params: IngestDocumentParams): Promise<IngestionResult> {
  const startTime = Date.now();
  const { knowledgeBaseId, filename, mimeType, fileBuffer, fileSize, storeOriginal = true } = params;

  validateUpload(fileBuffer, mimeType);

  const document = await db.createDocument({
    knowledgeBaseId,
    title: filename,
    fileUrl: "",
    fileType: mimeType,
    fileSize,
    status: "PROCESSING",
    chunkCount: 0,
  });

  try {
    if (storeOriginal) {
      await db.saveDocumentFile(document.id, { buffer: fileBuffer, mimeType });
      await db.updateDocument(document.id, { fileUrl: `/api/documents/${document.id}/file` });
    }
    const { totalChunks, pages } = await indexBuffer(document, fileBuffer, mimeType);
    return {
      documentId: document.id,
      title: filename,
      fileSize,
      fileType: mimeType,
      totalChunks,
      pages,
      status: "INDEXED",
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`[Ingestion] Failed to index "${filename}":`, error);
    await db.updateDocument(document.id, { status: "FAILED", chunkCount: 0 }).catch(() => undefined);
    throw error;
  }
}

/**
 * Re-index a document with the current embedding model: from the stored
 * original file when available, otherwise by re-embedding the existing chunks.
 */
export async function reindexDocument(document: DocumentItem): Promise<{ totalChunks: number }> {
  await db.updateDocument(document.id, { status: "PROCESSING" });
  try {
    const file = await db.getDocumentFile(document.id);
    if (file) {
      const { totalChunks } = await indexBuffer(document, file.buffer, file.mimeType);
      return { totalChunks };
    }
    const existing = await db.getDocumentChunks(document.id);
    if (existing.length === 0) throw new ApiError("NO_ORIGINAL_FILE", 409);
    const totalChunks = await embedAndStore(
      document.id,
      existing.map((c) => ({ content: c.content, chunkIndex: c.chunkIndex, pageNumber: c.pageNumber }))
    );
    return { totalChunks };
  } catch (error) {
    await db.updateDocument(document.id, { status: "FAILED" }).catch(() => undefined);
    throw error;
  }
}

/** Index pre-chunked text (used when restoring a backup). */
export async function indexExistingChunks(
  documentId: string,
  chunks: Array<{ content: string; chunkIndex: number; pageNumber: number | null }>
): Promise<number> {
  return embedAndStore(documentId, chunks);
}
