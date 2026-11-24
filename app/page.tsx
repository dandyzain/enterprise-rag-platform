import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "Cortex RAG | Enterprise Knowledge Base & Semantic Search",
  description:
    "Grounded answers from your own documents: hybrid vector + keyword search, verifiable citations, multi-tenant workspaces and PostgreSQL + pgvector.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeClient />;
}
