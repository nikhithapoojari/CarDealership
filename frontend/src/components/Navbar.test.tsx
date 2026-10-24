import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { tokenStore } from "../api/client";
import { makeToken, renderAt } from "../test/helpers";
import Navbar from "./Navbar";

describe("Navbar", () => {
  it("shows admin navigation and badge to admins", () => {
    tokenStore.set(makeToken("admin"));
    renderAt(<Navbar />);
    expect(screen.getByRole("link", { name: "Manage inventory" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "On the lot" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides admin navigation from regular users", () => {
    tokenStore.set(makeToken("user"));
    renderAt(<Navbar />);
    expect(screen.queryByRole("link", { name: "Manage inventory" })).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("signs out", async () => {
    tokenStore.set(makeToken("user"));
    renderAt(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(tokenStore.get()).toBeNull();
  });
});
