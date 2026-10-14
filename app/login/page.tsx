"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Mail,
  User,
  Lock,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CortexLogo } from "@/components/ui/logo";
import { UserRole } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, loginDemo, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, language } = useLanguage();

  const [mode, setMode] = React.useState<"demo" | "login" | "register">("demo");
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
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 sm:p-4 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_60%_60%_at_50%_20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Bar with Back Link, Language Switcher and Theme Toggle */}
      <div className="relative z-20 w-full max-w-md flex items-center justify-between px-1 py-3 mb-2">
        <Link
          href="/"
          className="text-xs text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition flex items-center gap-1 font-medium"
        >
          ← {t.common.back}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="pill" />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:text-white transition cursor-pointer"
            title={isDark ? t.common.lightTheme : t.common.darkTheme}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-600" />
            )}
          </button>
        </div>
      </div>

      {/* Brand Header */}
      <div className="relative z-10 mb-6 flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2.5 mb-2.5 group">
          <CortexLogo size={42} />
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.common.brand}
          </span>
          <span className="rounded bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            {t.common.enterpriseBadge}
          </span>
        </Link>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 px-4 text-center">
          {t.auth.subtitle}
        </p>
      </div>

      {/* Card Container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-4 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl">
        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <button
            type="button"
            onClick={() => setMode("demo")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition cursor-pointer ${
              mode === "demo"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.auth.demoTab}
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition cursor-pointer ${
              mode === "login"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.auth.loginTab}
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 border-b-2 py-2 text-center text-xs font-semibold transition cursor-pointer ${
              mode === "register"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.auth.registerTab}
          </button>
        </div>

        {/* Content Mode 1: 1-Click Demo Profiles */}
        {mode === "demo" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
              {t.auth.demoSubtitle}
            </p>

            {/* Profile 1: Admin */}
            <div
              onClick={() => !isSubmitting && handleDemoSelect("ADMIN")}
              className="group flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  AP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      Alex Pratama
                    </span>
                    <Badge variant="ready" className="text-[9px] px-1.5 py-0">
                      ADMIN
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    alex.admin@enterprise.corp • {t.auth.roles.admin}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
            </div>

            {/* Profile 2: Member / Analyst */}
            <div
              onClick={() => !isSubmitting && handleDemoSelect("MEMBER")}
              className="group flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs">
                  SW
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      Sarah Wijaya
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      MEMBER
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    sarah.analyst@cortex.ai • {t.auth.roles.member}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
            </div>

            {/* Profile 3: Guest / Public */}
            <div
              onClick={() => !isSubmitting && handleDemoSelect("GUEST")}
              className="group flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                  TP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {language === "en" ? "Public Guest" : "Tamu Publik"}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      GUEST
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    guest.public@demo.local • {t.auth.roles.guest}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
            </div>
          </div>
        )}

        {/* Content Mode 2: Form Login */}
        {mode === "login" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.auth.emailLabel}
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.auth.passwordLabel}
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2 cursor-pointer"
            >
              {isSubmitting ? t.auth.signingIn : t.auth.signInButton}
            </Button>
          </form>
        )}

        {/* Content Mode 3: Form Register */}
        {mode === "register" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.auth.nameLabel}
              </label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.auth.namePlaceholder}
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.auth.emailLabel}
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.auth.passwordLabel}
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2 cursor-pointer"
            >
              {isSubmitting ? t.auth.registering : t.auth.registerButton}
            </Button>
          </form>
        )}

        {/* Back Link */}
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 text-center">
          <Link
            href="/"
            className="text-[11px] text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition"
          >
            ← {t.common.back}
          </Link>
        </div>
      </div>

      {/* Footer Credit */}
      <footer className="relative z-20 mt-6 text-center text-xs text-zinc-500">
        <p>
          Designed and Developed by{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Dandy Rahmat Zain</span>
        </p>
      </footer>
    </div>
  );
}
