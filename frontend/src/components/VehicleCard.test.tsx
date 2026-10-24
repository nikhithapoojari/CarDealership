import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Vehicle } from "../types";
import VehicleCard from "./VehicleCard";

const car: Vehicle = { id: 7, make: "Toyota", model: "Corolla", category: "Sedan", price: 20000, quantity: 5 };

describe("VehicleCard", () => {
  it("shows make, model, category, price and stock", () => {
    render(<VehicleCard vehicle={car} onPurchase={() => {}} />);
    expect(screen.getByText("Corolla")).toBeInTheDocument();
    expect(screen.getByText("Toyota")).toBeInTheDocument();
    expect(screen.getByText("Sedan")).toBeInTheDocument();
    expect(screen.getByText("$20,000")).toBeInTheDocument();
    expect(screen.getByText("5 in stock")).toBeInTheDocument();
  });

  it("shows cents when the price has them", () => {
    render(<VehicleCard vehicle={{ ...car, price: 18999.99 }} onPurchase={() => {}} />);
    expect(screen.getByText("$18,999.99")).toBeInTheDocument();
  });

  it("calls onPurchase with the vehicle when Purchase is clicked", async () => {
    const onPurchase = vi.fn();
    render(<VehicleCard vehicle={car} onPurchase={onPurchase} />);
    await userEvent.click(screen.getByRole("button", { name: /purchase/i }));
    expect(onPurchase).toHaveBeenCalledWith(car);
  });

  it("disables Purchase when quantity is zero", async () => {
    const onPurchase = vi.fn();
    render(<VehicleCard vehicle={{ ...car, quantity: 0 }} onPurchase={onPurchase} />);
    const button = screen.getByRole("button", { name: /purchase/i });
    expect(button).toBeDisabled();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    await userEvent.click(button);
    expect(onPurchase).not.toHaveBeenCalled();
  });

  it("warns when only a few are left", () => {
    render(<VehicleCard vehicle={{ ...car, quantity: 2 }} onPurchase={() => {}} />);
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });

  it("disables Purchase while a purchase is in flight", () => {
    render(<VehicleCard vehicle={car} onPurchase={() => {}} purchasing />);
    expect(screen.getByRole("button", { name: /purchase/i })).toBeDisabled();
  });
});
