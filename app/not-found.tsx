import type { Metadata } from "next";
import { StatusPage } from "@/components/ui/status-page";

export const metadata: Metadata = {
  title: "Page not found | Cortex RAG",
  robots: { index: false },
};

export default function NotFound() {
  return <StatusPage kind="not-found" />;
}
