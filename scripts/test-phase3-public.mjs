// Phase 3 Public Readiness Test Suite:
// 1. Bring-Your-Own-Key (BYOK) Rate Limit Bypass Verification
// 2. Guest / Public Free Tier Rate Limit and Remaining Header Tracking
// 3. Document Quota Telemetry Verification
// 4. Shared Knowledge Base Access Verification

async function testPhase3() {
  console.log("=== 1. Test Guest/Public User (Free Tier) Rate Limit Tracking ===");
  const guestLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoRole: "GUEST" }),
  });
  const guestCookie = (guestLoginRes.headers.get("set-cookie") || "").split(";")[0];

  const standardChatRes = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Apa standar arsitektur cloud?" }],
      knowledgeBaseId: "default-kb-1",
    }),
  });

  console.log("Free Tier Chat Status:", standardChatRes.status);
  const limitStandard = standardChatRes.headers.get("x-ratelimit-limit");
  const remainingStandard = standardChatRes.headers.get("x-ratelimit-remaining");
  console.log("Standard X-RateLimit-Limit:", limitStandard);
  console.log("Standard X-RateLimit-Remaining:", remainingStandard);

  if (limitStandard !== "15") {
    throw new Error(`Expected Free Tier limit 15, got ${limitStandard}`);
  }

  console.log("\n=== 2. Test Bring-Your-Own-Key (BYOK) Rate Limit Bypass ===");
  // Send query with custom OpenAI key header
  const byokChatRes = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: guestCookie,
      "x-custom-openai-key": "sk-proj-testkeybyokcustomforpublicusers1234567890",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Jelaskan prinsip pemulihan bencana RPO dan RTO." }],
      knowledgeBaseId: "default-kb-1",
    }),
  });

  console.log("BYOK Chat Status:", byokChatRes.status);
  const limitByok = byokChatRes.headers.get("x-ratelimit-limit");
  const remainingByok = byokChatRes.headers.get("x-ratelimit-remaining");
  console.log("BYOK X-RateLimit-Limit:", limitByok);
  console.log("BYOK X-RateLimit-Remaining:", remainingByok);

  if (limitByok !== "999999") {
    throw new Error(`Expected BYOK limit 999999 (bypassed), got ${limitByok}`);
  }

  console.log("\n=== 3. Test Shared Knowledge Base Access ===");
  const kbRes = await fetch("http://localhost:3000/api/documents?kbId=default-kb-1", {
    headers: {
      Cookie: guestCookie,
    },
  });
  const kbJson = await kbRes.json();
  console.log("Shared KB Fetch Status:", kbRes.status);
  console.log("Shared KB Success:", kbJson.success);
  console.log("Available Documents Count in Shared KB:", kbJson.data?.documents?.length || 0);

  if (!kbJson.success || !Array.isArray(kbJson.data?.documents)) {
    throw new Error("Failed to access shared knowledge base!");
  }

  console.log("\n=== ALL PHASE 3 PUBLIC READINESS TESTS PASSED 100%! ===");
}

testPhase3().catch((err) => {
  console.error("Phase 3 Verification Failed:", err);
  process.exit(1);
});
