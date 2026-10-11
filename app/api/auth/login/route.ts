import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, DEMO_USERS } from "@/lib/auth/session";
import { UserSession } from "@/lib/auth/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, demoRole } = body;

    let user: UserSession | null = null;

    if (demoRole) {
      const key = String(demoRole).toLowerCase();
      user = DEMO_USERS[key] || DEMO_USERS.admin;
    } else {
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json(
          { success: false, error: "Alamat email tidak valid." },
          { status: 400 }
        );
      }

      if (!password || typeof password !== "string" || password.length < 4) {
        return NextResponse.json(
          { success: false, error: "Kata sandi minimal 4 karakter." },
          { status: 400 }
        );
      }

      // Dynamic or match against preset demo accounts
      const matchedDemo = Object.values(DEMO_USERS).find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (matchedDemo) {
        user = matchedDemo;
      } else {
        const isAdmin = email.toLowerCase().includes("admin");
        user = {
          id: `usr_${crypto.randomUUID().slice(0, 8)}`,
          email: email.toLowerCase().trim(),
          name: email.split("@")[0].replace(/[._]/g, " "),
          role: isAdmin ? "ADMIN" : "MEMBER",
          plan: isAdmin ? "ENTERPRISE" : "PRO",
          createdAt: new Date().toISOString(),
        };
      }
    }

    const res = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      user,
    });

    attachSessionCookie(res, user);
    return res;
  } catch (error: any) {
    console.error("[API Auth Login] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses otentikasi login." },
      { status: 500 }
    );
  }
}
