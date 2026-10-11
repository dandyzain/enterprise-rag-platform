import { ExtractedPage } from "./parser";

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  approxTokens: number;
}

export interface ChunkingOptions {
  maxTokens?: number; // default: 600 (within 500-700 range)
  minTokens?: number; // default: 150
  overlapTokens?: number; // default: 100
  separators?: string[]; // default: ["\n\n", "\n", " ", ""]
}

// Approximate characters per token (standard multilingual ratio ~3.8 chars/token)
const CHARS_PER_TOKEN = 3.8;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Splits text recursively using a hierarchical list of separators.
 */
function recursiveSplitText(
  text: string,
  separators: string[],
  maxChars: number,
  overlapChars: number
): string[] {
  if (text.length <= maxChars) {
    return [text.trim()].filter((t) => t.length > 0);
  }

  // Find the highest-priority separator present in text
  let selectedSep = "";
  let remainingSeparators: string[] = [];

  for (let i = 0; i < separators.length; i++) {
    const sep = separators[i];
    if (sep === "" || text.includes(sep)) {
      selectedSep = sep;
      remainingSeparators = separators.slice(i + 1);
      break;
    }
  }

  const splits = selectedSep === "" ? Array.from(text) : text.split(selectedSep);
  const chunks: string[] = [];
  let currentPiece = "";

  for (let i = 0; i < splits.length; i++) {
    const piece = splits[i];
    const candidate = currentPiece ? `${currentPiece}${selectedSep}${piece}` : piece;

    if (candidate.length <= maxChars) {
      currentPiece = candidate;
    } else {
      // If current piece already exists and candidate exceeds maxChars, push current piece
      if (currentPiece.trim().length > 0) {
        chunks.push(currentPiece.trim());
      }

      // If a single segment by itself exceeds maxChars, recursively split using lower separators
      if (piece.length > maxChars && remainingSeparators.length > 0) {
        const subChunks = recursiveSplitText(
          piece,
          remainingSeparators,
          maxChars,
          overlapChars
        );
        for (let j = 0; j < subChunks.length; j++) {
          chunks.push(subChunks[j]);
        }
        currentPiece = "";
      } else {
        // Start next chunk with overlap from the tail of current piece if available
        if (overlapChars > 0 && currentPiece.length > overlapChars) {
          const overlapText = currentPiece.slice(-overlapChars);
          currentPiece = `${overlapText}${selectedSep}${piece}`;
        } else {
          currentPiece = piece;
        }
      }
    }
  }

  if (currentPiece.trim().length > 0) {
    chunks.push(currentPiece.trim());
  }

  return chunks;
}

/**
 * Main Recursive Chunking Engine with page-aware attribution.
 */
export function chunkDocumentPages(
  pages: ExtractedPage[],
  options: ChunkingOptions = {}
): TextChunk[] {
  const maxTokens = options.maxTokens ?? 600; // Between 500-700
  const overlapTokens = options.overlapTokens ?? 100;
  const separators = options.separators ?? ["\n\n", "\n", " ", ""];

  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN);
  const overlapChars = Math.floor(overlapTokens * CHARS_PER_TOKEN);

  const results: TextChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;

    const rawChunks = recursiveSplitText(
      page.text,
      separators,
      maxChars,
      overlapChars
    );

    for (const raw of rawChunks) {
      const trimmed = raw.trim();
      if (trimmed.length < 20) continue; // Ignore tiny artifacts

      results.push({
        content: trimmed,
        chunkIndex: globalChunkIndex++,
        pageNumber: page.pageNumber,
        approxTokens: estimateTokens(trimmed),
      });
    }
  }

  return results;
}
