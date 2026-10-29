"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckBadge } from "@/components/app/bits";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useReceipt } from "@/lib/api/driver";
import { duration, kwh, naira, nairaExact } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/** After a session: what was delivered and what it cost. Lines stagger in 50 ms apart. */
export function DriverReceiptView() {
  const { id } = useParams<{ id: string }>();
  const { data: s, error } = useReceipt(id);
  const now = useNow(60_000);

  if (error) {
    return (
      <p role="alert" className="p-6 text-error">
        {errorMessage(error)}
      </p>
    );
  }
  if (!s) {
    return (
      <main className="flex flex-1 flex-col gap-3 px-6 pt-16">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  const fault = s.status === "STOPPED_BY_FAULT";
  const minutes =
    ((s.endedAt ? Date.parse(s.endedAt) : now) - Date.parse(s.startedAt)) /
    60_000;
  const lines: [string, string][] = [
    ["Energy", kwh(s.energyWh)],
    ["Duration", duration(minutes)],
    ...(s.tariff
      ? [["Rate", `${naira(s.tariff.perKwhKobo)} / kWh`] as [string, string]]
      : []),
    ...(s.billing?.idleKobo
      ? [["Idle fee", nairaExact(s.billing.idleKobo)] as [string, string]]
      : []),
    ...(s.billing
      ? [["VAT included", nairaExact(s.billing.vatKobo)] as [string, string]]
      : []),
    ["Station", `${s.siteName} · ${s.chargePointId}`],
    ["Session", s.reference],
  ];

  return (
    <main className="flex flex-1 flex-col px-6 pt-12 pb-8">
      <CheckBadge tone={fault ? "warning" : "volt"} />
      <h1 className="mt-5 text-center text-[26px] font-semibold tracking-[-0.02em]">
        {fault ? "Charging stopped early" : "Charging complete"}
      </h1>
      <p className="mt-1 text-center text-[15px] text-ink-2">
        {fault
          ? `The charger reported a fault (${s.stopReason}) and ended your session. You pay only for the energy delivered.`
          : `${nairaExact(s.amountKobo)} for this session.`}
      </p>
      {fault && (
        <p className="mt-1 text-center text-[17px] font-semibold">
          {nairaExact(s.amountKobo)}
        </p>
      )}
      <dl className="mt-8 divide-y divide-line rounded-xl border border-line text-[15px]">
        {lines.map(([label, value], i) => (
          <div
            key={label}
            className="flex animate-fade-up justify-between gap-3 px-4 py-3"
            style={{ animationDelay: `${150 + i * 50}ms` }}
          >
            <dt className="text-ink-3">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-center text-[13px] text-ink-3">
        Payment is not taken in this preview; card and wallet payments come
        next.
      </p>
      <div className="mt-auto flex flex-col gap-2 pt-8">
        <Link
          href="/app"
          className="inline-flex h-12 items-center justify-center rounded-control bg-ink text-[16px] font-medium text-white"
        >
          {fault ? "Find another charger" : "Done"}
        </Link>
        <Link
          href="/app/sessions"
          className="inline-flex h-11 items-center justify-center text-[15px] font-medium text-ink-2"
        >
          All sessions
        </Link>
      </div>
    </main>
  );
}
