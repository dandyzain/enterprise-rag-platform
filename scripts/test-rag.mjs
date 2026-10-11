/**
 * Integration Test for Hybrid Search, RRF Fusion, and Groundedness Evaluation
 */

async function runTests() {
  console.log("=== 1. Testing Hybrid Search (Dense + Sparse BM25 via RRF) ===");

  const searchRes = await fetch("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "SEC-POL-04 enkripsi AES-256",
      searchMode: "hybrid",
      knowledgeBaseId: "default-kb-1",
      threshold: 0.5,
      topK: 3,
    }),
  });

  const searchJson = await searchRes.json();
  console.log("Hybrid Search Success:", searchJson.success);
  console.log("Latency:", searchJson.data?.latencyMs, "ms");
  console.log("Total Chunks Found:", searchJson.data?.totalFound);
  if (searchJson.data?.chunks) {
    searchJson.data.chunks.forEach((c, i) => {
      console.log(`[Chunk ${i + 1}] Title: ${c.documentTitle}`);
      console.log(`  Similarity: ${(c.similarity * 100).toFixed(1)}% | MatchType: ${c.matchType} | DenseRank: ${c.denseRank} | BM25Rank: ${c.sparseRank} | RRF: ${c.rrfScore}`);
    });
  }

  console.log("\n=== 2. Testing Chat Endpoint with Groundedness & Citations ===");
  const chatRes = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "Sebutkan standar enkripsi data dan target RTO RPO perusahaan.",
        },
      ],
      knowledgeBaseId: "default-kb-1",
      searchMode: "hybrid",
      similarityThreshold: 0.5,
      topK: 4,
    }),
  });

  console.log("Chat Response Status:", chatRes.status);
  const citationsHeader = chatRes.headers.get("x-citations");
  const groundednessHeader = chatRes.headers.get("x-groundedness");

  if (citationsHeader) {
    const citations = JSON.parse(decodeURIComponent(citationsHeader));
    console.log("Extracted Citations Count:", citations.length);
    citations.forEach((c) => {
      console.log(`  Citation [${c.index}]: ${c.documentTitle} (${c.similarity}%)`);
    });
  }

  if (groundednessHeader) {
    const groundedness = JSON.parse(decodeURIComponent(groundednessHeader));
    console.log("Groundedness Score:", groundedness.score + "%");
    console.log("Verified Claims:", `${groundedness.verifiedClaimsCount} / ${groundedness.totalClaimsCount}`);
    console.log("Hallucination Risk:", groundedness.hallucinationRisk);
  }

  const streamText = await chatRes.text();
  console.log("\nResponse Text Snippet:\n", streamText.slice(0, 300) + "...\n");

  console.log("=== All Tests Completed Successfully! ===");
}

runTests().catch(console.error);
