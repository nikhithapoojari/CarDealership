import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, AUTH_EXPIRED_EVENT, tokenStore } from "../api/client";
import { decodeToken, isExpired } from "./token";

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredToken(): string | null {
  const token = tokenStore.get();
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims || isExpired(claims)) {
    tokenStore.clear();
    return null;
  }
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);

  useEffect(() => {
    const onExpired = () => setToken(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    tokenStore.set(access_token);
    setToken(access_token);
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password);
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
  }, []);

  const value = useMemo<AuthState>(() => {
    const claims = token ? decodeToken(token) : null;
    return {
      isAuthenticated: claims !== null,
      isAdmin: claims?.role === "admin",
      login,
      register,
      logout,
    };
  }, [token, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
