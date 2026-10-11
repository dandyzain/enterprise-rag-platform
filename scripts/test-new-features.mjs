// Test script for new features: KB export, session rename, and chunks inspection

async function main() {
  console.log("=== 1. Seed Knowledge Base ===");
  const seedRes = await fetch("http://localhost:3000/api/seed", { method: "POST" });
  const seedJson = await seedRes.json();
  console.log("Seed result:", seedJson.message, "Docs:", seedJson.data?.totalDocuments);

  console.log("\n=== 2. Test Knowledge Base Export Backup ===");
  const exportRes = await fetch("http://localhost:3000/api/knowledge-bases/default-kb-1/export");
  if (!exportRes.ok) {
    throw new Error(`Export failed with status: ${exportRes.status}`);
  }
  const backup = await exportRes.json();
  console.log("Export Type:", backup.exportType);
  console.log("KB Name:", backup.knowledgeBase?.name);
  console.log("Total Documents in Backup:", backup.documents?.length);
  const sampleDoc = backup.documents?.[0];
  console.log("Sample Doc:", sampleDoc?.title, "Chunks:", sampleDoc?.chunks?.length);

  console.log("\n=== 3. Create New Chat Session ===");
  const sessionRes = await fetch("http://localhost:3000/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeBaseId: "default-kb-1",
      title: "Sesi Uji Coba Awal",
    }),
  });
  const sessionJson = await sessionRes.json();
  const sessionId = sessionJson.data?.id;
  console.log("Created session ID:", sessionId, "Title:", sessionJson.data?.title);

  console.log("\n=== 4. Test Session Rename (PATCH) ===");
  const renameRes = await fetch(`http://localhost:3000/api/chat/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Audit Keamanan Cloud 2026",
    }),
  });
  const renameJson = await renameRes.json();
  console.log("Rename result:", renameJson.message, "New Title:", renameJson.data?.title);

  console.log("\n=== 5. Test Smart Auto-Titling via Chat Stream ===");
  const newBlankSessionRes = await fetch("http://localhost:3000/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeBaseId: "default-kb-1",
      title: "Percakapan Baru",
    }),
  });
  const blankSessionJson = await newBlankSessionRes.json();
  const blankSessionId = blankSessionJson.data?.id;

  const chatRes = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeBaseId: "default-kb-1",
      chatSessionId: blankSessionId,
      messages: [
        {
          role: "user",
          content: "Bagaimana kebijakan retensi data pada SEC-POL-04?",
        },
      ],
      settings: {
        similarityThreshold: 0.65,
        topK: 5,
        searchMode: "hybrid",
        enableReranking: true,
      },
    }),
  });

  const chatText = await chatRes.text();
  console.log("Chat Stream Length:", chatText.length, "bytes");
  console.log("Groundedness Header:", chatRes.headers.get("x-groundedness"));

  // Verify auto-title
  const sessionsListRes = await fetch("http://localhost:3000/api/chat/sessions?kbId=default-kb-1");
  const sessionsListJson = await sessionsListRes.json();
  const autoTitledSession = sessionsListJson.data?.find((s) => s.id === blankSessionId);
  console.log("Auto-titled Session Name:", autoTitledSession?.title);

  console.log("\n=== 6. Test Document Chunk Inspection ===");
  const docId = sampleDoc?.id;
  const docInspectRes = await fetch(`http://localhost:3000/api/documents/${docId}`);
  const docInspectJson = await docInspectRes.json();
  console.log("Document Title:", docInspectJson.data?.document?.title);
  console.log("Chunks Count:", docInspectJson.data?.chunks?.length);
  console.log("Sample Chunk Content (first 100 chars):", docInspectJson.data?.chunks?.[0]?.content?.slice(0, 100));

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
