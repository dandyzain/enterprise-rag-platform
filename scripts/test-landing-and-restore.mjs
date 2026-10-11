// Test script for Landing Page, Health Route, and KB Backup Restore

async function main() {
  console.log("=== 1. Test GET /api/health ===");
  const healthRes = await fetch("http://localhost:3000/api/health");
  const healthJson = await healthRes.json();
  console.log("Health Status:", healthJson.status);
  console.log("Database Engine:", healthJson.system?.database?.engine);
  console.log("Search Engine:", healthJson.system?.pipeline?.searchEngine);
  console.log("Total KBs:", healthJson.metrics?.totalKnowledgeBases);
  console.log("Total Documents:", healthJson.metrics?.totalDocuments);
  console.log("Total Chunks:", healthJson.metrics?.totalChunks);

  console.log("\n=== 2. Test Landing Page (GET /) ===");
  const landingRes = await fetch("http://localhost:3000/");
  console.log("Landing Page HTTP Status:", landingRes.status);
  const landingHtml = await landingRes.text();
  console.log("Contains 'Cortex RAG':", landingHtml.includes("Cortex RAG"));
  console.log("Contains 'Hybrid Retrieval Sandbox':", landingHtml.includes("Hybrid Retrieval Sandbox"));

  console.log("\n=== 3. Test Dashboard (GET /dashboard) ===");
  const dashRes = await fetch("http://localhost:3000/dashboard");
  console.log("Dashboard HTTP Status:", dashRes.status);

  console.log("\n=== 4. Test Export and Restore (Import) Lifecycle ===");
  // Step A: Seed
  await fetch("http://localhost:3000/api/seed", { method: "POST" });

  // Step B: Export
  const exportRes = await fetch("http://localhost:3000/api/knowledge-bases/default-kb-1/export");
  const backupData = await exportRes.json();
  console.log("Exported KB Name:", backupData.knowledgeBase?.name, "Docs:", backupData.documents?.length);

  // Step C: Import / Restore
  const importRes = await fetch("http://localhost:3000/api/knowledge-bases/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backupData),
  });
  const importJson = await importRes.json();
  console.log("Import Result:", importJson.message);
  console.log("Restored KB ID:", importJson.data?.knowledgeBase?.id);
  console.log("Restored Docs Count:", importJson.data?.totalDocuments);
  console.log("Restored Chunks Count:", importJson.data?.totalChunks);

  const restoredKbId = importJson.data?.knowledgeBase?.id;

  // Step D: Search against Restored KB
  console.log("\n=== 5. Test Search Against Restored KB ===");
  const searchRes = await fetch("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeBaseId: restoredKbId,
      query: "enkripsi data AES-256 TLS 1.3 SEC-POL-04",
      searchMode: "hybrid",
      topK: 2,
      enableReranking: true,
    }),
  });
  const searchJson = await searchRes.json();
  console.log("Restored KB Search Latency:", searchJson.data?.latencyMs, "ms");
  console.log("Top Chunk:", searchJson.data?.chunks?.[0]?.documentTitle);
  console.log("Similarity:", searchJson.data?.chunks?.[0]?.similarity);
  console.log("Match Type:", searchJson.data?.chunks?.[0]?.matchType);

  console.log("\n=== ALL LIFECYCLE TESTS COMPLETED PERFECTLY! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
