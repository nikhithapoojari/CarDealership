import type { SearchParams, Vehicle, VehicleInput } from "../types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const TOKEN_KEY = "lotline.token";

export const AUTH_EXPIRED_EVENT = "auth:expired";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Turns FastAPI's `detail` (string or validation-error list) into one readable line. */
function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] };
    if (!first?.msg) return null;
    const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : "";
    return field && field !== "body" ? `${field}: ${first.msg}` : first.msg;
  }
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) {
      // The session is no longer valid: drop it and let the app send the user to /login.
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(res.status, extractMessage(data) ?? (res.statusText || "Something went wrong"));
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string; role: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  searchVehicles: (params: SearchParams = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim()) qs.set(key, value.trim());
    });
    const query = qs.toString();
    return request<Vehicle[]>(`/api/vehicles/search${query ? `?${query}` : ""}`);
  },

  purchase: (id: number) => request<Vehicle>(`/api/vehicles/${id}/purchase`, { method: "POST" }),

  // Admin operations (the server enforces roles; the UI only shows these to admins).
  createVehicle: (input: VehicleInput) =>
    request<Vehicle>("/api/vehicles", { method: "POST", body: JSON.stringify(input) }),

  updateVehicle: (id: number, input: Partial<VehicleInput>) =>
    request<Vehicle>(`/api/vehicles/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteVehicle: (id: number) => request<void>(`/api/vehicles/${id}`, { method: "DELETE" }),

  restock: (id: number, quantity: number) =>
    request<Vehicle>(`/api/vehicles/${id}/restock`, { method: "POST", body: JSON.stringify({ quantity }) }),
};
