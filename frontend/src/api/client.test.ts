import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, AUTH_EXPIRED_EVENT, tokenStore } from "./client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
});

describe("api client", () => {
  it("sends the stored token as a Bearer header", async () => {
    tokenStore.set("abc.def.ghi");
    fetchMock.mockResolvedValue(json([]));
    await api.searchVehicles();
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer abc.def.ghi");
  });

  it("omits blank filters from the search query", async () => {
    fetchMock.mockResolvedValue(json([]));
    await api.searchVehicles({ make: "honda", model: "  ", min_price: "10000" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/vehicles/search?make=honda&min_price=10000");
  });

  it("uses a plain endpoint when no filters are set", async () => {
    fetchMock.mockResolvedValue(json([]));
    await api.searchVehicles({ make: "" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/vehicles/search");
  });

  it("throws ApiError with the server's detail message", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Vehicle is out of stock" }, 409));
    await expect(api.purchase(1)).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "Vehicle is out of stock",
    });
  });

  it("reads FastAPI validation errors", async () => {
    fetchMock.mockResolvedValue(
      json({ detail: [{ loc: ["body", "email"], msg: "value is not a valid email address" }] }, 422),
    );
    await expect(api.register("x", "password123")).rejects.toThrow("email: value is not a valid email address");
  });

  it("clears the session and announces it on 401 when a token was sent", async () => {
    tokenStore.set("abc.def.ghi");
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    fetchMock.mockResolvedValue(json({ detail: "Not authenticated" }, 401));
    await expect(api.searchVehicles()).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.get()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it("does not treat a failed login as an expired session", async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    fetchMock.mockResolvedValue(json({ detail: "Invalid email or password" }, 401));
    await expect(api.login("a@b.com", "wrong-password")).rejects.toThrow("Invalid email or password");
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it("reports an unreachable server as status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.searchVehicles()).rejects.toMatchObject({ status: 0 });
  });
});
