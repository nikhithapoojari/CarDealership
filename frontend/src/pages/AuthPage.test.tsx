import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import { makeToken, renderAt } from "../test/helpers";
import AuthPage from "./AuthPage";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: { login: vi.fn(), register: vi.fn(), searchVehicles: vi.fn(), purchase: vi.fn() } };
});

function renderAuth(mode: "login" | "register") {
  return renderAt(
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/" element={<p>Home page</p>} />
    </Routes>,
    `/${mode}`,
  );
}

async function fill(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
}

beforeEach(() => {
  vi.mocked(api.login).mockReset();
  vi.mocked(api.register).mockReset();
});

describe("login", () => {
  it("signs in and goes to the dashboard", async () => {
    vi.mocked(api.login).mockResolvedValue({ access_token: makeToken("user"), token_type: "bearer" });
    renderAuth("login");
    await fill("jane@example.com", "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(api.login).toHaveBeenCalledWith("jane@example.com", "password123");
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("shows the server's error and stays on the page", async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiError(401, "Invalid email or password"));
    renderAuth("login");
    await fill("jane@example.com", "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });

  it("links to registration", () => {
    renderAuth("login");
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/register");
  });
});

describe("register", () => {
  it("rejects a short password without calling the API", async () => {
    renderAuth("register");
    await fill("jane@example.com", "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8 characters/i);
    expect(api.register).not.toHaveBeenCalled();
  });

  it("creates the account, signs in, and goes to the dashboard", async () => {
    vi.mocked(api.register).mockResolvedValue({ id: 1, email: "jane@example.com", role: "user" });
    vi.mocked(api.login).mockResolvedValue({ access_token: makeToken("user"), token_type: "bearer" });
    renderAuth("register");
    await fill("jane@example.com", "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Home page")).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledWith("jane@example.com", "password123");
    expect(api.login).toHaveBeenCalledWith("jane@example.com", "password123");
  });

  it("shows a duplicate-email error", async () => {
    vi.mocked(api.register).mockRejectedValue(new ApiError(409, "Email already registered"));
    renderAuth("register");
    await fill("jane@example.com", "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email already registered");
  });
});
