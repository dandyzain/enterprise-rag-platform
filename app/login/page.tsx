"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Database,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Zap,
  Lock,
  Mail,
  User,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { UserRole } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, loginDemo, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = React.useState<"login" | "register" | "demo">("demo");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (mode === "login") {
      const ok = await login(email, password);
      if (ok) router.push("/dashboard");
    } else if (mode === "register") {
      const ok = await register(name, email, password);
      if (ok) router.push("/dashboard");
    }
    setIsSubmitting(false);
  };

  const handleDemoSelect = async (role: UserRole) => {
    setIsSubmitting(true);
    const ok = await loginDemo(role);
    if (ok) router.push("/dashboard");
    setIsSubmitting(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4 selection:bg-emerald-500 selection:text-white">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white transition cursor-pointer"
          title={isDark ? "Ganti ke Tema Terang (Light)" : "Ganti ke Tema Gelap (Dark)"}
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-300" />}
        </button>
      </div>

      {/* Brand Header */}
      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2.5 mb-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
            <Database className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-50">
            Cortex RAG
          </span>
          <span className="rounded bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Enterprise
          </span>
        </Link>
        <p className="text-xs text-zinc-400">
          Autentikasi Multi-Tenant & Keamanan Akses Vektor
        </p>
      </div>

      {/* Card Container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl">
        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 mb-6">
          <button
            type="button"
            onClick={() => setMode("demo")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition ${
              mode === "demo"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Akses Demo Instan
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition ${
              mode === "login"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition ${
              mode === "register"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Content Mode 1: 1-Click Demo Profiles */}
        {mode === "demo" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Pilih salah satu profil pra-konfigurasi untuk menguji sistem isolasi data multi-tenant
              secara langsung tanpa perlu memasukkan password:
            </p>

            {/* Profile 1: Admin */}
            <div
              onClick={() => !isSubmitting && handleDemoSelect("ADMIN")}
              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                  AP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition">
                      Alex Pratama
                    </span>
                    <Badge variant="ready" className="text-[9px] px-1.5 py-0">
                      ADMIN
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">alex.admin@enterprise.corp • Enterprise Plan</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 transition" />
            </div>

            {/* Profile 2: Member / Analyst */}
            <div
              onClick={() => !isSubmitting && handleDemoSelect("MEMBER")}
              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 font-bold text-xs">
                  SW
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition">
                      Sarah Wijaya
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      MEMBER
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">sarah.analyst@cortex.ai • Pro Plan</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 transition" />
            </div>

            {/* Profile 3: Guest / Public */}
            <div
              onClick={() => !isSubmitting && handleDemoSelect("GUEST")}
              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs">
                  TP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition">
                      Tamu Publik
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      GUEST
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">guest.public@demo.local • Free Tier</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 transition" />
            </div>
          </div>
        )}

        {/* Content Mode 2: Form Login */}
        {mode === "login" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Email Akun</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Kata Sandi</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2"
            >
              {isSubmitting ? "Memverifikasi..." : "Masuk ke Workspace"}
            </Button>
          </form>
        )}

        {/* Content Mode 3: Form Register */}
        {mode === "register" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Nama Lengkap</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Email Perusahaan</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@perusahaan.com"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Kata Sandi Baru</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2"
            >
              {isSubmitting ? "Mendaftarkan..." : "Daftar Akun Baru"}
            </Button>
          </form>
        )}

        {/* Back Link */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <Link
            href="/"
            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition"
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
