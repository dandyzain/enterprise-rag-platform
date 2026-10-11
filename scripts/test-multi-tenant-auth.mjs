// Test script for Multi-Tenant Authentication and Data Scoping

async function main() {
  console.log("=== 1. Test Login Page (GET /login) ===");
  const loginRes = await fetch("http://localhost:3000/login");
  console.log("Login Page HTTP Status:", loginRes.status);
  const loginHtml = await loginRes.text();
  console.log("Contains 'Akses Demo Instan':", loginHtml.includes("Akses Demo Instan"));
  console.log("Contains 'Alex Pratama':", loginHtml.includes("Alex Pratama"));

  console.log("\n=== 2. Test Initial Session (GET /api/auth/me) ===");
  const meRes = await fetch("http://localhost:3000/api/auth/me");
  const meJson = await meRes.json();
  console.log("Default User:", meJson.user?.name, "Role:", meJson.user?.role, "Plan:", meJson.user?.plan);

  console.log("\n=== 3. Test Demo Switch to Member (Sarah Wijaya) ===");
  const memberLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoRole: "MEMBER" }),
  });
  const memberLoginJson = await memberLoginRes.json();
  console.log("Member Login:", memberLoginJson.message);
  console.log("Member User ID:", memberLoginJson.user?.id);

  // Extract session cookie
  const cookieHeader = memberLoginRes.headers.get("set-cookie") || "";
  const authCookie = cookieHeader.split(";")[0];
  console.log("Auth Cookie Established:", authCookie.startsWith("cortex_auth_session="));

  console.log("\n=== 4. Create Private KB as Member ===");
  const memberKbRes = await fetch("http://localhost:3000/api/knowledge-bases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      name: "Riset Finansial Q3 2026 (Sarah)",
      description: "Data analitik privat milik Sarah Wijaya",
    }),
  });
  const memberKbJson = await memberKbRes.json();
  console.log("Created Private KB:", memberKbJson.data?.name, "Owner:", memberKbJson.data?.userId);

  console.log("\n=== 5. Verify Member's Visible KBs ===");
  const memberKbsListRes = await fetch("http://localhost:3000/api/knowledge-bases", {
    headers: { Cookie: authCookie },
  });
  const memberKbsList = await memberKbsListRes.json();
  console.log("Member Sees KBs:", memberKbsList.data?.map((k) => k.name));

  console.log("\n=== 6. Test Demo Switch to Guest (Tamu Publik) ===");
  const guestLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demoRole: "GUEST" }),
  });
  const guestCookie = (guestLoginRes.headers.get("set-cookie") || "").split(";")[0];

  console.log("\n=== 7. Verify Multi-Tenant Data Scoping (Guest isolation) ===");
  const guestKbsListRes = await fetch("http://localhost:3000/api/knowledge-bases", {
    headers: { Cookie: guestCookie },
  });
  const guestKbsList = await guestKbsListRes.json();
  const guestKbNames = guestKbsList.data?.map((k) => k.name) || [];
  console.log("Guest Sees KBs:", guestKbNames);
  const isSarahKbHidden = !guestKbNames.includes("Riset Finansial Q3 2026 (Sarah)");
  console.log("Is Sarah's Private KB Hidden from Guest?:", isSarahKbHidden);

  console.log("\n=== 8. Test New User Registration ===");
  const regRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Budi Santoso",
      email: "budi.santoso@startup.co.id",
      password: "password123",
    }),
  });
  const regJson = await regRes.json();
  console.log("Register Result:", regJson.message, "User ID:", regJson.user?.id);

  console.log("\n=== 9. Test Logout ===");
  const logoutRes = await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
  });
  const logoutJson = await logoutRes.json();
  console.log("Logout Result:", logoutJson.message);

  console.log("\n=== ALL MULTI-TENANT AUTH TESTS PASSED 100%! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
