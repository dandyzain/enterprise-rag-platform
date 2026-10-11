import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await db.getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { success: false, error: "Dokumen tidak ditemukan." },
        { status: 404 }
      );
    }

    const chunks = await db.getDocumentChunks(id);
    return NextResponse.json({
      success: true,
      data: {
        document,
        chunks,
      },
    });
  } catch (error) {
    console.error("[API Documents ID] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat rincian dokumen." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await db.deleteDocument(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Dokumen tidak ditemukan untuk dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dokumen dan vektor chunk terkait berhasil dihapus.",
    });
  } catch (error) {
    console.error("[API Documents ID] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus dokumen." },
      { status: 500 }
    );
  }
}
