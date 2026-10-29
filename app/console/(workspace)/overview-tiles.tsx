"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Schemas } from "@/lib/api/client";
import { kw, kwh, naira } from "@/lib/format";

type Overview = Schemas["OverviewDto"];

/** "Today at a glance". Live numbers change in place, without animation. */
export function OverviewTiles({ data }: { data: Overview | undefined }) {
  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-3 h-4 w-36" />
          </div>
        ))}
      </div>
    );
  }
  const c = data.chargers;
  const notOnline = [
    c.faulted > 0 && `${c.faulted} faulted`,
    c.offline > 0 && `${c.offline} offline`,
    c.unavailable > 0 && `${c.unavailable} unavailable`,
  ].filter(Boolean);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        label="Chargers online"
        value={
          <>
            {c.online}
            <span className="text-ink-3"> / {c.total}</span>
          </>
        }
        sub={notOnline.length ? notOnline.join(" · ") : "All chargers online"}
      >
        <StatusBar counts={c} />
      </Tile>
      <Tile
        label="Active sessions"
        value={data.activeSessions}
        sub={`${kw(data.powerW)} drawn right now`}
      />
      <Tile
        label="Energy today"
        value={kwh(data.energyTodayWh)}
        sub="Updates live from MeterValues"
      />
      <Tile
        label="Revenue today"
        value={naira(data.revenueTodayKobo)}
        sub="Captured after each session ends"
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="nums mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em]">
        {value}
      </p>
      {children}
      <p className="mt-1 text-[13px] text-ink-3">{sub}</p>
    </div>
  );
}

/** Charging, available, faulted, offline as one bar; 2 px gaps separate the segments. */
function StatusBar({ counts }: { counts: Overview["chargers"] }) {
  const segments = [
    { n: counts.charging, color: "bg-charging", label: "charging" },
    { n: counts.available, color: "bg-volt", label: "available" },
    { n: counts.faulted, color: "bg-warning", label: "faulted" },
    {
      n: counts.offline + counts.unavailable,
      color: "bg-line-strong",
      label: "offline",
    },
  ].filter((s) => s.n > 0);
  return (
    <div
      role="img"
      aria-label={segments.map((s) => `${s.n} ${s.label}`).join(", ")}
      className="mt-2 flex h-1.5 gap-[2px]"
    >
      {segments.map((s) => (
        <span
          key={s.label}
          className={`${s.color} rounded-full`}
          style={{ flexGrow: s.n }}
        />
      ))}
    </div>
  );
}
