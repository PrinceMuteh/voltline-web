"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { Schemas } from "@/lib/api/client";
import { since } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type Alert = Schemas["AlertDto"];

const marker: Record<Alert["type"], string> = {
  CHARGER_FAULTED: "bg-warning",
  CHARGER_OFFLINE: "bg-ink-3",
  FIRMWARE_AVAILABLE: "bg-charging",
  PAYMENT_FAILED: "bg-error",
};

/** Open alerts, newest first, each with the one action that deals with it. */
export function NeedsAttention({
  alerts,
  onInspect,
  limit,
}: {
  alerts: Alert[] | undefined;
  onInspect: (chargerId: string) => void;
  limit?: number;
}) {
  const now = useNow(30_000);

  if (!alerts) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (alerts.length === 0) {
    return (
      <p className="text-[14px] text-ink-3">
        Nothing needs attention. We raise an alert when a charger reports a
        fault or goes quiet for longer than your offline window.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {alerts.slice(0, limit).map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className={`mt-2 size-1.5 shrink-0 rounded-full ${marker[a.type]}`}
            />
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{a.title}</p>
              <p className="truncate text-[13px] text-ink-3">
                {a.detail}
                {a.type === "CHARGER_FAULTED" &&
                  ` · ${since(a.createdAt, now)} ago`}
              </p>
            </div>
          </div>
          {a.type === "FIRMWARE_AVAILABLE" ? (
            <Link
              href="/console/firmware"
              className="inline-flex h-8 shrink-0 items-center rounded-control border border-line-strong px-3 text-[13.5px] font-medium hover:bg-subtle"
            >
              Schedule
            </Link>
          ) : a.chargerId ? (
            <button
              type="button"
              onClick={() => onInspect(a.chargerId!)}
              className="inline-flex h-8 shrink-0 items-center rounded-control border border-line-strong px-3 text-[13.5px] font-medium transition-transform duration-160 ease-out hover:bg-subtle active:scale-[0.97]"
            >
              Inspect
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
