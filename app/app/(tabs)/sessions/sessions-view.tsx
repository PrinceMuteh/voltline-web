"use client";

import Link from "next/link";
import { PLUG_LABEL } from "@/components/app/bits";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useHistory, useLiveSession } from "@/lib/api/driver";
import { duration, kwh, naira } from "@/lib/format";

/** "October · 61.4 kWh · ₦ 18,420", then every session with a link to its receipt. */
export function DriverSessionsView() {
  const { data, error } = useHistory();
  const { data: live } = useLiveSession(false);

  return (
    <main className="px-5 pt-6">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Sessions</h1>
      {data && (
        <p className="nums mt-1 text-[15px] text-ink-2">
          {data.month} · {kwh(data.monthEnergyWh)} ·{" "}
          {naira(data.monthAmountKobo)}
        </p>
      )}
      {live && !live.endedAt && (
        <Link
          href="/app/charging"
          className="mt-4 flex items-center justify-between rounded-xl bg-[#eef2fd] px-4 py-3 text-[15px] text-charging"
        >
          <span className="font-medium">
            Charging now at {live.stationName}
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
      {error && (
        <p role="alert" className="mt-4 text-[14px] text-error">
          {errorMessage(error)}
        </p>
      )}
      <ul className="mt-4 divide-y divide-line">
        {!data &&
          [0, 1, 2].map((i) => (
            <li key={i} className="py-3">
              <Skeleton className="h-10 w-full" />
            </li>
          ))}
        {data?.sessions
          .filter((s) => s.endedAt)
          .map((s) => {
            const day = new Date(s.startedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
            });
            const minutes =
              (Date.parse(s.endedAt!) - Date.parse(s.startedAt)) / 60_000;
            return (
              <li key={s.id}>
                <Link
                  href={`/app/receipt/${s.id}`}
                  className="flex items-center gap-4 py-3"
                >
                  <span className="nums w-8 text-[20px] font-semibold text-ink-2">
                    {day}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-medium">
                      {s.stationName}
                    </span>
                    <span className="block text-[13.5px] text-ink-3">
                      {s.connectorType
                        ? `${PLUG_LABEL[s.connectorType]} · `
                        : ""}
                      {kwh(s.energyWh)} · {duration(minutes)}
                      {s.status === "STOPPED_BY_FAULT" &&
                        " · stopped by charger"}
                    </span>
                  </span>
                  <span className="nums text-[15px] font-medium">
                    {naira(s.amountKobo)}
                  </span>
                </Link>
              </li>
            );
          })}
      </ul>
      {data && data.sessions.length === 0 && (
        <p className="mt-6 text-center text-[15px] text-ink-3">
          No sessions yet. Your first charge shows up here with its receipt.
        </p>
      )}
    </main>
  );
}
