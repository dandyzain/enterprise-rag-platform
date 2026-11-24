"use client";

import * as React from "react";
import { UserSession, UserRole } from "@/lib/auth/types";
import { useLanguage } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AuthContextValue {
  user: UserSession | null;
  isLoading: boolean;
  /** False when the server has no AUTH_SECRET (sign-in disabled). */
  authAvailable: boolean;
  demoEnabled: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: (role: UserRole) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [authAvailable, setAuthAvailable] = React.useState(true);
  const [demoEnabled, setDemoEnabled] = React.useState(true);

  const applyMe = React.useCallback(
    (json: { success?: boolean; user?: UserSession | null; auth?: { available?: boolean; demoEnabled?: boolean } } | null) => {
      setUser(json?.success && json.user ? json.user : null);
      if (json?.auth) {
        setAuthAvailable(Boolean(json.auth.available));
        setDemoEnabled(Boolean(json.auth.demoEnabled));
      }
      setIsLoading(false);
    },
    []
  );

  const fetchCurrentUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      applyMe(await res.json());
    } catch {
      applyMe(null);
    }
  }, [applyMe]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) applyMe(json);
      })
      .catch(() => {
        if (!cancelled) applyMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [applyMe]);

  const postAuth = async (url: string, body: unknown, fallbackError: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        setUser(json.user);
        return { ok: true as const, json };
      }
      toast.error(json.error || fallbackError);
      return { ok: false as const, json };
    } catch {
      toast.error(t.toasts.networkError);
      return { ok: false as const, json: null };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { ok, json } = await postAuth("/api/auth/login", { email, password }, t.toasts.loginFailed);
    if (ok) toast.success(json.message || fmt(t.toasts.welcome, { name: json.user.name }));
    return ok;
  };

  const loginDemo = async (role: UserRole) => {
    const { ok, json } = await postAuth("/api/auth/login", { demoRole: role }, t.toasts.demoSwitchFailed);
    if (ok) {
      toast.success(json.message || fmt(t.toasts.demoSwitched, { name: json.user.name, plan: json.user.plan }));
    }
    return ok;
  };

  const register = async (name: string, email: string, password: string) => {
    const { ok, json } = await postAuth("/api/auth/register", { name, email, password }, t.toasts.registerFailed);
    if (ok) toast.success(json.message || fmt(t.toasts.welcome, { name: json.user.name }));
    return ok;
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      toast.info(t.toasts.signedOut);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authAvailable,
        demoEnabled,
        login,
        loginDemo,
        register,
        logout,
        refresh: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
