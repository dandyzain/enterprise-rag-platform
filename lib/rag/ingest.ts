import { db } from "@/lib/db";
import { parseDocumentBuffer } from "./parser";
import { chunkDocumentPages } from "./chunker";
import { getBatchEmbeddings } from "./embedder";
import { validateBinaryFile } from "./validator";
import { sanitizeDocumentText } from "./sanitizer";
import { IngestionResult } from "./types";

export interface IngestDocumentParams {
  knowledgeBaseId: string;
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
  fileSize: number;
  fileUrl?: string;
}

/**
 * Orchestrates the full ingestion pipeline:
 * 0. Binary magic bytes validation
 * 1. Document record creation (PROCESSING)
 * 2. PDF / Text Parsing & Page splitting
 * 3. PII & Secret Redaction (Sanitization)
 * 4. Recursive chunking with overlap & page metadata
 * 5. Batch vector embedding generation
 * 6. Vector database persistence (pgvector HNSW)
 * 7. Document status update (INDEXED / FAILED)
 */
export async function ingestDocument(
  params: IngestDocumentParams
): Promise<IngestionResult> {
  const startTime = Date.now();
  const {
    knowledgeBaseId,
    filename,
    mimeType,
    fileBuffer,
    fileSize,
    fileUrl = `/uploads/${encodeURIComponent(filename)}`,
  } = params;

  // Step 0: Security & Binary Magic Byte Validation
  const fileValidation = validateBinaryFile(fileBuffer, mimeType);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error || "Validasi keamanan struktur berkas gagal.");
  }

  // Step 1: Create initial document record with PROCESSING status
  const document = await db.createDocument({
    knowledgeBaseId,
    title: filename,
    fileUrl,
    fileType: mimeType,
    fileSize,
    status: "PROCESSING",
    chunkCount: 0,
  });

  try {
    // Step 2: Parse PDF / Text buffer into pages
    const parsed = await parseDocumentBuffer(fileBuffer, filename, mimeType);

    if (parsed.fullText.trim().length === 0) {
      throw new Error("Dokumen kosong atau teks tidak dapat diekstraksi dari file ini.");
    }

    // Step 2.5: PII & Secret Sanitization
    const sanitizedPages = parsed.pages.map((p) => {
      const sanitized = sanitizeDocumentText(p.text);
      return {
        ...p,
        text: sanitized.sanitizedText,
      };
    });

    // Step 3: Recursive chunking (500-700 tokens, 100 token overlap)
    const chunks = chunkDocumentPages(sanitizedPages, {
      maxTokens: 600,
      overlapTokens: 100,
      separators: ["\n\n", "\n", " ", ""],
    });

    if (chunks.length === 0) {
      throw new Error("Gagal menghasilkan potongan teks (chunks) yang valid dari dokumen.");
    }

    // Step 4: Batch Vector Embedding Generation
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await getBatchEmbeddings(chunkTexts);

    // Step 5: Save chunks with embeddings into database
    const chunkRecords = chunks.map((c, i) => ({
      documentId: document.id,
      content: c.content,
      chunkIndex: c.chunkIndex,
      pageNumber: c.pageNumber,
      embedding: embeddings[i],
    }));

    await db.insertChunks(chunkRecords);

    // Step 6: Mark document as INDEXED
    await db.updateDocumentStatus(document.id, "INDEXED", chunks.length);

    const processingTimeMs = Date.now() - startTime;

    return {
      documentId: document.id,
      title: filename,
      fileSize,
      fileType: mimeType,
      totalChunks: chunks.length,
      pages: parsed.totalPages,
      status: "INDEXED",
      processingTimeMs,
    };
  } catch (error) {
    console.error(`[Ingestion Pipeline] Error processing ${filename}:`, error);
    await db.updateDocumentStatus(document.id, "FAILED", 0);
    throw error;
  }
}
