import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await db.getChatMessages(id);
    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("[API Chat Sessions ID] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat pesan riwayat sesi." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Judul sesi tidak boleh kosong." },
        { status: 400 }
      );
    }

    await db.updateChatSessionTitle(id, title.trim());

    return NextResponse.json({
      success: true,
      message: "Judul sesi berhasil diperbarui.",
      data: { id, title: title.trim() },
    });
  } catch (error) {
    console.error("[API Chat Sessions ID] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui judul sesi." },
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
    const deleted = await db.deleteChatSession(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Sesi tidak ditemukan untuk dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sesi obrolan berhasil dihapus.",
    });
  } catch (error) {
    console.error("[API Chat Sessions ID] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus sesi obrolan." },
      { status: 500 }
    );
  }
}

