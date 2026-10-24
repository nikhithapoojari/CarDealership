import { formatPrice, stockInfo } from "../lib/format";
import type { StockTone } from "../lib/format";
import type { Vehicle } from "../types";

const toneClass: Record<StockTone, string> = {
  go: "text-go",
  low: "text-low",
  stop: "text-stop",
};

interface Props {
  vehicle: Vehicle;
  onPurchase: (vehicle: Vehicle) => void;
  purchasing?: boolean;
}

export default function VehicleCard({ vehicle, onPurchase, purchasing = false }: Props) {
  const stock = stockInfo(vehicle.quantity);
  const soldOut = vehicle.quantity <= 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-md bg-white ring-1 ring-ink/10">
      <div className="p-5 pb-4">
        <p className="text-sm font-medium text-mute">{vehicle.make}</p>
        <h3 className="font-display text-2xl font-bold leading-tight">{vehicle.model}</h3>
        <span className="mt-2 inline-block rounded-sm bg-floor px-2 py-0.5 text-xs font-medium">
          {vehicle.category}
        </span>
      </div>

      {/* The window-sticker band: the price is the first thing a buyer reads. */}
      <div className="border-y-2 border-dashed border-ink/25 bg-stripe/25 px-5 py-3">
        <p className="font-display text-3xl font-extrabold tabular-nums">{formatPrice(vehicle.price)}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 p-5">
        <p className={`text-sm font-semibold ${toneClass[stock.tone]}`}>{stock.label}</p>
        <button
          type="button"
          onClick={() => onPurchase(vehicle)}
          disabled={soldOut || purchasing}
          className="rounded-sm bg-stripe px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-stripe-dark disabled:cursor-not-allowed disabled:bg-floor disabled:text-mute"
        >
          Purchase
        </button>
      </div>
    </article>
  );
}
