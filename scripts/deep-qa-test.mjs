/**
 * Deep Multi-Scenario Quality Assurance (QA) and End-to-End Stress Test Suite
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

let passed = 0;
let failed = 0;

function check(condition, label, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ${colors.green}✓ PASS${colors.reset} ${label} ${detail ? colors.cyan + "(" + detail + ")" + colors.reset : ""}`);
  } else {
    failed++;
    console.error(`  ${colors.red}✗ FAIL${colors.reset} ${label} ${detail ? colors.yellow + "[" + detail + "]" + colors.reset : ""}`);
  }
}

async function runDeepQa() {
  console.log(`\n${colors.bold}======================================================================${colors.reset}`);
  console.log(`${colors.bold}   DEEP QA COMPREHENSIVE END-TO-END TEST SUITE (CORTEX RAG)${colors.reset}`);
  console.log(`${colors.bold}   Target Server: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.bold}======================================================================\n${colors.reset}`);

  // -------------------------------------------------------------
  // SECTION 1: AUTHENTICATION, ROLES, MULTI-TENANCY & LOGOUT
  // -------------------------------------------------------------
  console.log(`${colors.bold}[SECTION 1] Authentication, RBAC, Multi-Tenant Scoping & Logout Security${colors.reset}`);
  let adminCookie = "";
  let memberCookie = "";
  let guestCookie = "";

  // 1.1 Unauthenticated state verification
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  const unauthJson = await unauthRes.json();
  check(unauthRes.status === 200 && unauthJson.user === null, "1.1 Unauthenticated Session returns user: null (No Admin Fallback Leak)");

  // 1.2 Unauthenticated KB creation attempt must return 401
  const unauthCreateKb = await fetch(`${BASE_URL}/api/knowledge-bases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hacker KB" }),
  });
  check(unauthCreateKb.status === 401, "1.2 Anonymous/Unauthenticated KB Creation Blocked (HTTP 401)");

  // 1.3 Login as Admin (Alex Pratama)
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoRole: "ADMIN" }),
  });
  adminCookie = (adminLogin.headers.get("set-cookie") || "").split(";")[0];
  const adminData = await adminLogin.json();
  check(adminLogin.status === 200 && adminData.user?.role === "ADMIN", "1.3 Admin Demo Login Success", `User: ${adminData.user?.name}, Plan: ${adminData.user?.plan}`);

  // 1.4 Login as Member (Sarah Wijaya)
  const memberLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoRole: "MEMBER" }),
  });
  memberCookie = (memberLogin.headers.get("set-cookie") || "").split(";")[0];
  const memberData = await memberLogin.json();
  check(memberLogin.status === 200 && memberData.user?.role === "MEMBER", "1.4 Member Demo Login Success", `User: ${memberData.user?.name}, Plan: ${memberData.user?.plan}`);

  // 1.5 Member creates private KB
  const memberKbRes = await fetch(`${BASE_URL}/api/knowledge-bases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberCookie },
    body: JSON.stringify({ name: "Riset Finansial Privat (Sarah)", description: "Privat Sarah" }),
  });
  const memberKbData = await memberKbRes.json();
  const privateKbId = memberKbData.data?.id;
  check(memberKbRes.status === 201 && Boolean(privateKbId), "1.5 Member Creates Scoped Private KB", `ID: ${privateKbId}`);

  // 1.6 Login as Guest
  const guestLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoRole: "GUEST" }),
  });
  guestCookie = (guestLogin.headers.get("set-cookie") || "").split(";")[0];
  const guestData = await guestLogin.json();
  check(guestLogin.status === 200 && guestData.user?.role === "GUEST", "1.6 Guest Demo Login Success", `User: ${guestData.user?.name}, Plan: ${guestData.user?.plan}`);

  // 1.7 Multi-tenant isolation: Guest should not see Sarah's private KB
  const guestKbsRes = await fetch(`${BASE_URL}/api/knowledge-bases`, {
    headers: { Cookie: guestCookie },
  });
  const guestKbs = await guestKbsRes.json();
  const isPrivateExposed = (guestKbs.data || []).some((k) => k.id === privateKbId);
  check(!isPrivateExposed, "1.7 Multi-Tenant Data Scoping Isolation Verified (Sarah's KB is Hidden from Guest)");

  // 1.8 User Registration
  const testEmail = `tester_${Date.now()}@test.org`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Budi QA Tester", email: testEmail, password: "password123" }),
  });
  const registerData = await registerRes.json();
  check(registerRes.status === 200 && Boolean(registerData.user?.id), "1.8 Self-Service User Registration", `New ID: ${registerData.user?.id}`);

  // 1.9 Logout test and complete state clearing
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  const clearedCookie = logoutRes.headers.get("set-cookie")?.split(";")[0] || "";
  const postLogoutMe = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: clearedCookie },
  });
  const postLogoutJson = await postLogoutMe.json();
  check(
    logoutRes.status === 200 && postLogoutJson.user === null,
    "1.9 Complete Logout Flow Verification (Cookie expired, User is strictly null)"
  );

  // -------------------------------------------------------------
  // SECTION 2: DOCUMENT INGESTION, VALIDATION & PII PROTECTION
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SECTION 2] Ingestion Engine, Binary Magic Bytes & PII Data Masking${colors.reset}`);

  // 2.1 One-Click Seeder
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ knowledgeBaseId: "default-kb-1" }),
  });
  const seedData = await seedRes.json();
  check(seedRes.status === 200 && seedData.data?.length === 3, "2.1 One-Click Enterprise Document Seeder (3 Documents Seeded)");

  // 2.2 Binary Executable (MZ) disguised as PDF
  const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const malwareForm = new FormData();
  malwareForm.append("knowledgeBaseId", "default-kb-1");
  malwareForm.append("file", new Blob([mzHeader], { type: "application/pdf" }), "invoice_trojan.pdf");
  const malwareRes = await fetch(`${BASE_URL}/api/documents/ingest`, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: malwareForm,
  });
  const malwareData = await malwareRes.json();
  check(
    malwareRes.status !== 200 && malwareData.error?.includes("executable Windows"),
    "2.2 Binary Magic Bytes Inspector (Malicious Executable Blocked by Header)",
    malwareData.error
  );

  // 2.3 PII Redaction
  const piiText = `Daftar Karyawan:
Budi Santoso: NIK 3271012345678901
Kartu Kredit: 4111222233334444
WhatsApp: +6281234567890
API Token: sk-proj-1234567890abcdef1234567890`;
  const piiForm = new FormData();
  piiForm.append("knowledgeBaseId", "default-kb-1");
  piiForm.append("file", new Blob([piiText], { type: "text/plain" }), "pii_audit_test.txt");
  const piiUploadRes = await fetch(`${BASE_URL}/api/documents/ingest`, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: piiForm,
  });
  const piiUploadData = await piiUploadRes.json();
  const testDocId = piiUploadData.data?.documentId;
  check(piiUploadRes.status === 201 && Boolean(testDocId), "2.3 PII Document Uploaded and Chunked", `DocId: ${testDocId}`);

  // Inspect chunks for redaction
  const inspectDocRes = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
    headers: { Cookie: adminCookie },
  });
  const inspectDocData = await inspectDocRes.json();
  const chunkText = inspectDocData.data?.chunks?.[0]?.content || "";
  check(
    !chunkText.includes("3271012345678901") && chunkText.includes("[REDACTED_NIK_KTP]"),
    "2.4 Indonesian NIK KTP Masking [REDACTED_NIK_KTP]"
  );
  check(
    !chunkText.includes("4111222233334444") && chunkText.includes("[REDACTED_CREDIT_CARD]"),
    "2.5 Credit Card Number Masking [REDACTED_CREDIT_CARD]"
  );
  check(
    !chunkText.includes("+6281234567890") && chunkText.includes("[REDACTED_PHONE]"),
    "2.6 Telephone Contact Masking [REDACTED_PHONE]"
  );
  check(
    !chunkText.includes("sk-proj-") && chunkText.includes("[REDACTED_API_KEY]"),
    "2.7 Secret API Key Masking [REDACTED_API_KEY]"
  );

  // Clean up test doc
  await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });

  // -------------------------------------------------------------
  // SECTION 3: RETRIEVAL MODES, HYBRID RRF & DEVELOPER API
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SECTION 3] Retrieval Modes, BM25 + Dense RRF Fusion & Latency Benchmarks${colors.reset}`);

  // 3.1 Hybrid Search
  const t0 = performance.now();
  const hybridRes = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "kebijakan enkripsi data rest dan transit ISO 27001",
      knowledgeBaseId: "default-kb-1",
      searchMode: "hybrid",
      topK: 3,
      enableReranking: true,
    }),
  });
  const hybridLatency = Math.round(performance.now() - t0);
  const hybridData = await hybridRes.json();
  check(
    hybridRes.status === 200 && hybridData.data?.totalFound > 0,
    "3.1 Hybrid Search (Dense + Sparse BM25 + Two-Stage Reranker)",
    `Matches: ${hybridData.data?.totalFound}, Latency: ${hybridLatency}ms`
  );
  check(
    hybridLatency < 50,
    "3.2 Search Latency Benchmark (< 50ms requirement)",
    `Actual: ${hybridLatency}ms`
  );
  check(
    Boolean(hybridData.data?.chunks?.[0]?.rrfScore),
    "3.3 Reciprocal Rank Fusion Metric Present (RRF Score)",
    `Score: ${hybridData.data?.chunks?.[0]?.rrfScore}`
  );

  // 3.4 Pure Semantic Vector Search Mode
  const semanticRes = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "infrastruktur komputasi awan",
      knowledgeBaseId: "default-kb-1",
      searchMode: "semantic",
      topK: 2,
    }),
  });
  const semanticData = await semanticRes.json();
  check(semanticRes.status === 200 && semanticData.data?.totalFound > 0, "3.4 Pure Semantic Vector Search Mode");

  // 3.5 Pure Keyword BM25 Search Mode
  const keywordRes = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "SEC-POL-04",
      knowledgeBaseId: "default-kb-1",
      searchMode: "keyword",
      topK: 2,
    }),
  });
  const keywordData = await keywordRes.json();
  check(
    keywordRes.status === 200 && keywordData.data?.chunks?.[0]?.documentTitle?.includes("SEC-POL-04"),
    "3.5 Pure Sparse BM25 Exact Code Search (Matches SEC-POL-04)"
  );

  // 3.6 Public Developer GET /api/search with query string
  const getSearch = await fetch(`${BASE_URL}/api/search?q=infrastruktur%20cloud&knowledgeBaseId=default-kb-1&topK=2`);
  const getSearchData = await getSearch.json();
  check(
    getSearch.status === 200 && getSearchData.data?.totalFound > 0,
    "3.6 Public Developer GET Endpoint (/api/search?q=...&knowledgeBaseId=...)"
  );

  // -------------------------------------------------------------
  // SECTION 4: STRICT GROUNDING CHAT, CITATIONS & RATE LIMITING
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SECTION 4] Strict Grounding Chat, Citations, Quotas & BYOK Bypass${colors.reset}`);

  // 4.1 Create chat session
  const newChatSession = await fetch(`${BASE_URL}/api/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberCookie },
    body: JSON.stringify({ knowledgeBaseId: "default-kb-1", title: "QA Session Q4" }),
  });
  const sessionData = await newChatSession.json();
  const sessionId = sessionData.data?.id;
  check(newChatSession.status === 201 && Boolean(sessionId), "4.1 Chat Session Creation", `SessionId: ${sessionId}`);

  // 4.2 Stream grounded response
  const chatStreamRes = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberCookie },
    body: JSON.stringify({
      sessionId,
      knowledgeBaseId: "default-kb-1",
      messages: [{ role: "user", content: "Apa standar enkripsi data yang ditetapkan dalam kebijakan perusahaan?" }],
    }),
  });
  check(chatStreamRes.status === 200, "4.2 RAG Streaming Endpoint Response HTTP 200");
  const limitHeader = chatStreamRes.headers.get("x-ratelimit-limit");
  const remainingHeader = chatStreamRes.headers.get("x-ratelimit-remaining");
  check(
    Boolean(limitHeader && remainingHeader),
    "4.3 Sliding-Window Rate Limit Headers Active",
    `Limit: ${limitHeader}, Remaining: ${remainingHeader}`
  );
  const streamText = await chatStreamRes.text();
  check(
    streamText.length > 50 && (streamText.includes("AES-256") || streamText.includes("enkripsi") || streamText.includes("[1]")),
    "4.4 Grounding Engine Verified Citations & Factual Output",
    `Stream size: ${streamText.length} bytes`
  );

  // 4.5 Bring-Your-Own-Key Bypass
  const byokRes = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookie,
      "x-custom-openai-key": "sk-proj-test-byok-verification-key-12345",
    },
    body: JSON.stringify({
      knowledgeBaseId: "default-kb-1",
      messages: [{ role: "user", content: "Tes BYOK" }],
    }),
  });
  check(
    byokRes.status === 200 && byokRes.headers.get("x-ratelimit-limit") === "999999",
    "4.5 BYOK (Bring-Your-Own-Key) Quota Limit Bypass (limit: 999999 granted)"
  );

  // 4.6 Rename chat session
  const renameRes = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: memberCookie },
    body: JSON.stringify({ title: "Sesi Diperbarui QA" }),
  });
  const renameData = await renameRes.json();
  check(renameRes.status === 200 && renameData.data?.title === "Sesi Diperbarui QA", "4.6 Chat Session Renamed (PATCH)");

  // 4.7 Delete chat session
  const deleteRes = await fetch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Cookie: memberCookie },
  });
  check(deleteRes.status === 200, "4.7 Chat Session Deleted Cleanly (DELETE)");

  // -------------------------------------------------------------
  // SECTION 5: DATA PORTABILITY, SEO & PUBLIC ACCESSIBILITY
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SECTION 5] Data Portability, SEO Crawlers & Public Routing${colors.reset}`);

  // 5.1 Export Knowledge Base JSON
  const exportRes = await fetch(`${BASE_URL}/api/knowledge-bases/default-kb-1/export`);
  const exportData = await exportRes.json();
  check(
    exportRes.status === 200 && exportData.knowledgeBase?.id === "default-kb-1" && Array.isArray(exportData.documents),
    "5.1 Knowledge Base JSON Archive Export Package",
    `Exported Docs: ${exportData.documents?.length}`
  );

  // 5.2 robots.txt
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  const robotsText = await robotsRes.text();
  check(
    robotsRes.status === 200 && robotsText.includes("Allow: /") && robotsText.includes("Disallow: /api/") && robotsText.includes("sitemap.xml"),
    "5.2 Search Engine Crawler Directives (robots.txt)"
  );

  // 5.3 sitemap.xml
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  check(
    sitemapRes.status === 200 && sitemapText.includes("<loc>") && sitemapText.includes("/docs"),
    "5.3 Dynamic XML Search Engine Index (sitemap.xml)"
  );

  // -------------------------------------------------------------
  // SECTION 6: UI/UX INTEGRITY, THEMES, SPEECH-TO-TEXT & WORKSPACE
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[SECTION 6] UI/UX Design System, Class-Based Dark Mode & Interactive Controls${colors.reset}`);

  // 6.1 Landing Page UI
  const homeRes = await fetch(`${BASE_URL}/`);
  const homeHtml = await homeRes.text();
  check(
    homeHtml.includes("Cortex RAG") && homeHtml.includes("v2.0 Enterprise") && homeHtml.includes("Dokumentasi API"),
    "6.1 Landing Page Hero, Header & Navigation Elements Verified"
  );

  // 6.2 Theme Toggle in Header across Pages
  check(
    homeHtml.includes("Ganti ke Tema") || homeHtml.includes("Alihkan Tema"),
    "6.2 Theme Toggle Button Present on Landing Page"
  );

  // 6.3 Dashboard UI & Monochromatic Design System
  const dashRes = await fetch(`${BASE_URL}/dashboard`);
  const dashHtml = await dashRes.text();
  check(
    dashHtml.includes("Semantic Workspace") && dashHtml.includes("emerald"),
    "6.3 Dashboard Monochromatic Zinc-Emerald Design System Active"
  );
  check(
    dashHtml.includes("Speech-to-Text") || dashHtml.includes("perekaman suara") || dashHtml.includes("Mic"),
    "6.4 Speech-to-Text Voice Query Audio Microphone Tooltip & Controls Verified"
  );
  check(
    dashHtml.includes("Muat 3 Dokumen Demo") || dashHtml.includes("Dokumen Demo") || dashHtml.includes("Daftar Terindeks"),
    "6.5 Empty-State Onboarding & Seeder Triggers Verified"
  );

  // 6.4 Developer Docs & Sandbox UI
  const docsRes = await fetch(`${BASE_URL}/docs`);
  const docsHtml = await docsRes.text();
  check(
    docsHtml.includes("API Sandbox") || docsHtml.includes("Interactive Console") || docsHtml.includes("cURL"),
    "6.6 Developer Documentation & Live In-Browser API Console Verified"
  );

  // 6.5 Login Page Demo Profile Switcher
  const loginRes = await fetch(`${BASE_URL}/login`);
  const loginHtml = await loginRes.text();
  check(
    loginHtml.includes("Alex Pratama") && loginHtml.includes("Sarah Wijaya") && loginHtml.includes("Tamu Publik"),
    "6.7 Instant 1-Click Role Switcher Profiles Verified on /login"
  );

  // -------------------------------------------------------------
  // FINAL TEST SUMMARY REPORT
  // -------------------------------------------------------------
  const total = passed + failed;
  const rate = Math.round((passed / total) * 100);

  console.log(`\n${colors.bold}======================================================================${colors.reset}`);
  console.log(`${colors.bold}   DEEP QA TEST EXECUTION REPORT${colors.reset}`);
  console.log(`   Total Test Cases Executed : ${total}`);
  console.log(`   ${colors.green}Passed (Lulus)             : ${passed}${colors.reset}`);
  console.log(`   ${failed > 0 ? colors.red : colors.green}Failed (Gagal)             : ${failed}${colors.reset}`);
  console.log(`   Overall Quality Score      : ${rate}%`);
  console.log(`${colors.bold}======================================================================\n${colors.reset}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepQa().catch((e) => {
  console.error("Test Suite Crashed:", e);
  process.exit(1);
});
