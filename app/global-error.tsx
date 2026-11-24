"use client"; // Error boundaries must be Client Components

// Replaces the root layout when it fails, so it renders its own document and
// inline styles (global CSS, fonts and providers are not available here).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#09090b",
          color: "#fafafa",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Something went wrong | Cortex RAG</title>
        <main style={{ maxWidth: 440 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong / Terjadi kesalahan</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14 }}>
            An unexpected error occurred. Please try again. / Silakan coba lagi.
          </p>
          {error.digest && <p style={{ color: "#71717a", fontSize: 11, fontFamily: "monospace" }}>ref: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 8,
              border: 0,
              background: "#047857",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again / Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
