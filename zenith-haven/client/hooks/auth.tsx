import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { z } from "zod";

export type User = { email: string };

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const EMAIL = z.string().email();
const PASSWORD = z
  .string()
  .min(6)
  .max(128);

const STORAGE_KEY = "kmind_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { email: string };
        if (parsed?.email && typeof parsed.email === "string") {
          setUser({ email: parsed.email });
        }
      }
    } catch {}
  }, []);

  const persist = useCallback((u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const e = EMAIL.parse(email);
    PASSWORD.parse(password);
    const u = { email: e };
    setUser(u);
    persist(u);
  }, [persist]);

  const signup = useCallback(async (email: string, password: string) => {
    const e = EMAIL.parse(email);
    PASSWORD.parse(password);
    const u = { email: e };
    setUser(u);
    persist(u);
  }, [persist]);

  const logout = useCallback(() => {
    setUser(null);
    persist(null);
  }, [persist]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  }), [user, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  const loc = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return children;
}
