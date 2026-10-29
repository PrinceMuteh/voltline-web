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

/** Backend-free demo: the app answers its own API calls from sample data (lib/demo). */
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** The network, or in the demo the in-browser API (loaded only then). */
async function send(request: Request): Promise<Response> {
  if (DEMO) {
    const { demoFetch } = await import("../demo/demo-api");
    return demoFetch(request);
  }
  return fetch(request);
}

/** Downloads a file from the API (e.g. the sessions CSV) under the given name. */
export async function download(path: string, filename: string) {
  const response = await send(
    new Request(new URL(`/api${path}`, window.location.href)),
  );
  if (!response.ok) throw new Error("Download failed");
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  link.click();
  URL.revokeObjectURL(url);
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, shared by every request that hit a 401 meanwhile. */
function refreshSession(): Promise<boolean> {
  refreshing ??= send(
    new Request(new URL("/api/v1/auth/refresh", window.location.href), {
      method: "POST",
    }),
  )
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function fetchWithRefresh(request: Request): Promise<Response> {
  const retry = request.clone();
  const response = await send(request);
  const path = new URL(request.url).pathname;
  if (response.status !== 401 || path.startsWith("/api/v1/auth/")) {
    return response;
  }
  // The driver app has its own long-lived sign-in and no refresh: back to its welcome screen
  if (path.startsWith("/api/v1/app/")) {
    if (
      !path.startsWith("/api/v1/app/auth/") &&
      window.location.pathname.startsWith("/app") &&
      !window.location.pathname.startsWith("/app/welcome")
    ) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/app/welcome");
    }
    return response;
  }
  if (await refreshSession()) {
    return send(retry);
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
