import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiRoute } from "@/lib/api/route";
import { loadWritableKb } from "@/lib/api/access";

/** Download a JSON backup of a knowledge base. Owner only. */
export const GET = apiRoute<{ id: string }>(async (ctx) => {
  const kb = await loadWritableKb(ctx.actor, ctx.params.id);
  const [docs, stats] = await Promise.all([db.listDocuments(kb.id), db.getStorageStats(kb.id)]);

  const documents = await Promise.all(
    docs.map(async (doc) => {
      const chunks = await db.getDocumentChunks(doc.id);
      return {
        id: doc.id,
        title: doc.title,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status,
        chunkCount: doc.chunkCount,
        embeddingModel: doc.embeddingModel ?? null,
        createdAt: doc.createdAt,
        chunks: chunks.map((c) => ({
          id: c.id,
          chunkIndex: c.chunkIndex,
          pageNumber: c.pageNumber,
          content: c.content,
          createdAt: c.createdAt,
        })),
      };
    })
  );

  const backup = {
    version: "1.1",
    exportType: "ENTERPRISE_RAG_KB_BACKUP",
    exportedAt: new Date().toISOString(),
    knowledgeBase: { id: kb.id, name: kb.name, description: kb.description, createdAt: kb.createdAt },
    stats,
    documents,
  };

  const safeName = kb.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || kb.id;
  const filename = `kb-export-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
