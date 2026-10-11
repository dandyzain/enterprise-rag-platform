export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  title: string;
  totalPages: number;
  fullText: string;
  pages: ExtractedPage[];
}

/**
 * Extracts raw text and page-by-page content from PDF or Text buffers.
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractedDocument> {
  const isPdf =
    mimeType === "application/pdf" ||
    filename.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    try {
      // Dynamic import to prevent bundler SSR overhead
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const parseResult = await parser.getText();

      const pages: ExtractedPage[] = [];
      if (parseResult.pages && Array.isArray(parseResult.pages)) {
        for (const p of parseResult.pages) {
          const cleaned = cleanExtractedText(p.text || "");
          if (cleaned.length > 0) {
            pages.push({
              pageNumber: p.num || pages.length + 1,
              text: cleaned,
            });
          }
        }
      }

      await parser.destroy();

      // If no page split was found but fullText exists
      if (pages.length === 0 && parseResult.text) {
        const cleaned = cleanExtractedText(parseResult.text);
        if (cleaned.length > 0) {
          pages.push({ pageNumber: 1, text: cleaned });
        }
      }

      const fullText = pages.map((p) => p.text).join("\n\n");

      return {
        title: filename,
        totalPages: pages.length || 1,
        fullText,
        pages,
      };
    } catch (pdfErr) {
      console.error("[Parser] PDF parsing with PDFParse failed, attempting fallback:", pdfErr);
      // Fallback: extract printable strings from buffer
      const rawText = cleanExtractedText(buffer.toString("utf-8"));
      return {
        title: filename,
        totalPages: 1,
        fullText: rawText,
        pages: [{ pageNumber: 1, text: rawText }],
      };
    }
  }

  // Text, Markdown, CSV, JSON parsing
  const utf8Text = cleanExtractedText(buffer.toString("utf-8"));
  return {
    title: filename,
    totalPages: 1,
    fullText: utf8Text,
    pages: [{ pageNumber: 1, text: utf8Text }],
  };
}

/**
 * Cleans extracted text by normalizing line breaks, tabs, and excess whitespace.
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u0000/g, "") // remove null characters
    .replace(/[ \t]{2,}/g, " ") // collapse multiple spaces
    .replace(/\n{3,}/g, "\n\n") // collapse multiple empty lines
    .trim();
}
