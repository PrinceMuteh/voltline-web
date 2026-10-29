import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];

/** Error body produced by NestJS exceptions and the ValidationPipe. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as ApiErrorBody).message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    if (typeof message === "string") return message;
  }
  return fallback;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, shared by every request that hit a 401 meanwhile. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function fetchWithRefresh(request: Request): Promise<Response> {
  const retry = request.clone();
  const response = await fetch(request);
  if (
    response.status !== 401 ||
    new URL(request.url).pathname.startsWith("/api/v1/auth/")
  ) {
    return response;
  }
  if (await refreshSession()) {
    return fetch(retry);
  }
  if (window.location.pathname.startsWith("/console")) {
    const next = encodeURIComponent(window.location.pathname);
    // A full page load on purpose: it drops every cached query of the expired session
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/console/sign-in?next=${next}`);
  }
  return response;
}

/**
 * Typed client for voltline-api, generated from its OpenAPI spec (`npm run gen:api`).
 * Requests go to /api on this origin; next.config.ts rewrites them to the API.
 */
export const api = createClient<paths>({
  baseUrl: "/api",
  fetch: fetchWithRefresh,
});
