import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { Vehicle } from "../types";
import DashboardPage from "./DashboardPage";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: { login: vi.fn(), register: vi.fn(), searchVehicles: vi.fn(), purchase: vi.fn() } };
});

const corolla: Vehicle = { id: 1, make: "Toyota", model: "Corolla", category: "Sedan", price: 20000, quantity: 3 };
const crv: Vehicle = { id: 2, make: "Honda", model: "CR-V", category: "SUV", price: 32000, quantity: 0 };

beforeEach(() => {
  vi.mocked(api.searchVehicles).mockReset().mockResolvedValue([corolla, crv]);
  vi.mocked(api.purchase).mockReset();
});

describe("DashboardPage", () => {
  it("lists every vehicle returned by the API", async () => {
    render(<DashboardPage />);
    expect(await screen.findByText("Corolla")).toBeInTheDocument();
    expect(screen.getByText("CR-V")).toBeInTheDocument();
    expect(screen.getByText("2 vehicles")).toBeInTheDocument();
  });

  it("enables Purchase for in-stock vehicles only", async () => {
    render(<DashboardPage />);
    const buttons = await screen.findAllByRole("button", { name: /purchase/i });
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("updates stock and confirms after a purchase", async () => {
    vi.mocked(api.purchase).mockResolvedValue({ ...corolla, quantity: 2 });
    render(<DashboardPage />);
    const [buy] = await screen.findAllByRole("button", { name: /purchase/i });
    await userEvent.click(buy);
    expect(api.purchase).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Only 2 left")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Purchased 1 × Toyota Corolla.");
  });

  it("marks a vehicle sold out when the server answers 409", async () => {
    vi.mocked(api.purchase).mockRejectedValue(new ApiError(409, "Vehicle is out of stock"));
    render(<DashboardPage />);
    const [buy] = await screen.findAllByRole("button", { name: /purchase/i });
    await userEvent.click(buy);
    expect(await screen.findAllByText("Out of stock")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent(/just sold out/i);
  });

  it("searches with the typed filters after a short pause", async () => {
    render(<DashboardPage />);
    await screen.findByText("Corolla");
    await userEvent.type(screen.getByLabelText("Make"), "honda");
    await waitFor(() =>
      expect(api.searchVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ make: "honda" })),
    );
  });

  it("shows an empty state with a way back", async () => {
    vi.mocked(api.searchVehicles).mockResolvedValue([]);
    render(<DashboardPage />);
    expect(await screen.findByText(/no vehicles match/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("shows an error with a retry that reloads", async () => {
    vi.mocked(api.searchVehicles).mockRejectedValueOnce(new ApiError(500, "Server error"));
    render(<DashboardPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Corolla")).toBeInTheDocument();
  });
});
