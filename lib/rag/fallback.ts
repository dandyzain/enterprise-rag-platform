import type { Locale } from "@/lib/i18n/types";

type FallbackChunk = { content: string; pageNumber: number | null; documentTitle: string };

/**
 * Deterministic, citation-backed answer used when no LLM key is configured.
 * It quotes the top retrieved passages verbatim instead of generating text.
 */
export function generateGroundedFallbackResponse(
  query: string,
  chunks: FallbackChunk[],
  hasContext: boolean,
  locale: Locale = "en"
): string {
  const isId = locale === "id";
  if (!hasContext || chunks.length === 0) {
    return isId
      ? `Maaf, informasi mengenai "${query}" tidak ditemukan dalam dokumen Knowledge Base saat ini. Pastikan dokumen terkait sudah diunggah dan diindeks.`
      : `Sorry, no information about "${query}" was found in the documents of the current knowledge base. Make sure the related documents are uploaded and indexed.`;
  }

  const points = chunks
    .slice(0, 3)
    .map((c, idx) => {
      const snippet = c.content.split("\n")[0].slice(0, 150).trim();
      const page = c.pageNumber ? (isId ? `(Halaman ${c.pageNumber})` : `(Page ${c.pageNumber})`) : "";
      return isId
        ? `• Berdasarkan dokumen **${c.documentTitle}** ${page}: "${snippet}..." [${idx + 1}]`
        : `• According to **${c.documentTitle}** ${page}: "${snippet}..." [${idx + 1}]`;
    })
    .join("\n\n");

  return isId
    ? `Berdasarkan pencarian pada dokumen di Knowledge Base Anda, berikut kutipan yang paling relevan:\n\n${points}\n\nMode demo: tidak ada API key model bahasa yang dikonfigurasi, jadi jawaban ini berupa kutipan langsung. Klik sitasi untuk melihat paragraf aslinya.`
    : `Based on a search of the documents in your knowledge base, these are the most relevant passages:\n\n${points}\n\nDemo mode: no language-model API key is configured, so this answer quotes the sources directly. Click a citation to view the original passage.`;
}

const DEFAULT_TITLE_PATTERNS = [/^obrolan\b/i, /^chat\b/i, /^new chat/i, /^percakapan baru/i, /^sesi\b/i, /^session\b/i];

export function isDefaultSessionTitle(title: string): boolean {
  const t = title.trim();
  return t.length === 0 || DEFAULT_TITLE_PATTERNS.some((p) => p.test(t));
}

export function generateSmartSessionTitle(query: string, locale: Locale = "en"): string {
  const clean = query
    .replace(/[?.,!":;]/g, "")
    .replace(
      /^(tolong|bagaimana|apakah|sebutkan|jelaskan|apa saja|siapa|kapan|mengapa|dimana|bisakah kamu|please|what is|what are|how do|how does|explain|tell me about|can you)\s+/i,
      ""
    )
    .trim();
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length === 0) return locale === "id" ? "Diskusi RAG" : "RAG discussion";
  const title = words.join(" ");
  return (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, 80);
}
