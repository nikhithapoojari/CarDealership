import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const input = { make: "Ford", model: "F-150", category: "Truck", price: 45000, quantity: 2 };

beforeEach(() => {
  fetchMock.mockReset();
});

describe("admin API calls", () => {
  it("creates a vehicle with a JSON body", async () => {
    fetchMock.mockResolvedValue(json({ id: 9, ...input }, 201));
    const created = await api.createVehicle(input);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vehicles");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(input);
    expect(created.id).toBe(9);
  });

  it("updates a vehicle with PUT", async () => {
    fetchMock.mockResolvedValue(json({ id: 9, ...input, price: 1 }));
    await api.updateVehicle(9, { price: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vehicles/9");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ price: 1 });
  });

  it("deletes a vehicle and accepts an empty 204 response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteVehicle(9)).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vehicles/9");
    expect(init.method).toBe("DELETE");
  });

  it("restocks by posting the quantity", async () => {
    fetchMock.mockResolvedValue(json({ id: 9, ...input, quantity: 7 }));
    await api.restock(9, 5);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/vehicles/9/restock");
    expect(JSON.parse(init.body)).toEqual({ quantity: 5 });
  });
});
