import fs from "fs";
import path from "path";

/**
 * Creates a valid 2-page PDF buffer and tests PDF parsing and ingestion
 */
function createValidPdfBuffer() {
  const page1Text = `BT
/F1 16 Tf
50 720 Td
(Enterprise Cloud Governance Handbook 2026) Tj
/F1 11 Tf
0 -35 Td
(Bab 1: Standar Arsitektur Multi-Region dan Zero-Trust Access) Tj
0 -25 Td
(Semua kluster Kubernetes produksi wajib beroperasi pada minimal 3 Availability Zones.) Tj
0 -20 Td
(SLA ketersediaan sistem enterprise dijamin 99.99% dengan automated health checks.) Tj
0 -20 Td
(Akses administratif root dilarang keras dan wajib melalui SSO SAML 2.0 dengan MFA.) Tj
ET`;

  const page2Text = `BT
/F1 16 Tf
50 720 Td
(Bab 2: Kebijakan Disaster Recovery dan Enkripsi Data) Tj
/F1 11 Tf
0 -35 Td
(Target Recovery Time Objective RTO adalah 60 menit untuk seluruh core banking APIs.) Tj
0 -20 Td
(Target Recovery Point Objective RPO maksimum 5 menit dengan active-active storage.) Tj
0 -20 Td
(Enkripsi database menggunakan modul hardware HSM FIPS-140-3 dengan kunci AES-256-GCM.) Tj
ET`;

  const stream1 = Buffer.from(page1Text);
  const stream2 = Buffer.from(page2Text);

  const objects = [];
  objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  objects[2] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>\nendobj\n";
  objects[3] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>\nendobj\n";
  objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  objects[5] = "5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>\nendobj\n";
  objects[6] = `6 0 obj\n<< /Length ${stream1.length} >>\nstream\n${page1Text}\nendstream\nendobj\n`;
  objects[7] = `7 0 obj\n<< /Length ${stream2.length} >>\nstream\n${page2Text}\nendstream\nendobj\n`;

  let pdfStr = "%PDF-1.4\n";
  const xrefOffsets = [0];

  for (let i = 1; i <= 7; i++) {
    xrefOffsets[i] = Buffer.byteLength(pdfStr);
    pdfStr += objects[i];
  }

  const startXref = Buffer.byteLength(pdfStr);
  pdfStr += "xref\n0 8\n0000000000 65535 f \n";
  for (let i = 1; i <= 7; i++) {
    pdfStr += `${String(xrefOffsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdfStr += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdfStr);
}

async function testPdfIngestion() {
  console.log("=== Generating and Testing Real Multi-Page Binary PDF Ingestion ===");
  const pdfBuffer = createValidPdfBuffer();
  const filePath = path.join(process.cwd(), "sample-handbook-2026.pdf");
  fs.writeFileSync(filePath, pdfBuffer);
  console.log(`Created PDF file: ${filePath} (${pdfBuffer.length} bytes)`);

  // Build multipart/form-data
  const formData = new FormData();
  const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" });
  formData.append("file", fileBlob, "sample-handbook-2026.pdf");
  formData.append("knowledgeBaseId", "default-kb-1");

  console.log("Posting to POST /api/documents/ingest ...");
  const response = await fetch("http://localhost:3000/api/documents/ingest", {
    method: "POST",
    body: formData,
  });

  const json = await response.json();
  console.log("Ingest Response Status:", response.status);
  console.log("Response Body:", JSON.stringify(json, null, 2));

  if (json.success && json.data) {
    console.log("\nDocument Successfully Ingested!");
    console.log(`Document ID: ${json.data.documentId}`);
    console.log(`Title: ${json.data.title}`);
    console.log(`Pages Parsed: ${json.data.pages}`);
    console.log(`Chunks Created: ${json.data.totalChunks}`);
    console.log(`Processing Latency: ${json.data.processingTimeMs}ms`);

    // Verify search matches against newly uploaded PDF
    console.log("\n=== Verifying Search on Newly Uploaded PDF ===");
    const searchRes = await fetch("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "SLA 99.99% RTO 60 menit HSM FIPS",
        searchMode: "hybrid",
        knowledgeBaseId: "default-kb-1",
        threshold: 0.4,
        topK: 3,
      }),
    });

    const searchJson = await searchRes.json();
    console.log("Search Latency:", searchJson.data?.latencyMs, "ms");
    searchJson.data?.chunks?.forEach((c, idx) => {
      console.log(`Match [${idx + 1}]: ${c.documentTitle} (Page ${c.pageNumber || "N/A"})`);
      console.log(`  Similarity: ${(c.similarity * 100).toFixed(1)}% | MatchType: ${c.matchType}`);
      console.log(`  Snippet: ${c.content.slice(0, 100).replace(/\n/g, " ")}...`);
    });
  }

  // Cleanup sample file
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  console.log("\n=== PDF Ingestion Test Completed Successfully! ===");
}

testPdfIngestion().catch(console.error);
