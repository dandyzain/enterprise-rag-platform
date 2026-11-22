import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_KNOWLEDGE_BASE_ID } from "@/lib/knowledge-base";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kbId = searchParams.get("kbId") || DEFAULT_KNOWLEDGE_BASE_ID;

    const [documents, stats, knowledgeBases] = await Promise.all([
      db.getDocumentsByKb(kbId),
      db.getStorageStats(kbId),
      db.getKnowledgeBases(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        documents,
        stats,
        knowledgeBases,
      },
    });
  } catch (error) {
    console.error("[API Documents] Failed to fetch documents:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memuat daftar dokumen.",
      },
      { status: 500 }
    );
  }
}
