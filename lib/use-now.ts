"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, refreshed every `everyMs`, for "12 s ago" style labels.
 * Rounded to the interval so React sees a stable value between ticks; 0 while prerendering.
 */
export function useNow(everyMs = 1000) {
  return useSyncExternalStore(
    (onTick) => {
      const id = setInterval(onTick, everyMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / everyMs) * everyMs,
    () => 0,
  );
}
