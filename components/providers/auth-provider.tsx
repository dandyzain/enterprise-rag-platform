"use client";

import * as React from "react";
import { UserSession, UserRole } from "@/lib/auth/types";
import { toast } from "sonner";

interface AuthContextValue {
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginDemo: (role: UserRole) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/** The signed-in user according to the server, or null if signed out or unreachable. */
async function fetchSessionUser(): Promise<UserSession | null> {
  try {
    const res = await fetch("/api/auth/me");
    const json: { success?: boolean; user?: UserSession | null } = await res.json();
    return json.success && json.user ? json.user : null;
  } catch {
    return null;
  }
}

/**
 * Leave for the login page with a full page load. Deliberately not
 * router.push: a hard navigation discards all client-side state from the
 * signed-out session (Next.js docs, "Preserving UI state" > "State and
 * authentication"). The rule below exists to catch accidental full reloads.
 */
function reloadToLogin() {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation on logout, see above
  window.location.href = "/login";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const applySessionUser = React.useCallback((sessionUser: UserSession | null) => {
    setUser(sessionUser);
    setIsLoading(false);
  }, []);

  const fetchCurrentUser = React.useCallback(async () => {
    applySessionUser(await fetchSessionUser());
  }, [applySessionUser]);

  // Load the session once on mount; state is set when the request resolves.
  React.useEffect(() => {
    void fetchSessionUser().then(applySessionUser);
  }, [applySessionUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
        toast.success(json.message || `Selamat datang, ${json.user.name}!`);
        return true;
      }
      toast.error(json.error || "Gagal masuk. Periksa kembali email dan kata sandi.");
      return false;
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async (role: UserRole): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoRole: role }),
      });
      const json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
        toast.success(`Beralih ke profil demo: ${json.user.name} (${json.user.plan} Plan)`);
        return true;
      }
      toast.error("Gagal beralih ke profil demo.");
      return false;
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
        toast.success(json.message || "Akun berhasil didaftarkan!");
        return true;
      }
      toast.error(json.error || "Gagal mendaftarkan akun.");
      return false;
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.info("Anda telah keluar dari sesi.");
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
    reloadToLogin();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
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
