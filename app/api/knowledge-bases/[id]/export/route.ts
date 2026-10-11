import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backupData = await db.exportKnowledgeBaseData(id);

    // Return as downloadable JSON attachment
    const filename = `kb-export-${backupData.knowledgeBase?.name?.replace(/[^a-zA-Z0-9_-]/g, "_") || id}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API Knowledge Base Export] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengekspor data Knowledge Base." },
      { status: 500 }
    );
  }
}
