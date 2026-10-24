import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { tokenStore } from "../api/client";
import { makeToken, renderAt } from "../test/helpers";
import ProtectedRoute from "./ProtectedRoute";

function routes(adminOnly = false) {
  return (
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/" element={<p>Home page</p>} />
      <Route
        path="/secret"
        element={
          <ProtectedRoute adminOnly={adminOnly}>
            <p>Secret page</p>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  it("redirects visitors without a token to /login", () => {
    renderAt(routes(), "/secret");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects when the stored token has expired", () => {
    tokenStore.set(makeToken("user", -10));
    renderAt(routes(), "/secret");
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it("renders the page for a signed-in user", () => {
    tokenStore.set(makeToken("user"));
    renderAt(routes(), "/secret");
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  it("keeps regular users out of admin-only pages", () => {
    tokenStore.set(makeToken("user"));
    renderAt(routes(true), "/secret");
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("lets admins into admin-only pages", () => {
    tokenStore.set(makeToken("admin"));
    renderAt(routes(true), "/secret");
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });
});
