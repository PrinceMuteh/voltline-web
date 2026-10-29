"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChargerDrawer } from "@/components/console/charger-drawer";
import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import {
  useAlerts,
  useChargers,
  useMe,
  useOnboarding,
  useOverview,
} from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { ChargersTable } from "./chargers-table";
import { EnergyChart } from "./energy-chart";
import { NeedsAttention } from "./needs-attention";
import { OverviewTiles } from "./overview-tiles";

const stepLinks: Record<string, { href: string; action: string }> = {
  charger: { href: "/console/chargers/new", action: "Add charger" },
  tariff: { href: "/console/tariffs", action: "Open" },
  gateway: { href: "/console/payments", action: "Open" },
};

export function OverviewView() {
  const { data: me } = useMe();
  const { data: overview, error: overviewError } = useOverview();
  const { data: chargers } = useChargers();
  const { data: alerts } = useAlerts();
  const [query, setQuery] = useState("");

  // The drawer lives in the URL (?charger=<id>) so alerts and links can open it
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openCharger = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("charger", id);
    else params.delete("charger");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // "Wednesday, 28 October" in the workspace's time zone
  const today = me
    ? (() => {
        const timeZone = me.workspace.timeZone;
        const now = new Date();
        const weekday = now.toLocaleDateString("en-GB", {
          weekday: "long",
          timeZone,
        });
        const date = now.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          timeZone,
        });
        return `${weekday}, ${date}`;
      })()
    : undefined;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={today ?? <Skeleton className="mt-1 h-4 w-40" />}
        actions={
          <>
            <label className="sr-only" htmlFor="overview-search">
              Search chargers
            </label>
            <input
              id="overview-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chargers"
              className="h-9 w-48 rounded-control border border-line-strong bg-white px-3 text-[14px] outline-none placeholder:text-ink-3 focus-visible:border-charging"
            />
            <Link
              href="/console/chargers/new"
              className="inline-flex h-9 items-center rounded-control bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-160 ease-out active:scale-[0.97]"
            >
              Add charger
            </Link>
          </>
        }
      />
      <FirstRunChecklist />

      {overviewError ? (
        <p role="alert" className="text-[14px] text-error">
          We could not load today’s numbers. {errorMessage(overviewError)}
        </p>
      ) : (
        <section aria-label="Today at a glance">
          <OverviewTiles data={overview} />
        </section>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="energy-heading"
          className="rounded-xl border border-line p-5"
        >
          <h2 id="energy-heading" className="mb-4 text-[16px] font-semibold">
            Energy delivered today
            <span className="ml-2 text-[13px] font-normal text-ink-3">
              kWh per hour
            </span>
          </h2>
          <EnergyChart byHourWh={overview?.energyByHourWh} />
        </section>
        <section
          aria-labelledby="attention-heading"
          className="rounded-xl border border-line p-5"
        >
          <div className="flex items-baseline justify-between">
            <h2 id="attention-heading" className="text-[16px] font-semibold">
              Needs attention
            </h2>
            {alerts && alerts.length > 3 && (
              <Link
                href="/console/alerts"
                className="text-[13px] text-ink-3 hover:text-ink"
              >
                All {alerts.length} alerts
              </Link>
            )}
          </div>
          <NeedsAttention alerts={alerts} onInspect={openCharger} limit={3} />
        </section>
      </div>

      <ChargersTable
        rows={chargers}
        query={query}
        onClearQuery={() => setQuery("")}
        onOpen={openCharger}
      />

      <ChargerDrawer
        chargerId={searchParams.get("charger")}
        onClose={() => openCharger(null)}
      />
    </>
  );
}

/** "Get your network live": shown until all four steps are done. */
function FirstRunChecklist() {
  const { data, isPending, error, refetch } = useOnboarding();

  if (isPending) {
    return (
      <section className="mb-6 max-w-2xl rounded-xl border border-line p-6">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-1.5 w-full" />
        <div className="mt-6 flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-72" />
          ))}
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section
        role="alert"
        className="mb-6 max-w-2xl rounded-xl border border-line p-6"
      >
        <p className="font-medium">We could not load your setup progress.</p>
        <p className="text-[14px] text-ink-3">{errorMessage(error)}</p>
        <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </section>
    );
  }
  if (data.completed === data.total) return null;

  return (
    <section className="mb-6 max-w-2xl rounded-xl border border-line p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em]">
          Get your network live
        </h2>
        <p className="tabular text-[13px] text-ink-3">
          {data.completed} of {data.total} done
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={data.total}
        aria-valuenow={data.completed}
        aria-label="Setup progress"
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle"
      >
        <div
          className="h-full origin-left bg-volt transition-transform duration-300 ease-in-out"
          style={{ transform: `scaleX(${data.completed / data.total})` }}
        />
      </div>

      <ol className="mt-6 flex flex-col divide-y divide-line">
        {data.steps.map((step) => {
          const link = stepLinks[step.key];
          return (
            <li
              key={step.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 place-items-center rounded-full border text-[11px]",
                    step.done
                      ? "border-volt bg-volt text-white"
                      : "border-line-strong",
                  )}
                >
                  {step.done && "✓"}
                </span>
                <span
                  className={cn(
                    "text-[14.5px]",
                    step.done && "text-ink-3 line-through",
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {step.done ? " (done)" : " (to do)"}
                  </span>
                </span>
              </span>
              {!step.done && link && (
                <Link
                  href={link.href}
                  className="inline-flex h-8 items-center rounded-control border border-line-strong px-3 text-[13.5px] font-medium hover:bg-subtle"
                >
                  {link.action}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
