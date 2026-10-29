"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { PageHeader } from "@/components/console/page-header";
import { SessionDrawer } from "@/components/console/session-drawer";
import { SessionStatusPill } from "@/components/console/session-status";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { download, errorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useMe, useSessions, type SessionsQuery } from "@/lib/api/queries";
import { dayTime, duration, kwh, naira } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type Range = NonNullable<SessionsQuery["range"]>;
type Filter = NonNullable<SessionsQuery["status"]>;

const ranges: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
];

export function SessionsView() {
  const { data: me } = useMe();
  // The drawer lives in the URL (?session=<id>) so a session can be linked to;
  // ?q= opens it searched over 30 days, as from Drivers › View sessions
  const searchParams = useSearchParams();
  const [range, setRange] = useState<Range>(() =>
    searchParams.get("q") ? "30d" : "7d",
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const q = useDeferredValue(search.trim());
  const query: SessionsQuery = { range, status: filter, ...(q ? { q } : {}) };
  const { data, error, isPlaceholderData } = useSessions(query);
  const now = useNow(30_000);
  const timeZone = me?.workspace.timeZone ?? "Africa/Lagos";

  const router = useRouter();
  const pathname = usePathname();
  const openSession = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("session", id);
    else params.delete("session");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const csv = `/v1/console/sessions/export.csv?${new URLSearchParams(
    query as Record<string, string>,
  )}`;

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle="Every charge, from Authorize to receipt."
        actions={
          <>
            <Menu
              label="Date range"
              value={range}
              options={ranges}
              onChange={setRange}
            />
            <button
              type="button"
              onClick={() =>
                void download(csv, "voltline-sessions.csv").catch(() =>
                  toast.error("The CSV could not be downloaded. Try again."),
                )
              }
              className="inline-flex h-9 items-center rounded-control bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-160 ease-out active:scale-[0.97]"
            >
              Export CSV
            </button>
          </>
        }
      />

      {error ? (
        <p role="alert" className="text-[14px] text-error">
          We could not load sessions. {errorMessage(error)}
        </p>
      ) : (
        <section
          aria-label="Totals"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Total
            label="Sessions"
            value={data?.totals.sessions.toLocaleString("en-NG")}
          />
          <Total label="Energy" value={data && kwh(data.totals.energyWh)} />
          <Total label="Billed" value={data && naira(data.totals.billedKobo)} />
          <Total label="Needs review" value={data?.totals.needsReview} />
        </section>
      )}

      <section aria-labelledby="sessions-heading" className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="sessions-heading" className="sr-only">
            Sessions
          </h2>
          <div className="-mx-1 max-w-full overflow-x-auto px-1">
            <SegmentedControl
              label="Filter sessions"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All ${data?.counts.all ?? ""}` },
                {
                  value: "active",
                  label: `Active ${data?.counts.active ?? ""}`,
                },
                {
                  value: "completed",
                  label: `Completed ${data?.counts.completed ?? ""}`,
                },
                {
                  value: "issues",
                  label: `Issues ${data?.counts.issues ?? ""}`,
                },
              ]}
            />
          </div>
          <label className="sr-only" htmlFor="session-search">
            Search sessions
          </label>
          <input
            id="session-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search session, driver or charger"
            className="h-9 w-72 max-w-full rounded-control border border-line-strong bg-white px-3 text-[14px] outline-none placeholder:text-ink-3 focus-visible:border-charging"
          />
        </div>

        <div
          className="overflow-x-auto rounded-xl border border-line transition-opacity"
          style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
        >
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead className="border-b border-line bg-subtle text-[12.5px] text-ink-3">
              <tr>
                {[
                  "Session",
                  "Driver",
                  "Charger",
                  "Started",
                  "Duration",
                  "Energy",
                  "Amount",
                  "Status",
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {!data &&
                [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {data?.rows.map((r) => {
                const minutes =
                  ((r.endedAt ? Date.parse(r.endedAt) : now) -
                    Date.parse(r.startedAt)) /
                  60_000;
                return (
                  <tr
                    key={r.id}
                    onClick={() => openSession(r.id)}
                    className="cursor-pointer hover:bg-subtle"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSession(r.id);
                        }}
                        className="font-mono text-[13.5px] font-medium"
                      >
                        {r.reference}
                      </button>
                    </td>
                    <td className="px-4 py-3">{r.driver}</td>
                    <td className="px-4 py-3 font-mono text-[13.5px] text-ink-2">
                      {r.chargePointId}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {dayTime(r.startedAt, timeZone, now || undefined)}
                    </td>
                    <td className="tabular px-4 py-3">{duration(minutes)}</td>
                    <td className="tabular px-4 py-3">{kwh(r.energyWh)}</td>
                    <td className="tabular px-4 py-3">{naira(r.amountKobo)}</td>
                    <td className="px-4 py-3">
                      <SessionStatusPill status={r.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && data.rows.length === 0 && (
            <div className="px-4 py-8 text-center text-[14px]">
              <p className="text-ink-3">
                No sessions match. Try another filter or clear the search.
              </p>
              {(search || filter !== "all") && (
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
          {data?.truncated && (
            <p className="border-t border-line px-4 py-2 text-[13px] text-ink-3">
              Showing the latest {data.rows.length}. Narrow the range or export
              CSV for all of them.
            </p>
          )}
        </div>
      </section>

      <SessionDrawer
        sessionId={searchParams.get("session")}
        onClose={() => openSession(null)}
      />
    </>
  );
}

function Total({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | undefined;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-[13px] text-ink-3">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="nums mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          {value}
        </p>
      )}
    </div>
  );
}
