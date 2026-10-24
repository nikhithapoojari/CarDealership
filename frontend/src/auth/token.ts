import type { Role } from "../types";

export interface TokenClaims {
  sub: string;
  role: Role;
  exp: number;
}

/** Reads the JWT payload. For UI decisions only: the server re-checks every request. */
export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json);
    const validRole = claims.role === "user" || claims.role === "admin";
    if (typeof claims.sub !== "string" || !validRole || typeof claims.exp !== "number") return null;
    return claims as TokenClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: TokenClaims, now = Date.now()): boolean {
  return claims.exp * 1000 <= now;
}
