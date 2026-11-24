import { streamText, type ModelMessage } from "ai";
import { db } from "@/lib/db";
import { apiRoute, ApiError, readJson } from "@/lib/api/route";
import { loadOwnedSession, loadReadableKb } from "@/lib/api/access";
import { ChatSchema, parseWith } from "@/lib/api/schemas";
import { createChatModel, resolveChatRoute, serverModelAvailability } from "@/lib/ai/models";
import { performSemanticSearch } from "@/lib/rag/search";
import { buildStrictGroundingPrompt } from "@/lib/rag/prompt";
import { evaluateGroundedness } from "@/lib/rag/evaluator";
import { buildHistory, condenseQuery } from "@/lib/rag/conversation";
import { generateGroundedFallbackResponse, generateSmartSessionTitle, isDefaultSessionTitle } from "@/lib/rag/fallback";
import { getPlanQuota, RATE_LIMITS } from "@/lib/ratelimit";

export const maxDuration = 60;

const EXPOSED_HEADERS =
  "x-citations, x-groundedness, x-message-id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset";

export const POST = apiRoute(async (ctx) => {
  const body = parseWith(ChatSchema, await readJson(ctx.req));
  const locale = body.locale ?? ctx.locale;

  const query = [...body.messages].reverse().find((m) => m.role === "user")?.content.trim() || "";
  if (!query) throw new ApiError("MESSAGES_REQUIRED", 400);

  // 1. Authorization: readable knowledge base, and the session must belong to the caller.
  const kb = await loadReadableKb(ctx.actor, body.knowledgeBaseId);
  const session = body.chatSessionId ? await loadOwnedSession(ctx.actor, body.chatSessionId) : null;
  if (session && session.knowledgeBaseId !== kb.id) throw new ApiError("SESSION_NOT_FOUND", 404);

  // 2. Who pays? BYOK only when the caller's own key is used for the chosen provider.
  const chatRoute = resolveChatRoute({
    requested: body.modelProvider,
    byok: {
      openai: ctx.req.headers.get("x-custom-openai-key"),
      gemini: ctx.req.headers.get("x-custom-gemini-key"),
    },
    server: serverModelAvailability(),
  });

  const plan = ctx.actor.user?.plan ?? "FREE";
  let rateHeaders: Record<string, string>;
  if (chatRoute.mode === "byok") {
    rateHeaders = await ctx.rateLimit("chat-byok", RATE_LIMITS.byokChat);
  } else {
    const quota = getPlanQuota(plan);
    try {
      rateHeaders = await ctx.rateLimit("chat", { limit: quota.maxRequestsPerHour, windowSeconds: 3600 });
    } catch (err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        throw new ApiError(
          "QUOTA_CHAT",
          429,
          { limit: quota.maxRequestsPerHour, plan, seconds: err.params.seconds },
          err.headers
        );
      }
      throw err;
    }
  }

  const model = chatRoute.mode === "offline" ? null : createChatModel(chatRoute);
  const history = buildHistory(
    body.messages.filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system")
  );

  // 3. Persist the user turn (and auto-title brand new sessions).
  if (session) {
    const isFirstMessage = (await db.listChatMessages(session.id)).length === 0;
    await db.createChatMessage({ chatSessionId: session.id, role: "USER", content: query });
    if (isFirstMessage && isDefaultSessionTitle(session.title)) {
      await db.renameChatSession(session.id, generateSmartSessionTitle(query, locale));
    }
  }

  // 4. Retrieval with a standalone version of follow-up questions.
  const retrievalQuery = await condenseQuery(history, query, model);
  const searchResult = await performSemanticSearch({
    knowledgeBaseId: kb.id,
    query: retrievalQuery,
    searchMode: body.searchMode,
    threshold: body.similarityThreshold,
    topK: body.topK,
    filterDocumentIds: body.filterDocumentIds ?? undefined,
    enableReranking: body.enableReranking,
  });

  const assistantMessageId = crypto.randomUUID();
  const baseHeaders: Record<string, string> = {
    ...rateHeaders,
    "x-citations": encodeURIComponent(JSON.stringify(searchResult.citations)),
    "Access-Control-Expose-Headers": EXPOSED_HEADERS,
    ...(session ? { "x-message-id": assistantMessageId } : {}),
  };

  const persistAnswer = async (text: string) => {
    if (!session || !text) return;
    try {
      await db.createChatMessage({
        id: assistantMessageId,
        chatSessionId: session.id,
        role: "ASSISTANT",
        content: text,
        citations: searchResult.citations,
        groundedness: evaluateGroundedness(text, searchResult.citations, searchResult.chunks),
      });
    } catch (err) {
      console.error("[API Chat] Failed to persist assistant message:", err);
    }
  };

  // 5a. LLM generation with conversation memory.
  if (model) {
    const { systemPrompt, userPrompt } = buildStrictGroundingPrompt(query, searchResult.chunks, locale);
    const messages: ModelMessage[] = [
      ...history.map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
      { role: "user", content: userPrompt },
    ];
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => persistAnswer(text),
      onError: ({ error }) => console.error("[API Chat] Model stream error:", error),
    });
    return result.toTextStreamResponse({ headers: baseHeaders });
  }

  // 5b. Offline / no API key: deterministic grounded summary, streamed word by word.
  const simulated = generateGroundedFallbackResponse(query, searchResult.chunks, searchResult.hasContext, locale);
  const groundedness = evaluateGroundedness(simulated, searchResult.citations, searchResult.chunks);
  await persistAnswer(simulated);

  const encoder = new TextEncoder();
  const words = simulated.split(" ");
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i++) {
        controller.enqueue(encoder.encode(i === 0 ? words[i] : ` ${words[i]}`));
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...baseHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "x-groundedness": encodeURIComponent(JSON.stringify(groundedness)),
    },
  });
});
