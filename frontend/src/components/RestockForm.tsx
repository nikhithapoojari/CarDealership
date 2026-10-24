import { useState } from "react";
import type { FormEvent } from "react";
import { errorMessage } from "../lib/errors";
import { MAX_RESTOCK, validateRestock } from "../lib/vehicleValidation";

interface Props {
  onSubmit: (quantity: number) => Promise<void>;
  onCancel: () => void;
}

export default function RestockForm({ onSubmit, onCancel }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const quantity = validateRestock(value);
    if (quantity === null) {
      setError(`Enter a whole number from 1 to ${MAX_RESTOCK.toLocaleString("en-US")}.`);
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit(quantity);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="block max-w-xs text-sm font-medium">
        Units to add
        <input
          className="mt-1 w-full rounded-sm border border-ink/20 bg-white px-3 py-2 text-sm"
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-sm bg-stop/10 px-3 py-2 text-sm font-medium text-stop">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={pending} className="rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Add stock
        </button>
        <button type="button" onClick={onCancel} className="rounded-sm px-4 py-2 text-sm font-semibold underline underline-offset-4">
          Cancel
        </button>
      </div>
    </form>
  );
}
