import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Workspace | Cortex Enterprise RAG",
  description: "Enterprise Knowledge Base & Semantic Search Workspace",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950">
      {children}
    </div>
  );
}
