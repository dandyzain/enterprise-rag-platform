async function testScoping() {
  console.log("=== Testing Document Scoping & Filtering ===");

  // 1. Fetch documents to get IDs
  const docsRes = await fetch("http://localhost:3000/api/documents?kbId=default-kb-1");
  const docsJson = await docsRes.json();
  const docs = docsJson.data.documents;
  console.log("Found documents in KB:", docs.map(d => `${d.title} (${d.id})`));

  const devOpsDoc = docs.find(d => d.title.includes("DEV-GUIDE"));
  if (!devOpsDoc) throw new Error("DEV-GUIDE doc not found");

  console.log(`\nTesting scoped search strictly to document: ${devOpsDoc.title}`);
  const searchRes = await fetch("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "standar pipeline deployment dan testing",
      searchMode: "hybrid",
      knowledgeBaseId: "default-kb-1",
      filterDocumentIds: [devOpsDoc.id],
      enableReranking: true,
      threshold: 0.3,
      topK: 3,
    }),
  });

  const searchJson = await searchRes.json();
  console.log("Scoped Search Success:", searchJson.success);
  console.log("Returned Chunks Count:", searchJson.data.chunks.length);
  searchJson.data.chunks.forEach((c, i) => {
    console.log(`[Chunk ${i + 1}] Title: ${c.documentTitle} | ReRank: #${c.reRank || 1} | Similarity: ${(c.similarity * 100).toFixed(1)}%`);
  });

  const allDevOps = searchJson.data.chunks.every(c => c.documentId === devOpsDoc.id);
  console.log("Strict Scoping Verified:", allDevOps ? "PASSED (100% scoped to selected doc)" : "FAILED");
}

testScoping().catch(console.error);
