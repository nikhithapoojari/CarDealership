import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import VehicleForm from "./VehicleForm";

function setup(props: Partial<ComponentProps<typeof VehicleForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(<VehicleForm submitLabel="Add to lot" onSubmit={onSubmit} onCancel={onCancel} {...props} />);
  return { onSubmit, onCancel };
}

async function fillValid() {
  await userEvent.type(screen.getByLabelText("Make"), "  Ford ");
  await userEvent.type(screen.getByLabelText("Model"), "F-150");
  await userEvent.type(screen.getByLabelText("Category"), "Truck");
  await userEvent.type(screen.getByLabelText(/price/i), "44999.50");
}

describe("VehicleForm", () => {
  it("starts empty with quantity 0 for a new vehicle", () => {
    setup();
    expect(screen.getByLabelText("Make")).toHaveValue("");
    expect(screen.getByLabelText(/quantity/i)).toHaveValue(0);
  });

  it("pre-fills every field when editing", () => {
    setup({ initial: { make: "Toyota", model: "Corolla", category: "Sedan", price: 20000, quantity: 3 } });
    expect(screen.getByLabelText("Make")).toHaveValue("Toyota");
    expect(screen.getByLabelText("Model")).toHaveValue("Corolla");
    expect(screen.getByLabelText("Category")).toHaveValue("Sedan");
    expect(screen.getByLabelText(/price/i)).toHaveValue(20000);
    expect(screen.getByLabelText(/quantity/i)).toHaveValue(3);
  });

  it("explains every missing field and does not submit", async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Add to lot" }));
    expect(screen.getByText("Make is required")).toBeInTheDocument();
    expect(screen.getByText("Model is required")).toBeInTheDocument();
    expect(screen.getByText("Category is required")).toBeInTheDocument();
    expect(screen.getByText(/enter a price above 0/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a zero price", async () => {
    const { onSubmit } = setup();
    await fillValid();
    await userEvent.clear(screen.getByLabelText(/price/i));
    await userEvent.type(screen.getByLabelText(/price/i), "0");
    await userEvent.click(screen.getByRole("button", { name: "Add to lot" }));
    expect(screen.getByText(/enter a price above 0/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(["-1", "1.5"])("rejects quantity %s", async (bad) => {
    const { onSubmit } = setup();
    await fillValid();
    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), bad);
    await userEvent.click(screen.getByRole("button", { name: "Add to lot" }));
    expect(screen.getByText(/whole number, 0 or more/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed text and numeric price and quantity", async () => {
    const { onSubmit } = setup();
    await fillValid();
    await userEvent.clear(screen.getByLabelText(/quantity/i));
    await userEvent.type(screen.getByLabelText(/quantity/i), "4");
    await userEvent.click(screen.getByRole("button", { name: "Add to lot" }));
    expect(onSubmit).toHaveBeenCalledWith({
      make: "Ford",
      model: "F-150",
      category: "Truck",
      price: 44999.5,
      quantity: 4,
    });
  });

  it("shows the server's message when saving fails", async () => {
    const { onSubmit } = setup();
    onSubmit.mockRejectedValue(new ApiError(422, "price: Input should be greater than 0"));
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Add to lot" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("price: Input should be greater than 0");
  });

  it("calls onCancel", async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
