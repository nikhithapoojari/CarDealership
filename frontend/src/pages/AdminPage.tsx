import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import DeleteConfirm from "../components/DeleteConfirm";
import RestockForm from "../components/RestockForm";
import VehicleForm from "../components/VehicleForm";
import { errorMessage } from "../lib/errors";
import { formatPrice, stockInfo } from "../lib/format";
import type { StockTone } from "../lib/format";
import type { Vehicle } from "../types";

type Panel =
  | { kind: "add" }
  | { kind: "edit"; vehicle: Vehicle }
  | { kind: "restock"; vehicle: Vehicle }
  | { kind: "delete"; vehicle: Vehicle }
  | null;

const toneClass: Record<StockTone, string> = { go: "text-go", low: "text-low", stop: "text-stop" };
const nameOf = (v: Vehicle) => `${v.make} ${v.model}`;
const rowButton = "rounded-sm px-2 py-1 text-sm font-semibold underline underline-offset-4";

export default function AdminPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ignore = false;
    api
      .searchVehicles({})
      .then((data) => {
        if (ignore) return;
        setVehicles(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(errorMessage(err, "Could not load vehicles."));
        setStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Move keyboard focus into a newly opened panel so the form is the next thing reached.
  useEffect(() => {
    if (panel) panelRef.current?.focus();
  }, [panel]);

  const replace = (updated: Vehicle) =>
    setVehicles((list) => list.map((v) => (v.id === updated.id ? updated : v)));

  function done(message: string) {
    setNotice(message);
    setPanel(null);
  }

  async function handleAdd(input: Parameters<typeof api.createVehicle>[0]) {
    const created = await api.createVehicle(input);
    setVehicles((list) => [...list, created]);
    done(`Added ${nameOf(created)}.`);
  }

  async function handleEdit(vehicle: Vehicle, input: Parameters<typeof api.createVehicle>[0]) {
    const updated = await api.updateVehicle(vehicle.id, input);
    replace(updated);
    done(`Updated ${nameOf(updated)}.`);
  }

  async function handleRestock(vehicle: Vehicle, quantity: number) {
    const updated = await api.restock(vehicle.id, quantity);
    replace(updated);
    done(
      `Added ${quantity} ${quantity === 1 ? "unit" : "units"} to ${nameOf(updated)}. Now ${updated.quantity} in stock.`,
    );
  }

  async function handleDelete(vehicle: Vehicle) {
    await api.deleteVehicle(vehicle.id);
    setVehicles((list) => list.filter((v) => v.id !== vehicle.id));
    done(`Deleted ${nameOf(vehicle)}.`);
  }

  const title =
    panel?.kind === "add"
      ? "Add a vehicle"
      : panel?.kind === "edit"
        ? `Edit ${nameOf(panel.vehicle)}`
        : panel?.kind === "restock"
          ? `Restock ${nameOf(panel.vehicle)}`
          : panel?.kind === "delete"
            ? `Delete ${nameOf(panel.vehicle)}?`
            : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Manage inventory</h1>
        <button
          type="button"
          onClick={() => setPanel({ kind: "add" })}
          className="rounded-sm bg-stripe px-4 py-2 text-sm font-semibold text-ink hover:bg-stripe-dark"
        >
          Add vehicle
        </button>
      </div>

      {panel && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-label={title}
          className="mb-6 rounded-md border-t-4 border-stripe bg-white p-5 ring-1 ring-ink/10 focus:outline-none"
        >
          <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
          {panel.kind === "add" && (
            <VehicleForm submitLabel="Add to lot" onSubmit={handleAdd} onCancel={() => setPanel(null)} />
          )}
          {panel.kind === "edit" && (
            <VehicleForm
              key={panel.vehicle.id}
              initial={{
                make: panel.vehicle.make,
                model: panel.vehicle.model,
                category: panel.vehicle.category,
                price: panel.vehicle.price,
                quantity: panel.vehicle.quantity,
              }}
              submitLabel="Save changes"
              onSubmit={(input) => handleEdit(panel.vehicle, input)}
              onCancel={() => setPanel(null)}
            />
          )}
          {panel.kind === "restock" && (
            <RestockForm
              key={panel.vehicle.id}
              onSubmit={(q) => handleRestock(panel.vehicle, q)}
              onCancel={() => setPanel(null)}
            />
          )}
          {panel.kind === "delete" && (
            <DeleteConfirm
              key={panel.vehicle.id}
              onConfirm={() => handleDelete(panel.vehicle)}
              onCancel={() => setPanel(null)}
            />
          )}
        </section>
      )}

      <div role="status" aria-live="polite" className="min-h-[1.5rem] pb-3 text-sm font-medium">
        {notice}
      </div>

      {status === "loading" && <p className="py-12 text-center text-mute">Loading inventory…</p>}

      {status === "error" && (
        <div role="alert" className="rounded-md bg-white p-6 text-center ring-1 ring-stop/40">
          <p className="font-semibold text-stop">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setReloadKey((k) => k + 1);
            }}
            className="mt-3 rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {status === "ready" && vehicles.length === 0 && (
        <div className="rounded-md bg-white p-8 text-center ring-1 ring-ink/10">
          <p className="font-semibold">No vehicles on the lot yet.</p>
          <button
            type="button"
            onClick={() => setPanel({ kind: "add" })}
            className="mt-2 text-sm font-semibold underline underline-offset-4"
          >
            Add the first vehicle
          </button>
        </div>
      )}

      {status === "ready" && vehicles.length > 0 && (
        <div className="overflow-x-auto rounded-md bg-white ring-1 ring-ink/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b-2 border-ink/15">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Vehicle</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {vehicles.map((v) => {
                const stock = stockInfo(v.quantity);
                const name = nameOf(v);
                return (
                  <tr key={v.id}>
                    <th scope="row" className="px-4 py-3 font-semibold">{name}</th>
                    <td className="px-4 py-3">{v.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPrice(v.price)}</td>
                    <td className={`px-4 py-3 font-semibold ${toneClass[stock.tone]}`}>{stock.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button type="button" aria-label={`Edit ${name}`} className={rowButton} onClick={() => setPanel({ kind: "edit", vehicle: v })}>
                          Edit
                        </button>
                        <button type="button" aria-label={`Restock ${name}`} className={rowButton} onClick={() => setPanel({ kind: "restock", vehicle: v })}>
                          Restock
                        </button>
                        <button type="button" aria-label={`Delete ${name}`} className={`${rowButton} text-stop`} onClick={() => setPanel({ kind: "delete", vehicle: v })}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
