import type { VehicleInput } from "../types";

export type FieldKey = "make" | "model" | "category" | "price" | "quantity";
export type FormValues = Record<FieldKey, string>;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export const MAX_RESTOCK = 100_000;

export function validateVehicle(values: FormValues): { errors: FieldErrors; input?: VehicleInput } {
  const errors: FieldErrors = {};
  const make = values.make.trim();
  const model = values.model.trim();
  const category = values.category.trim();
  const price = values.price.trim();
  const quantity = values.quantity.trim();

  if (!make) errors.make = "Make is required";
  if (!model) errors.model = "Model is required";
  if (!category) errors.category = "Category is required";
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    errors.price = "Enter a price above 0, with up to 2 decimals.";
  }
  if (!/^\d+$/.test(quantity)) errors.quantity = "Quantity must be a whole number, 0 or more.";

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, input: { make, model, category, price: Number(price), quantity: Number(quantity) } };
}

export function validateRestock(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 && n <= MAX_RESTOCK ? n : null;
}
