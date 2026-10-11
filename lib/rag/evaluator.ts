import { CitationItem, GroundednessReport, GroundednessAuditItem, SearchResultChunk } from "./types";

/**
 * Enterprise RAG Groundedness & Faithfulness Evaluator
 * Verifies that assistant statements, metrics, and claims are factually supported
 * by the retrieved document chunks and cited references.
 */

// Regex for extracting numeric, percentage, and uppercase technical entities
const ENTITY_REGEX = /(?:\b\d+(?:\.\d+)?%?|\b[A-Z0-9]{2,}(?:-[A-Z0-9]+)*\b)/g;

/**
 * Splits text into discrete claim statements while ignoring short formatting lines.
 */
const META_PATTERNS = [
  /^berdasarkan analisis/i,
  /^berdasarkan dokumen/i,
  /^semua rincian/i,
  /^anda dapat mengklik/i,
  /^berikut adalah/i,
  /^poin-poin yang/i,
  /^informasi mengenai/i,
  /^tidak ditemukan/i,
  /^semoga informasi/i,
  /^salam/i,
];

function extractClaimSentences(text: string): string[] {
  // Normalize markdown code blocks and headers
  const clean = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+/gm, "")
    .trim();

  // Split on sentence terminators (. ! ? \n)
  const rawSentences = clean.split(/(?<=[.!?])\s+|\n+/);

  return rawSentences
    .map((s) => s.replace(/^[•\-\*]\s*/, "").replace(/\*\*/g, "").trim())
    .filter((s) => {
      if (s.length < 15 || s.startsWith("---")) return false;
      // Skip meta conversation filler
      for (const pat of META_PATTERNS) {
        if (pat.test(s) && !s.includes("[") && !s.includes('"') && !s.includes(":")) {
          return false;
        }
      }
      return true;
    });
}

/**
 * Evaluates the groundedness, faithfulness, and citation integrity of an AI response.
 */
export function evaluateGroundedness(
  answer: string,
  citations: CitationItem[],
  contextChunks: SearchResultChunk[]
): GroundednessReport {
  if (!answer || answer.trim().length === 0) {
    return {
      score: 100,
      status: "HIGH",
      verifiedClaimsCount: 0,
      totalClaimsCount: 0,
      citationsReferenced: [],
      hallucinationRisk: "MINIMAL",
      auditItems: [],
    };
  }

  // Find all citation indices referenced in the answer (e.g., [1], [2])
  const citationMatches = Array.from(answer.matchAll(/\[(\d+)\]/g));
  const citationsReferenced = Array.from(
    new Set(citationMatches.map((m) => parseInt(m[1], 10)))
  ).sort((a, b) => a - b);

  // Combine full retrieved context text including document titles and citations
  const allContextParts: string[] = [];
  contextChunks.forEach((c) => {
    allContextParts.push(c.documentTitle);
    allContextParts.push(c.content);
  });
  citations.forEach((c) => {
    allContextParts.push(c.documentTitle);
    allContextParts.push(c.snippet);
  });
  const allContextText = allContextParts.join(" \n\n ").toLowerCase();

  // Map citation index to chunk content + title
  const citationContentMap = new Map<number, string>();
  for (const c of citations) {
    const chunk = contextChunks.find((ch) => ch.id === c.chunkId);
    const content = chunk
      ? `${c.documentTitle} ${chunk.content}`
      : `${c.documentTitle} ${c.snippet}`;
    citationContentMap.set(c.index, content.toLowerCase());
  }

  const sentences = extractClaimSentences(answer);
  if (sentences.length === 0) {
    return {
      score: 100,
      status: "HIGH",
      verifiedClaimsCount: 0,
      totalClaimsCount: 0,
      citationsReferenced,
      hallucinationRisk: "MINIMAL",
      auditItems: [],
    };
  }

  const auditItems: GroundednessAuditItem[] = [];
  let verifiedCount = 0;

  for (const sentence of sentences) {
    // Check if sentence references specific citations
    const citeMatches = Array.from(sentence.matchAll(/\[(\d+)\]/g));
    const sentenceCites = citeMatches.map((m) => parseInt(m[1], 10));

    // Determine target context to verify against
    let targetContext = allContextText;
    let matchedCiteIndex: number | undefined;

    if (sentenceCites.length > 0) {
      matchedCiteIndex = sentenceCites[0];
      const specificContext = citationContentMap.get(matchedCiteIndex);
      if (specificContext) {
        targetContext = specificContext;
      }
    }

    // 1. Check critical entities (numbers, SLA percentages, policy codes)
    const entities = sentence.match(ENTITY_REGEX) || [];
    let entitiesSupported = true;
    for (const ent of entities) {
      // Ignore common non-critical numbers or citation digits
      if (/^\[?\d+\]?$/.test(ent)) continue;
      // Strip dashes or extension for partial entity match
      const cleanEnt = ent.toLowerCase().replace(/\.txt$/, "");
      if (!targetContext.includes(cleanEnt) && !allContextText.includes(cleanEnt)) {
        entitiesSupported = false;
        break;
      }
    }

    // 2. Check token overlap (trigram / keywords)
    const words = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let matchingWords = 0;
    for (const w of words) {
      if (targetContext.includes(w) || allContextText.includes(w)) {
        matchingWords++;
      }
    }

    const wordOverlap = words.length > 0 ? matchingWords / words.length : 1.0;

    // A claim is grounded if entities are verified and word overlap is at least 35%
    const isGrounded = entitiesSupported && wordOverlap >= 0.35;
    const confidence = Number(
      Math.min(1.0, (wordOverlap * 0.7 + (entitiesSupported ? 0.3 : 0.0))).toFixed(2)
    );

    if (isGrounded) {
      verifiedCount++;
    }

    // Find snippet match
    let matchedSnippet: string | undefined;
    if (words.length > 0) {
      for (const w of words) {
        const idx = targetContext.indexOf(w);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(targetContext.length, idx + 100);
          matchedSnippet = `...${targetContext.slice(start, end).trim()}...`;
          break;
        }
      }
    }

    auditItems.push({
      sentence: sentence.length > 120 ? `${sentence.slice(0, 117)}...` : sentence,
      isGrounded,
      citationIndex: matchedCiteIndex,
      matchedSnippet,
      confidence,
    });
  }

  const score = Math.round((verifiedCount / Math.max(sentences.length, 1)) * 100);
  const status: "HIGH" | "MEDIUM" | "LOW" =
    score >= 85 ? "HIGH" : score >= 65 ? "MEDIUM" : "LOW";

  const hallucinationRisk: "MINIMAL" | "MODERATE" | "HIGH" =
    score >= 90 ? "MINIMAL" : score >= 70 ? "MODERATE" : "HIGH";

  return {
    score,
    status,
    verifiedClaimsCount: verifiedCount,
    totalClaimsCount: sentences.length,
    citationsReferenced,
    hallucinationRisk,
    auditItems,
  };
}
