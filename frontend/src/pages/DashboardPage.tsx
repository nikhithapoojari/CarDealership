import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import SearchFilters, { EMPTY_FILTERS } from "../components/SearchFilters";
import type { Filters } from "../components/SearchFilters";
import VehicleCard from "../components/VehicleCard";
import { useDebounce } from "../hooks/useDebounce";
import type { Vehicle } from "../types";

type Status = "loading" | "ready" | "error";

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const debouncedFilters = useDebounce(filters, 300);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false; // a slower, older response must not overwrite a newer one
    api
      .searchVehicles(debouncedFilters)
      .then((data) => {
        if (ignore) return;
        setVehicles(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof ApiError ? err.message : "Could not load vehicles.");
        setStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [debouncedFilters, reloadKey]);

  const handlePurchase = useCallback(async (vehicle: Vehicle) => {
    setBuyingId(vehicle.id);
    setNotice(null);
    try {
      const updated = await api.purchase(vehicle.id);
      setVehicles((list) => list.map((v) => (v.id === updated.id ? updated : v)));
      setNotice(`Purchased 1 × ${vehicle.make} ${vehicle.model}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Someone else bought the last one first.
        setVehicles((list) => list.map((v) => (v.id === vehicle.id ? { ...v, quantity: 0 } : v)));
        setNotice(`The ${vehicle.make} ${vehicle.model} just sold out.`);
      } else {
        setNotice(err instanceof ApiError ? err.message : "Purchase failed. Try again.");
      }
    } finally {
      setBuyingId(null);
    }
  }, []);

  function retry() {
    setStatus("loading");
    setError(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">On the lot</h1>
        {status === "ready" && (
          <p className="text-sm text-mute">
            {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
          </p>
        )}
      </div>

      <SearchFilters value={filters} onChange={setFilters} />

      <div role="status" aria-live="polite" className="min-h-[2.5rem] pt-3 text-sm font-medium">
        {notice}
      </div>

      {status === "loading" && <p className="py-12 text-center text-mute">Loading inventory…</p>}

      {status === "error" && (
        <div role="alert" className="rounded-md bg-white p-6 text-center ring-1 ring-stop/40">
          <p className="font-semibold text-stop">{error}</p>
          <button type="button" onClick={retry} className="mt-3 rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      )}

      {status === "ready" && vehicles.length === 0 && (
        <div className="rounded-md bg-white p-8 text-center ring-1 ring-ink/10">
          <p className="font-semibold">No vehicles match these filters.</p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-2 text-sm font-semibold underline underline-offset-4"
          >
            Clear filters to see the full lot
          </button>
        </div>
      )}

      {status === "ready" && vehicles.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onPurchase={handlePurchase} purchasing={buyingId === v.id} />
          ))}
        </div>
      )}
    </div>
  );
}
