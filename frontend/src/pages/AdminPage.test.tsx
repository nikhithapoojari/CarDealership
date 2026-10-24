import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { Vehicle } from "../types";
import AdminPage from "./AdminPage";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      login: vi.fn(),
      register: vi.fn(),
      searchVehicles: vi.fn(),
      purchase: vi.fn(),
      createVehicle: vi.fn(),
      updateVehicle: vi.fn(),
      deleteVehicle: vi.fn(),
      restock: vi.fn(),
    },
  };
});

const corolla: Vehicle = { id: 1, make: "Toyota", model: "Corolla", category: "Sedan", price: 20000, quantity: 3 };
const crv: Vehicle = { id: 2, make: "Honda", model: "CR-V", category: "SUV", price: 32000, quantity: 0 };

const click = (name: string | RegExp) => userEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  Object.values(api).forEach((fn) => vi.mocked(fn).mockReset());
  vi.mocked(api.searchVehicles).mockResolvedValue([corolla, crv]);
});

async function renderPage() {
  render(<AdminPage />);
  await screen.findByText("Toyota Corolla");
}

describe("inventory table", () => {
  it("lists every vehicle with price and stock", async () => {
    await renderPage();
    const row = screen.getByText("Honda CR-V").closest("tr")!;
    expect(within(row).getByText("SUV")).toBeInTheDocument();
    expect(within(row).getByText("$32,000")).toBeInTheDocument();
    expect(within(row).getByText("Out of stock")).toBeInTheDocument();
  });

  it("invites the first vehicle when the lot is empty", async () => {
    vi.mocked(api.searchVehicles).mockResolvedValue([]);
    render(<AdminPage />);
    expect(await screen.findByText(/no vehicles on the lot yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add the first vehicle/i })).toBeInTheDocument();
  });

  it("shows a load error with a retry", async () => {
    vi.mocked(api.searchVehicles).mockRejectedValueOnce(new ApiError(500, "Server error"));
    render(<AdminPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error");
    await click(/try again/i);
    expect(await screen.findByText("Toyota Corolla")).toBeInTheDocument();
  });
});

describe("add", () => {
  it("creates a vehicle, adds it to the table, and closes the form", async () => {
    const created = { id: 3, make: "Ford", model: "F-150", category: "Truck", price: 45000, quantity: 2 };
    vi.mocked(api.createVehicle).mockResolvedValue(created);
    await renderPage();

    await click("Add vehicle");
    await userEvent.type(screen.getByLabelText("Make"), "Ford");
    await userEvent.type(screen.getByLabelText("Model"), "F-150");
    await userEvent.type(screen.getByLabelText("Category"), "Truck");
    await userEvent.type(screen.getByLabelText(/price/i), "45000");
    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), "2");
    await click("Add to lot");

    expect(api.createVehicle).toHaveBeenCalledWith({
      make: "Ford",
      model: "F-150",
      category: "Truck",
      price: 45000,
      quantity: 2,
    });
    expect(await screen.findByText("Ford F-150")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Added Ford F-150.");
    expect(screen.queryByRole("heading", { name: "Add a vehicle" })).not.toBeInTheDocument();
  });

  it("keeps the form open and explains a server error", async () => {
    vi.mocked(api.createVehicle).mockRejectedValue(new ApiError(403, "Admin access required"));
    await renderPage();
    await click("Add vehicle");
    await userEvent.type(screen.getByLabelText("Make"), "Ford");
    await userEvent.type(screen.getByLabelText("Model"), "F-150");
    await userEvent.type(screen.getByLabelText("Category"), "Truck");
    await userEvent.type(screen.getByLabelText(/price/i), "45000");
    await click("Add to lot");
    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
    expect(screen.getByRole("heading", { name: "Add a vehicle" })).toBeInTheDocument();
  });
});

describe("edit", () => {
  it("pre-fills the form and saves changes to the table", async () => {
    vi.mocked(api.updateVehicle).mockResolvedValue({ ...corolla, price: 18999.99 });
    await renderPage();

    await click("Edit Toyota Corolla");
    expect(screen.getByLabelText("Make")).toHaveValue("Toyota");
    await userEvent.clear(screen.getByLabelText(/price/i));
    await userEvent.type(screen.getByLabelText(/price/i), "18999.99");
    await click("Save changes");

    expect(api.updateVehicle).toHaveBeenCalledWith(1, {
      make: "Toyota",
      model: "Corolla",
      category: "Sedan",
      price: 18999.99,
      quantity: 3,
    });
    expect(await screen.findByText("$18,999.99")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Updated Toyota Corolla.");
  });
});

describe("restock", () => {
  it("adds units and shows the new stock level", async () => {
    vi.mocked(api.restock).mockResolvedValue({ ...crv, quantity: 5 });
    await renderPage();

    await click("Restock Honda CR-V");
    await userEvent.type(screen.getByLabelText("Units to add"), "5");
    await click("Add stock");

    expect(api.restock).toHaveBeenCalledWith(2, 5);
    expect(await screen.findByText("5 in stock")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Added 5 units to Honda CR-V. Now 5 in stock.");
  });

  it.each(["0", "-2", "1.5"])("rejects %s units without calling the API", async (bad) => {
    await renderPage();
    await click("Restock Honda CR-V");
    await userEvent.type(screen.getByLabelText("Units to add"), bad);
    await click("Add stock");
    expect(await screen.findByRole("alert")).toHaveTextContent(/whole number from 1 to 100,000/i);
    expect(api.restock).not.toHaveBeenCalled();
  });
});

describe("delete", () => {
  it("asks first, then removes the vehicle", async () => {
    vi.mocked(api.deleteVehicle).mockResolvedValue(undefined);
    await renderPage();

    await click("Delete Toyota Corolla");
    expect(screen.getByRole("heading", { name: "Delete Toyota Corolla?" })).toBeInTheDocument();
    expect(api.deleteVehicle).not.toHaveBeenCalled();

    await click("Delete vehicle");
    expect(api.deleteVehicle).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Toyota Corolla")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Deleted Toyota Corolla.");
  });

  it("does nothing when cancelled", async () => {
    await renderPage();
    await click("Delete Toyota Corolla");
    await click("Cancel");
    expect(api.deleteVehicle).not.toHaveBeenCalled();
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /delete toyota corolla/i })).not.toBeInTheDocument();
  });

  it("keeps the vehicle and says why when the server refuses", async () => {
    vi.mocked(api.deleteVehicle).mockRejectedValue(new ApiError(403, "Admin access required"));
    await renderPage();
    await click("Delete Toyota Corolla");
    await click("Delete vehicle");
    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
    expect(screen.getByText("Toyota Corolla")).toBeInTheDocument();
  });
});
