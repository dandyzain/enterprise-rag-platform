import { generateText, type LanguageModel } from "ai";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export const MAX_HISTORY_TURNS = 8;
const MAX_TURN_CHARS = 2000;

/**
 * Keep the last few turns (excluding the current question) with bounded size,
 * so follow-up questions ("explain that in more detail") keep their context.
 */
export function buildHistory(messages: ConversationTurn[]): ConversationTurn[] {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
  const previous = lastUserIndex >= 0 ? messages.slice(0, lastUserIndex) : messages;
  return previous
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0)
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.role,
      content: m.content.length > MAX_TURN_CHARS ? `${m.content.slice(0, MAX_TURN_CHARS)}…` : m.content,
    }));
}

/** Cheap fallback: short follow-ups are expanded with the previous user question. */
export function heuristicStandaloneQuery(history: ConversationTurn[], query: string): string {
  const previousQuestion = [...history].reverse().find((m) => m.role === "user")?.content;
  const wordCount = query.trim().split(/\s+/).length;
  if (!previousQuestion || wordCount >= 8) return query;
  return `${previousQuestion.slice(0, 300)} ${query}`;
}

/**
 * Rewrite a follow-up into a standalone search query using the chat model.
 * Falls back to the heuristic on any error or timeout.
 */
export async function condenseQuery(
  history: ConversationTurn[],
  query: string,
  model: LanguageModel | null
): Promise<string> {
  if (history.length === 0) return query;
  if (!model || process.env.ENABLE_QUERY_REWRITE === "false") {
    return heuristicStandaloneQuery(history, query);
  }
  try {
    const transcript = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 600)}`)
      .join("\n");
    const { text } = await generateText({
      model,
      system:
        "Rewrite the user's latest message into a standalone search query for a document retrieval system. " +
        "Resolve pronouns and references using the conversation. Keep the user's language. " +
        "Output only the query, without quotes or explanations.",
      prompt: `Conversation:\n${transcript}\n\nLatest message: ${query}\n\nStandalone query:`,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(6000),
    });
    const rewritten = text.trim().replace(/^["']|["']$/g, "");
    return rewritten.length > 0 && rewritten.length < 500 ? rewritten : heuristicStandaloneQuery(history, query);
  } catch (err) {
    console.warn("[Chat] Query rewrite failed, using heuristic:", err);
    return heuristicStandaloneQuery(history, query);
  }
}
