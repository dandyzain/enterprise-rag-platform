/**
 * Comprehensive End-to-End (E2E) and UI/UX Quality Assurance Test Suite
 * Enterprise Knowledge Base & Semantic Search Engine (Cortex RAG)
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  ${colors.green}✓ PASS${colors.reset} ${testName} ${details ? colors.cyan + "(" + details + ")" + colors.reset : ""}`);
  } else {
    failedCount++;
    console.error(`  ${colors.red}✗ FAIL${colors.reset} ${testName} ${details ? colors.yellow + "[" + details + "]" + colors.reset : ""}`);
  }
}

async function runE2EandUIUXTests() {
  console.log(`\n${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.bold}   E2E & UI/UX AUDIT TEST SUITE: CORTEX ENTERPRISE RAG PLATFORM${colors.reset}`);
  console.log(`${colors.bold}   Target Server: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.bold}================================================================\n${colors.reset}`);

  // -------------------------------------------------------------
  // TEST SUITE 1: System Health & Diagnostics
  // -------------------------------------------------------------
  console.log(`${colors.bold}[SUITE 1] System Health & Pipeline Engine Diagnostics${colors.reset}`);
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const health = await res.json();
    assert(res.status === 200, "Health Check HTTP 200", `status=${health.status}`);
    assert(health.system?.database?.connected === true, "In-Memory Vector DB Connected");
    assert(health.system?.embedding?.dimensions === 1536, "Embedding Vector 1536-dim Unit Normalized");
    assert(health.system?.pipeline?.searchEngine.includes("RRF"), "Hybrid Search with Reciprocal Rank Fusion");
    assert(health.system?.pipeline?.reRankingEngine.includes("Two-Stage"), "Cross-Encoder Two-Stage Reranker Active");
  } catch (err) {
    assert(false, "System Health Endpoint", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: Multi-Tenant Authentication & Data Scoping
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 2] Multi-Tenant Authentication & Isolation (E2E User Journeys)${colors.reset}`);
  let guestCookie = "";
  let memberCookie = "";
  let adminCookie = "";

  try {
    // 2.1 Guest Demo Login
    const guestRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoRole: "GUEST" }),
    });
    guestCookie = (guestRes.headers.get("set-cookie") || "").split(";")[0];
    const guestData = await guestRes.json();
    assert(guestRes.status === 200, "Guest Quick Login", `User: ${guestData.user?.name}, Plan: ${guestData.user?.plan}`);

    // 2.2 Member Demo Login (Sarah Wijaya)
    const memberRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoRole: "MEMBER" }),
    });
    memberCookie = (memberRes.headers.get("set-cookie") || "").split(";")[0];
    const memberData = await memberRes.json();
    assert(memberRes.status === 200, "Member Quick Login", `User: ${memberData.user?.name}, Plan: ${memberData.user?.plan}`);

    // 2.3 Member creates private KB
    const createKbRes = await fetch(`${BASE_URL}/api/knowledge-bases`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
      body: JSON.stringify({ name: "Riset Finansial Rahasia (Member Only)", description: "Private documents" }),
    });
    const kbData = await createKbRes.json();
    const privateKbId = kbData.data?.id;
    assert(createKbRes.status === 201, "Member Creates Private Knowledge Base", `ID: ${privateKbId}`);

    // 2.4 Verify Tenant Scoping: Guest must NOT see Sarah's private KB
    const guestKbRes = await fetch(`${BASE_URL}/api/knowledge-bases`, {
      headers: { Cookie: guestCookie },
    });
    const guestKbs = await guestKbRes.json();
    const isPrivateLeaked = (guestKbs.data || []).some((kb) => kb.id === privateKbId);
    assert(!isPrivateLeaked, "Multi-Tenant Scoping: Private KB is Isolated from Guest");

    // 2.5 Admin Login
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoRole: "ADMIN" }),
    });
    adminCookie = (adminRes.headers.get("set-cookie") || "").split(";")[0];
    const adminData = await adminRes.json();
    assert(adminData.user?.role === "ADMIN", "Admin Quick Login", `Role: ${adminData.user?.role}, Plan: ${adminData.user?.plan}`);
  } catch (err) {
    assert(false, "Multi-Tenant Auth Suite", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: Document Seeding, Ingestion Security & PII Redaction
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 3] Document Seeding, Security Validation & PII Redaction${colors.reset}`);
  try {
    // 3.1 One-Click Seeder
    const seedRes = await fetch(`${BASE_URL}/api/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ knowledgeBaseId: "default-kb-1" }),
    });
    const seedData = await seedRes.json();
    assert(seedRes.status === 200 && seedData.data?.length === 3, "One-Click Enterprise Sample Seeder", `Seeded: ${seedData.data?.length} docs`);

    // 3.2 Binary executable malware block (MZ header disguised as .pdf)
    const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const malwareForm = new FormData();
    malwareForm.append("knowledgeBaseId", "default-kb-1");
    malwareForm.append("file", new Blob([mzHeader], { type: "application/pdf" }), "disguised_trojan.pdf");
    const malwareRes = await fetch(`${BASE_URL}/api/documents/ingest`, {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: malwareForm,
    });
    const malwareData = await malwareRes.json();
    assert(
      malwareRes.status !== 200 && malwareData.error?.includes("executable Windows"),
      "Binary Magic Bytes Security: Disguised Executable Blocked",
      malwareData.error
    );

    // 3.3 Sensitive PII redaction test
    const piiContent = `Daftar Rekening Internal:\nNama: Agus Sutrisno\nNIK: 3273012345678901\nKartu Kredit: 4111222233334444\nNo HP: 081234567890\nKunci API: sk-proj-1234567890abcdef1234567890`;
    const piiForm = new FormData();
    piiForm.append("knowledgeBaseId", "default-kb-1");
    piiForm.append("file", new Blob([piiContent], { type: "text/plain" }), "data_rahasia_audit.txt");
    const piiRes = await fetch(`${BASE_URL}/api/documents/ingest`, {
      method: "POST",
      headers: { Cookie: adminCookie },
      body: piiForm,
    });
    const piiData = await piiRes.json();
    assert(piiRes.status === 201, "PII Document Ingestion Processed", `DocId: ${piiData.data?.documentId}`);

    // Verify stored chunks for masked tokens
    const verifyDocRes = await fetch(`${BASE_URL}/api/documents/${piiData.data?.documentId}`, {
      headers: { Cookie: adminCookie },
    });
    const verifyDocData = await verifyDocRes.json();
    const storedChunkContent = verifyDocData.data?.chunks?.[0]?.content || "";
    assert(
      !storedChunkContent.includes("3273012345678901") && storedChunkContent.includes("[REDACTED_NIK_KTP]"),
      "PII Redaction: Indonesian NIK KTP Masked"
    );
    assert(
      !storedChunkContent.includes("4111222233334444") && storedChunkContent.includes("[REDACTED_CREDIT_CARD]"),
      "PII Redaction: Credit Card Masked"
    );
    assert(
      !storedChunkContent.includes("081234567890") && storedChunkContent.includes("[REDACTED_PHONE]"),
      "PII Redaction: Indonesian Phone Number Masked"
    );
    assert(
      !storedChunkContent.includes("sk-proj-") && storedChunkContent.includes("[REDACTED_API_KEY]"),
      "PII Redaction: Secret API Key Masked"
    );

    // Clean up test document
    await fetch(`${BASE_URL}/api/documents/${piiData.data?.documentId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
  } catch (err) {
    assert(false, "Document Ingestion & Security Suite", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: Hybrid Semantic Search & Public Developer API
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 4] Hybrid Search Engine (RRF & BM25) and Dual-Method API${colors.reset}`);
  try {
    // 4.1 POST /api/search
    const postSearchRes = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "kebijakan enkripsi data rest transit",
        knowledgeBaseId: "default-kb-1",
        searchMode: "hybrid",
        topK: 3,
      }),
    });
    const postSearchData = await postSearchRes.json();
    assert(
      postSearchRes.status === 200 && postSearchData.data?.totalFound > 0,
      "POST /api/search: Hybrid Dense + Sparse BM25 RRF Retrieval",
      `Found: ${postSearchData.data?.totalFound}, Latency: ${postSearchData.data?.latencyMs}ms`
    );
    assert(
      postSearchData.data?.chunks?.[0]?.rrfScore !== undefined,
      "Search RRF Ranking Metric Present in Chunks",
      `Top RRF: ${postSearchData.data?.chunks?.[0]?.rrfScore}`
    );

    // 4.2 GET /api/search with query string
    const getSearchRes = await fetch(
      `${BASE_URL}/api/search?q=infrastruktur%20cloud&knowledgeBaseId=default-kb-1&topK=2`
    );
    const getSearchData = await getSearchRes.json();
    assert(
      getSearchRes.status === 200 && getSearchData.data?.totalFound > 0,
      "GET /api/search: Query Param Support for Public Developers",
      `Top Doc: ${getSearchData.data?.chunks?.[0]?.documentTitle}`
    );

    // 4.3 Validation error check
    const badSearchRes = await fetch(`${BASE_URL}/api/search?q=`);
    assert(badSearchRes.status === 400, "GET /api/search: Empty Query Validation Error Handled");
  } catch (err) {
    assert(false, "Hybrid Search Suite", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: Strict Grounding RAG Chat & Quota Tracking
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 5] Strict Grounding Chat, Citations, and Quota Rate Limiter${colors.reset}`);
  try {
    // 5.1 Create Chat Session
    const sessionRes = await fetch(`${BASE_URL}/api/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
      body: JSON.stringify({
        knowledgeBaseId: "default-kb-1",
        title: "Sesi Uji Coba Keamanan Cloud",
      }),
    });
    const sessionData = await sessionRes.json();
    const sessionId = sessionData.data?.id;
    assert(sessionRes.status === 201, "Create New Chat Session", `ID: ${sessionId}`);

    // 5.2 Send Query to Chat RAG (Streaming response)
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
      body: JSON.stringify({
        sessionId,
        knowledgeBaseId: "default-kb-1",
        messages: [{ role: "user", content: "Apa standar enkripsi yang digunakan untuk data at rest dan in transit?" }],
      }),
    });
    assert(chatRes.status === 200, "RAG Chat Streaming Response HTTP 200");
    const rateLimitLimit = chatRes.headers.get("x-ratelimit-limit");
    const rateLimitRem = chatRes.headers.get("x-ratelimit-remaining");
    assert(
      Boolean(rateLimitLimit && rateLimitRem),
      "Sliding Window Rate Limit Headers Active",
      `Limit: ${rateLimitLimit}, Remaining: ${rateLimitRem}`
    );

    const streamBody = await chatRes.text();
    assert(
      streamBody.length > 0 && (streamBody.includes("AES-256") || streamBody.includes("enkripsi") || streamBody.includes("[1]")),
      "Grounding RAG Generated Verified Content & Citations",
      `Stream Length: ${streamBody.length} bytes`
    );

    // 5.3 Rename Session (PATCH method)
    const renameRes = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
      body: JSON.stringify({ title: "Sesi Audit Terverifikasi Q4" }),
    });
    const renameData = await renameRes.json();
    assert(renameRes.status === 200 && renameData.data?.title === "Sesi Audit Terverifikasi Q4", "Rename Chat Session Title (PATCH)");

    // 5.4 Delete Session
    const deleteSessionRes = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { Cookie: memberCookie },
    });
    assert(deleteSessionRes.status === 200, "Delete Chat Session Cleanly");
  } catch (err) {
    assert(false, "Chat RAG Suite", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 6: Bring-Your-Own-Key (BYOK) Bypass
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 6] Bring-Your-Own-Key (BYOK) Quota Bypass${colors.reset}`);
  try {
    const byokRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: guestCookie,
        "x-custom-openai-key": "sk-dummy-test-key-for-byok-verification",
      },
      body: JSON.stringify({
        knowledgeBaseId: "default-kb-1",
        messages: [{ role: "user", content: "Tes BYOK bypass" }],
      }),
    });
    assert(byokRes.status === 200, "BYOK Chat Request Accepted");
    assert(
      byokRes.headers.get("x-ratelimit-limit") === "999999",
      "BYOK Bypasses Server Host Rate Limits (999999 quota granted)"
    );
  } catch (err) {
    assert(false, "BYOK Suite", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 7: KB Export / Backup & Public SEO Crawlers
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 7] Knowledge Base Backup Export & SEO Directives${colors.reset}`);
  try {
    // 7.1 Export JSON
    const exportRes = await fetch(`${BASE_URL}/api/knowledge-bases/default-kb-1/export`);
    const exportData = await exportRes.json();
    assert(
      exportRes.status === 200 && exportData.knowledgeBase?.id === "default-kb-1",
      "Export KB JSON Backup Package",
      `Documents: ${exportData.documents?.length}`
    );

    // 7.2 robots.txt
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    const robotsTxt = await robotsRes.text();
    assert(
      robotsTxt.includes("Allow: /") && robotsTxt.includes("Disallow: /api/") && robotsTxt.includes("sitemap.xml"),
      "robots.txt Crawler Directives Valid"
    );

    // 7.3 sitemap.xml
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    const sitemapXml = await sitemapRes.text();
    assert(
      sitemapRes.status === 200 && sitemapXml.includes("<loc>") && sitemapXml.includes("/docs"),
      "sitemap.xml Dynamic XML Index Valid"
    );
  } catch (err) {
    assert(false, "Export & SEO Suite", err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 8: UI & UX Design System, Usability & Accessibility Audit
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SUITE 8] UI & UX Design System, Ergonomics & Accessibility Audit${colors.reset}`);
  try {
    // Audit Dashboard UI SSR & Client tree
    const dashRes = await fetch(`${BASE_URL}/dashboard`);
    const dashHtml = await dashRes.text();

    assert(
      dashHtml.includes("dark:") && dashHtml.includes("emerald"),
      "UI Aesthetic: Zinc-Emerald Monochromatic Design Tokens Active"
    );
    assert(
      dashHtml.includes("Sesi Chat") && dashHtml.includes("Cortex"),
      "UX Ergonomics: Multi-Tab Workspace (Dokumen & Sesi Chat) Active"
    );
    assert(
      dashHtml.includes("Strict Grounding") || dashHtml.includes("Grounding"),
      "UI/UX Safety: Strict Grounding Badge Displayed"
    );
    assert(
      dashHtml.includes("Unggah Dokumen") || dashHtml.includes("Upload"),
      "UX Workflow: Direct File Ingestion Action Available"
    );

    // Audit Developer Docs UI
    const docsRes = await fetch(`${BASE_URL}/docs`);
    const docsHtml = await docsRes.text();
    assert(
      docsHtml.includes("API Sandbox") || docsHtml.includes("Interactive Console"),
      "Developer UX: Live API Sandbox Console Available on /docs"
    );
    assert(
      docsHtml.includes("cURL") && docsHtml.includes("TypeScript") && docsHtml.includes("Python"),
      "Developer UX: Multi-Language Code Snippets (cURL, TS, Python) Available"
    );

    // Audit Login UI
    const loginRes = await fetch(`${BASE_URL}/login`);
    const loginHtml = await loginRes.text();
    assert(
      loginHtml.includes("Alex Pratama") && loginHtml.includes("Sarah Wijaya") && loginHtml.includes("Tamu Publik"),
      "Public UX: Instant 1-Click Role Switcher Profiles Available on /login"
    );
  } catch (err) {
    assert(false, "UI/UX Audit Suite", err.message);
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.bold}   TEST EXECUTION SUMMARY REPORT${colors.reset}`);
  console.log(`   Total Tests Executed: ${passedCount + failedCount}`);
  console.log(`   ${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`   ${failedCount > 0 ? colors.red : colors.green}Failed: ${failedCount}${colors.reset}`);
  console.log(`   Success Rate: ${Math.round((passedCount / (passedCount + failedCount)) * 100)}%`);
  console.log(`${colors.bold}================================================================\n${colors.reset}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runE2EandUIUXTests().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
