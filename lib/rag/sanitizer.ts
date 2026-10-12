export interface SanitizationResult {
  sanitizedText: string;
  totalRedactions: number;
  categories: string[];
}

/**
 * Enterprise PII & Secret Redactor
 * Automatically sanitizes sensitive data before chunk embedding and LLM prompt forwarding.
 */
export function sanitizeDocumentText(rawText: string): SanitizationResult {
  let text = rawText;
  let totalRedactions = 0;
  const categoriesSet = new Set<string>();

  // 1. Redact Secret API Keys (OpenAI, Gemini, GitHub tokens)
  const apiKeyRegex = /\b(?:sk-[a-zA-Z0-9_-]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9]{10,})\b/g;
  if (apiKeyRegex.test(text)) {
    const matches = text.match(apiKeyRegex);
    totalRedactions += matches ? matches.length : 0;
    categoriesSet.add("API_SECRETS");
    text = text.replace(apiKeyRegex, "[REDACTED_API_KEY]");
  }

  // 2. Redact Indonesian NIK / KTP (Strict 16 digits, province codes 11-92)
  const nikRegex = /\b(1[1-9]|21|[37][1-6]|5[1-3]|6[1-5]|[89][1-2])\d{14}\b/g;
  if (nikRegex.test(text)) {
    const matches = text.match(nikRegex);
    totalRedactions += matches ? matches.length : 0;
    categoriesSet.add("NIK_KTP");
    text = text.replace(nikRegex, "[REDACTED_NIK_KTP]");
  }

  // 3. Redact Credit Card Numbers (16 digits with optional dashes/spaces)
  const creditCardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  const ccMatches = text.match(creditCardRegex);
  if (ccMatches) {
    const realCCs = ccMatches.filter((m) => m.replace(/[-\s]/g, "").length === 16);
    if (realCCs.length > 0) {
      totalRedactions += realCCs.length;
      categoriesSet.add("CREDIT_CARD");
      text = text.replace(creditCardRegex, "[REDACTED_CREDIT_CARD]");
    }
  }

  // 4. Redact Indonesian Phone Numbers (+62 / 08xxx)
  const phoneRegex = /\b(?:\+62|62|08)[1-9][0-9]{7,11}\b/g;
  if (phoneRegex.test(text)) {
    const matches = text.match(phoneRegex);
    totalRedactions += matches ? matches.length : 0;
    categoriesSet.add("PHONE_NUMBER");
    text = text.replace(phoneRegex, "[REDACTED_PHONE]");
  }

  return {
    sanitizedText: text,
    totalRedactions,
    categories: Array.from(categoriesSet),
  };
}
