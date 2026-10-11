import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/auth/session";
import { UserSession } from "@/lib/auth/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Nama lengkap wajib diisi (minimal 2 karakter)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Alamat email tidak valid." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    const newUser: UserSession = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: "MEMBER",
      plan: "FREE",
      createdAt: new Date().toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      message: `Akun berhasil didaftarkan. Selamat datang, ${newUser.name}!`,
      user: newUser,
    });

    attachSessionCookie(res, newUser);
    return res;
  } catch (error: any) {
    console.error("[API Auth Register] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan akun baru." },
      { status: 500 }
    );
  }
}
