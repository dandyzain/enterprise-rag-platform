import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { performSemanticSearch } from "@/lib/rag/search";
import { buildStrictGroundingPrompt } from "@/lib/rag/prompt";
import { evaluateGroundedness } from "@/lib/rag/evaluator";
import { SearchMode } from "@/lib/rag/types";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      knowledgeBaseId = "default-kb-1",
      chatSessionId,
      modelProvider = "openai",
      searchMode = "hybrid" as SearchMode,
      similarityThreshold = 0.65,
      topK = 5,
      filterDocumentIds,
      enableReranking = true,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Riwayat pesan (messages array) tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Extract the latest query from user
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const query = lastUserMessage?.content || "";

    // Persist user message if session is active
    if (chatSessionId && query) {
      try {
        await db.createChatMessage({
          chatSessionId,
          role: "USER",
          content: query,
        });
      } catch (err) {
        console.warn("[API Chat] Failed to save user message to session:", err);
      }
    }

    // 1. Perform Hybrid / Semantic Search (Dense + Sparse BM25 via RRF) with Re-Ranking
    const searchResult = await performSemanticSearch({
      knowledgeBaseId,
      query,
      searchMode,
      threshold: similarityThreshold,
      topK,
      filterDocumentIds: Array.isArray(filterDocumentIds) ? filterDocumentIds : undefined,
      enableReranking,
    });

    // 2. Build Strict Grounding Prompt with Citations
    const { systemPrompt, userPrompt } = buildStrictGroundingPrompt(
      query,
      searchResult.chunks
    );

    // Citations header JSON for frontend slide-over sheet
    const citationsHeader = JSON.stringify(searchResult.citations);

    // 3. Check for API keys: OpenAI or Google Gemini
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    if (hasOpenAI || hasGemini) {
      const selectedModel =
        modelProvider === "google" && hasGemini
          ? google("gemini-1.5-flash")
          : hasOpenAI
          ? openai("gpt-4o-mini")
          : google("gemini-1.5-flash");

      const result = streamText({
        model: selectedModel,
        system: systemPrompt,
        prompt: userPrompt,
        onFinish: async ({ text }) => {
          if (chatSessionId && text) {
            try {
              const groundedness = evaluateGroundedness(
                text,
                searchResult.citations,
                searchResult.chunks
              );
              await db.createChatMessage({
                chatSessionId,
                role: "ASSISTANT",
                content: text,
                citations: searchResult.citations,
                groundedness,
              });
            } catch (err) {
              console.warn("[API Chat] Failed to save assistant message onFinish:", err);
            }
          }
        },
      });

      return result.toTextStreamResponse({
        headers: {
          "x-citations": encodeURIComponent(citationsHeader),
          "Access-Control-Expose-Headers": "x-citations, x-groundedness",
        },
      });
    }

    // 4. Intelligent Local Streaming Fallback (when running offline / demo without external API keys)
    const simulatedResponse = generateGroundedFallbackResponse(
      query,
      searchResult.chunks,
      searchResult.hasContext
    );

    // Evaluate Groundedness
    const groundedness = evaluateGroundedness(
      simulatedResponse,
      searchResult.citations,
      searchResult.chunks
    );
    const groundednessHeader = JSON.stringify(groundedness);

    // Persist assistant message in fallback
    if (chatSessionId) {
      try {
        await db.createChatMessage({
          chatSessionId,
          role: "ASSISTANT",
          content: simulatedResponse,
          citations: searchResult.citations,
          groundedness,
        });
      } catch (err) {
        console.warn("[API Chat] Failed to save fallback assistant message:", err);
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = simulatedResponse.split(" ");
        for (let i = 0; i < words.length; i++) {
          const piece = i === 0 ? words[i] : ` ${words[i]}`;
          controller.enqueue(encoder.encode(piece));
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-citations": encodeURIComponent(citationsHeader),
        "x-groundedness": encodeURIComponent(groundednessHeader),
        "Access-Control-Expose-Headers": "x-citations, x-groundedness",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Chat] Error generating RAG stream:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan internal saat memproses jawaban RAG." },
      { status: 500 }
    );
  }
}

function generateGroundedFallbackResponse(
  query: string,
  chunks: Array<{ content: string; pageNumber: number | null; documentTitle: string }>,
  hasContext: boolean
): string {
  if (!hasContext || chunks.length === 0) {
    return `Maaf, informasi mengenai "${query}" tidak ditemukan dalam dokumen yang diindeks pada Knowledge Base saat ini. Mohon pastikan dokumen PDF atau file terkait telah diunggah dan dianalisis.`;
  }

  // Extract core takeaways from the top chunks with citations
  const citePoints = chunks
    .slice(0, 3)
    .map((c, idx) => {
      const citeNum = idx + 1;
      const snippet = c.content.split("\n")[0].slice(0, 150).trim();
      const page = c.pageNumber ? `(Halaman ${c.pageNumber})` : "";
      return `• Berdasarkan dokumen **${c.documentTitle}** ${page}: "${snippet}..." [${citeNum}]`;
    })
    .join("\n\n");

  return `Berdasarkan analisis semantik terhadap dokumen dalam Knowledge Base Anda, berikut adalah poin-poin yang relevan terkait pertanyaan Anda:\n\n${citePoints}\n\nSemua rincian di atas diekstraksi secara langsung dari data vektor terindeks dengan ambang kemiripan kosinus (cosine similarity threshold) >= 0.65. Anda dapat mengklik tombol sitasi [1], [2], atau [3] untuk meninjau paragraf asli pada panel samping.`;
}
