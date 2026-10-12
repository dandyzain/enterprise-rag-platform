import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/session";
import { z } from "zod";

const CreateSessionSchema = z.object({
  knowledgeBaseId: z.string().min(1, "Knowledge Base ID is required"),
  title: z.string().min(1, "Judul sesi percakapan tidak boleh kosong"),
});

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const kbId = searchParams.get("kbId") || "default-kb-1";
    const effectiveUserId = user?.id || "usr_guest_003";

    const sessions = await db.getChatSessions(kbId, effectiveUserId);
    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("[API Chat Sessions] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat sesi obrolan." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    const body = await req.json();
    const validation = CreateSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi parameter gagal",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const session = await db.createChatSession({
      knowledgeBaseId: validation.data.knowledgeBaseId,
      title: validation.data.title,
      userId: user?.id || "usr_guest_003",
    });

    return NextResponse.json(
      {
        success: true,
        data: session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API Chat Sessions] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat sesi obrolan baru." },
      { status: 500 }
    );
  }
}
