import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/session";
import { z } from "zod";

const CreateKnowledgeBaseSchema = z.object({
  name: z.string().min(2, "Nama Knowledge Base minimal 2 karakter"),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    const kbs = await db.getKnowledgeBases(user.id);
    return NextResponse.json({
      success: true,
      data: kbs,
    });
  } catch (error) {
    console.error("[API Knowledge Bases] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat Knowledge Bases." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    const body = await req.json();
    const validation = CreateKnowledgeBaseSchema.safeParse(body);

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

    const kb = await db.createKnowledgeBase(
      validation.data.name,
      validation.data.description,
      user.id
    );

    return NextResponse.json(
      {
        success: true,
        message: `Knowledge Base "${kb.name}" berhasil dibuat.`,
        data: kb,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API Knowledge Bases] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat Knowledge Base baru." },
      { status: 500 }
    );
  }
}
