import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";

const b64url = (obj: object) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Builds an unsigned JWT-shaped string. The client only reads its claims. */
export function makeToken(role: "user" | "admin" = "user", expiresInSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "1", role, exp })}.sig`;
}

export function renderAt(ui: ReactElement, route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}
