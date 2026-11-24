import type { Metadata } from "next";
import DocsClient from "./docs-client";

export const metadata: Metadata = {
  title: "Developer API Docs | Cortex RAG",
  description:
    "REST endpoints for hybrid semantic search, document ingestion and grounded RAG chat streaming, with cURL, TypeScript and Python examples.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return <DocsClient />;
}
