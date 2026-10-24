import { useState } from "react";
import type { FormEvent } from "react";
import { errorMessage } from "../lib/errors";
import { validateVehicle } from "../lib/vehicleValidation";
import type { FieldErrors, FieldKey, FormValues } from "../lib/vehicleValidation";
import type { VehicleInput } from "../types";

interface Props {
  initial?: VehicleInput;
  submitLabel: string;
  onSubmit: (input: VehicleInput) => Promise<void>;
  onCancel: () => void;
}

const FIELDS: { key: FieldKey; label: string; type: "text" | "number"; maxLength?: number; step?: string }[] = [
  { key: "make", label: "Make", type: "text", maxLength: 100 },
  { key: "model", label: "Model", type: "text", maxLength: 100 },
  { key: "category", label: "Category", type: "text", maxLength: 50 },
  { key: "price", label: "Price (USD)", type: "number", step: "0.01" },
  { key: "quantity", label: "Quantity in stock", type: "number", step: "1" },
];

const inputClass = "mt-1 w-full rounded-sm border border-ink/20 bg-white px-3 py-2 text-sm";

export default function VehicleForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>({
    make: initial?.make ?? "",
    model: initial?.model ?? "",
    category: initial?.category ?? "",
    price: initial ? String(initial.price) : "",
    quantity: initial ? String(initial.quantity) : "0",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const result = validateVehicle(values);
    setErrors(result.errors);
    if (!result.input) return;

    setPending(true);
    try {
      await onSubmit(result.input);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type, maxLength, step }) => (
          <label key={key} className="text-sm font-medium">
            {label}
            <input
              className={inputClass}
              type={type}
              step={step}
              min={type === "number" ? 0 : undefined}
              maxLength={maxLength}
              value={values[key]}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
            {errors[key] && (
              <span id={`${key}-error`} className="mt-1 block text-xs font-medium text-stop">
                {errors[key]}
              </span>
            )}
          </label>
        ))}
      </div>

      {serverError && (
        <p role="alert" className="mt-4 rounded-sm bg-stop/10 px-3 py-2 text-sm font-medium text-stop">
          {serverError}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-sm px-4 py-2 text-sm font-semibold underline underline-offset-4">
          Cancel
        </button>
      </div>
    </form>
  );
}
