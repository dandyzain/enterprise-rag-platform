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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchCurrentUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchCurrentUser();
  }, [fetchCurrentUser]);

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
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.info("Anda telah keluar dari sesi.");
    } catch {
      // ignore
    }
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
