import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Sesi berhasil ditutup.",
  });
  clearSessionCookie(res);
  return res;
}
