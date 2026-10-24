import { ApiError } from "../api/client";

/** Server messages are written for people; anything else gets a generic line. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
  return err instanceof ApiError ? err.message : fallback;
}
