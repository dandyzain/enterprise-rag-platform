import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Shape of an exported Knowledge Base backup, as accepted by the importer. */
type KnowledgeBaseBackup = Parameters<typeof db.importKnowledgeBaseData>[0];

export async function POST(req: NextRequest) {
  try {
    let payload: Partial<KnowledgeBaseBackup> | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "File backup JSON tidak ditemukan." },
          { status: 400 }
        );
      }
      const text = await file.text();
      payload = JSON.parse(text);
    } else {
      payload = await req.json();
    }

    if (!payload || !payload.knowledgeBase) {
      return NextResponse.json(
        { success: false, error: "Format backup tidak valid. Harus menyertakan objek knowledgeBase." },
        { status: 400 }
      );
    }

    const result = await db.importKnowledgeBaseData({
      knowledgeBase: payload.knowledgeBase,
      documents: payload.documents || [],
    });

    return NextResponse.json({
      success: true,
      message: `Knowledge Base "${result.knowledgeBase.name}" berhasil dipulihkan (${result.totalDocuments} dokumen, ${result.totalChunks} chunks).`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Knowledge Base Import] POST error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Gagal memulihkan data Knowledge Base dari file backup.",
      },
      { status: 500 }
    );
  }
}
