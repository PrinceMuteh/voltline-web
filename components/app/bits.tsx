"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

/** A green badge whose check draws in (520 ms), for "all set", "started" and receipts. */
export function CheckBadge({ tone = "volt" }: { tone?: "volt" | "warning" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mx-auto grid size-16 place-items-center rounded-full text-white",
        tone === "volt" ? "bg-volt" : "bg-warning",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        {tone === "volt" ? (
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw [stroke-dasharray:24] [stroke-dashoffset:24]"
          />
        ) : (
          <path
            d="M12 7v6m0 4h.01"
            strokeLinecap="round"
            className="animate-draw [stroke-dasharray:24] [stroke-dashoffset:24]"
          />
        )}
      </svg>
    </span>
  );
}

/** The charging ring: a green arc that fills linearly with `value` (0–1). */
export function ProgressRing({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  const r = 88;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-[220px]">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="var(--color-subtle)"
          strokeWidth="12"
        />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/** "1.8 km" between two points, or null without both. */
export function distanceKm(
  from: { lat: number; lng: number } | null,
  to: { latitude: number | null; longitude: number | null },
) {
  if (!from || to.latitude === null || to.longitude === null) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(to.latitude - from.lat);
  const dLng = rad(to.longitude - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.lat)) *
      Math.cos(rad(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const PLUG_LABEL = {
  CCS2: "CCS2",
  TYPE2: "Type 2",
  CHADEMO: "CHAdeMO",
} as const;

/** Where the driver allowed us to read their location (kept only on this device). */
export function storedLocation(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem("vl-location");
    return raw ? (JSON.parse(raw) as { lat: number; lng: number }) : null;
  } catch {
    return null;
  }
}

export function storeLocation(loc: { lat: number; lng: number } | null) {
  try {
    if (loc) localStorage.setItem("vl-location", JSON.stringify(loc));
    else localStorage.removeItem("vl-location");
    window.dispatchEvent(new Event("vl-location"));
  } catch {
    // Private mode: the app still works, just without distances
  }
}

/** navigator.onLine as state; true while prerendering. */
export function useOnline() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

const LOCATION_EVENT = "vl-location";

/** The location the driver allowed, kept in localStorage and shared across screens. */
export function useStoredLocation() {
  const raw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(LOCATION_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(LOCATION_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => {
      try {
        return localStorage.getItem("vl-location");
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(
    () => (raw ? (JSON.parse(raw) as { lat: number; lng: number }) : null),
    [raw],
  );
}
