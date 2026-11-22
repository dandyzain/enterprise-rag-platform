import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    return NextResponse.json({
      success: true,
      user,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memverifikasi sesi." },
      { status: 500 }
    );
  }
}
