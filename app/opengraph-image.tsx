import { ImageResponse } from "next/og";

export const alt = "Cortex RAG — grounded answers from your enterprise documents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "linear-gradient(135deg, #09090b 0%, #0f1f18 60%, #064e3b 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, color: "#34d399" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              border: "3px solid #34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            C
          </div>
          Cortex RAG
        </div>
        <div style={{ marginTop: 36, fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
          Grounded answers from your enterprise documents
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#a1a1aa" }}>
          Hybrid vector + keyword search · verifiable citations · pgvector
        </div>
      </div>
    ),
    size
  );
}
