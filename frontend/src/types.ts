export type Role = "user" | "admin";

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

/** Search filters are kept as strings so they map 1:1 onto form inputs and query params. */
export interface SearchParams {
  make?: string;
  model?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
}

/** What the add/edit form sends. */
export interface VehicleInput {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}
