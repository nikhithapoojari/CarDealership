const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatPrice = (n: number) => (Number.isInteger(n) ? whole : cents).format(n);

export type StockTone = "go" | "low" | "stop";

export function stockInfo(quantity: number): { label: string; tone: StockTone } {
  if (quantity <= 0) return { label: "Out of stock", tone: "stop" };
  if (quantity <= 3) return { label: `Only ${quantity} left`, tone: "low" };
  return { label: `${quantity} in stock`, tone: "go" };
}
