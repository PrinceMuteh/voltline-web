"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PLUG_LABEL, ProgressRing, useOnline } from "@/components/app/bits";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api/client";
import { driverKeys, useLiveSession } from "@/lib/api/driver";
import { duration, kw, naira } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/** The live session: kWh in a ring, battery, time, cost so far and the auto-stop budget. */
export function ChargingView() {
  const { data: s, isPending, dataUpdatedAt } = useLiveSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const [stopping, setStopping] = useState(false);
  const offline = !useOnline();

  // Ended (stop, unplug, budget or a fault): show the receipt
  useEffect(() => {
    if (s?.endedAt) router.replace(`/app/receipt/${s.id}`);
  }, [s?.endedAt, s?.id, router]);

  const stop = async () => {
    if (!s) return;
    setStopping(true);
    const { error } = await api.POST("/v1/app/sessions/{id}/stop", {
      params: { path: { id: s.id } },
    });
    if (error) {
      setStopping(false);
      toast.error("Not stopped", { description: errorMessage(error) });
      return;
    }
    void queryClient.invalidateQueries({ queryKey: driverKeys.live });
  };

  if (isPending) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 pt-16">
        <Skeleton className="size-[220px] rounded-full" />
      </main>
    );
  }
  if (!s) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[22px] font-semibold">No session running</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Find a charger to start one.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex h-12 items-center rounded-control bg-ink px-6 text-[16px] font-medium text-white"
        >
          Find a charger
        </Link>
      </main>
    );
  }

  const minutes = (now - Date.parse(s.startedAt)) / 60_000;
  // The ring fills with the battery when the car reports it, otherwise towards the budget
  const fill =
    s.socPct !== null
      ? s.socPct / 100
      : s.autoStopKobo
        ? s.costKobo / s.autoStopKobo
        : 0;

  return (
    <main className="flex flex-1 flex-col px-6 pt-4 pb-8">
      {offline && (
        <p
          role="status"
          className="-mx-6 -mt-4 mb-4 bg-ink px-4 py-2 text-center text-[13.5px] text-white"
        >
          Your phone lost signal, but the charger does not need it. Charging
          continues; last update{" "}
          {new Date(dataUpdatedAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      )}
      <Link
        href="/app"
        className="-ml-2 self-start rounded-control px-2 py-1 text-[15px] text-ink-2 hover:bg-subtle"
      >
        ← Map
      </Link>
      <p className="mt-2 text-center text-[14.5px] text-ink-2">
        {s.stationName} ·{" "}
        {s.connectorType ? PLUG_LABEL[s.connectorType] : "Connector"} EVSE{" "}
        {s.evseId}
      </p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef2fd] px-2.5 py-0.5 text-[13px] font-medium text-charging">
          <span
            aria-hidden
            className="size-1.5 animate-pulse-quiet rounded-full bg-charging"
          />
          {s.idle ? "Finished, still plugged in" : "Charging"}
        </span>
        {s.powerW !== null && !s.idle && (
          <span className="tabular rounded-full bg-subtle px-2.5 py-0.5 text-[13px] font-medium">
            {kw(s.powerW)}
          </span>
        )}
      </div>

      <div className="mt-6">
        <ProgressRing value={fill}>
          <span className="nums text-[40px] leading-none font-semibold tracking-[-0.02em]">
            {(s.energyWh / 1000).toFixed(1)}
          </span>
          <span className="text-[14px] text-ink-3">kWh delivered</span>
          {s.socPct !== null && (
            <span className="mt-2 text-[14px] font-medium">
              Battery {s.socPct}%
            </span>
          )}
        </ProgressRing>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
        <Fact label="Time">{duration(minutes)}</Fact>
        <Fact label="Cost so far">{naira(s.costKobo)}</Fact>
        <Fact label="Auto-stop">
          {s.autoStopKobo ? naira(s.autoStopKobo) : "Off"}
        </Fact>
      </dl>
      {s.idle && (
        <p className="mt-4 rounded-lg bg-[#fbf0eb] px-3 py-2 text-[13.5px] text-warning">
          Your car has stopped charging. Unplug soon: an idle fee may start
          after the grace period.
        </p>
      )}
      <p className="mt-6 text-center text-[14px] text-ink-3">
        You can leave. We will notify you when it is done.
      </p>

      <div className="mt-auto pt-6">
        {stopping ? (
          <p className="text-center text-[15px] text-ink-2" aria-live="polite">
            Stopping… waiting for the charger to confirm.
          </p>
        ) : (
          <HoldToConfirm
            holdMs={1500}
            onConfirm={() => void stop()}
            className="h-12 w-full text-[16px]"
          >
            Hold to stop charging
          </HoldToConfirm>
        )}
      </div>
    </main>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-subtle px-2 py-3">
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="nums mt-0.5 text-[16px] font-semibold">{children}</dd>
    </div>
  );
}
