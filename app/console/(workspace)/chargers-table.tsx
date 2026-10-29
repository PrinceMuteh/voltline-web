"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, chargerStatus } from "@/components/ui/status-pill";
import type { Schemas } from "@/lib/api/client";
import { kw, since } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type Row = Schemas["ChargerRowDto"];
type Filter = "all" | "charging" | "available" | "faulted" | "offline";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "charging", label: "Charging" },
  { value: "available", label: "Available" },
  { value: "faulted", label: "Faulted" },
  { value: "offline", label: "Offline" },
];

const matchesFilter = (row: Row, filter: Filter) => {
  if (filter === "all") return true;
  const status = chargerStatus(row);
  return filter === "offline"
    ? status === "offline" || status === "unavailable"
    : status === filter;
};

export function ChargersTable({
  rows,
  query,
  onClearQuery,
  onOpen,
}: {
  rows: Row[] | undefined;
  query: string;
  onClearQuery: () => void;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const now = useNow();

  const q = query.trim().toLowerCase();
  const searched = (rows ?? []).filter(
    (r) =>
      !q ||
      [r.chargePointId, r.siteName, r.model ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
  );
  const visible = searched.filter((r) => matchesFilter(r, filter));
  const ids = (rows ?? []).map((r) => r.chargePointId).sort();

  return (
    <section aria-labelledby="chargers-heading" className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="chargers-heading" className="text-[16px] font-semibold">
          Chargers
        </h2>
        {/* Five filters with counts are wider than a phone; they scroll sideways there */}
        <div className="-mx-1 max-w-full overflow-x-auto px-1">
          <SegmentedControl
            label="Filter chargers by status"
            value={filter}
            onChange={setFilter}
            options={filters.map((f) => ({
              value: f.value,
              label: `${f.label} ${searched.filter((r) => matchesFilter(r, f.value)).length}`,
            }))}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead className="border-b border-line bg-subtle text-[12.5px] text-ink-3">
            <tr>
              {[
                "Charger",
                "Site",
                "Status",
                "Connector",
                "Power now",
                "Last message",
                "OCPP",
              ].map((h) => (
                <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {!rows &&
              [0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {visible.map((r) => (
              <tr
                key={r.id}
                onClick={() => onOpen(r.id)}
                className="cursor-pointer hover:bg-subtle"
              >
                <td className="px-4 py-3">
                  {/* The ID is the row's keyboard target; the whole row is the pointer target */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r.id);
                    }}
                    className="font-mono text-[13.5px] font-medium"
                  >
                    {r.chargePointId}
                  </button>{" "}
                  <span className="text-ink-3">{r.model}</span>
                </td>
                <td className="px-4 py-3 text-ink-2">{r.siteName}</td>
                <td className="px-4 py-3">
                  <StatusPill status={chargerStatus(r)} />
                </td>
                <td className="px-4 py-3 text-ink-2">{r.connector}</td>
                <td className="tabular px-4 py-3">
                  {r.status === "OFFLINE" || r.status === "FAULTED"
                    ? "–"
                    : kw(r.powerW ?? 0)}
                </td>
                <td className="tabular px-4 py-3 text-ink-2">
                  {r.lastSeenAt ? since(r.lastSeenAt, now) : "Never"}
                </td>
                <td className="tabular px-4 py-3 text-ink-2">
                  {r.protocol ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows && visible.length === 0 && (
          <div className="px-4 py-8 text-center text-[14px]">
            {q && searched.length === 0 ? (
              <>
                <p className="font-medium">
                  No chargers match “{query.trim()}”.
                </p>
                {ids.length > 0 && (
                  <p className="text-ink-3">
                    Charger IDs in this workspace run from {ids[0]} to{" "}
                    {ids.at(-1)}.
                  </p>
                )}
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={onClearQuery}
                >
                  Clear search
                </Button>
              </>
            ) : rows.length === 0 ? (
              <p className="text-ink-3">
                No chargers yet. Add your first one to see it here live.
              </p>
            ) : (
              <p className="text-ink-3">No chargers match this filter.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
