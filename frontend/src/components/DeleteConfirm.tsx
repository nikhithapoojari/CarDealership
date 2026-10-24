import { useState } from "react";
import { errorMessage } from "../lib/errors";

interface Props {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirm({ onConfirm, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-sm">This removes the vehicle from the lot for everyone. You can't undo it.</p>
      {error && (
        <p role="alert" className="mt-3 rounded-sm bg-stop/10 px-3 py-2 text-sm font-medium text-stop">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-sm bg-stop px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Delete vehicle
        </button>
        <button type="button" onClick={onCancel} className="rounded-sm px-4 py-2 text-sm font-semibold underline underline-offset-4">
          Cancel
        </button>
      </div>
    </div>
  );
}
