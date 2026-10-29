"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api/client";
import { keys, useCharger, useMe } from "@/lib/api/queries";
import { cn } from "@/lib/cn";

type Direction = "" | "INBOUND" | "OUTBOUND";

/** The full OCPP log for one charger (kept 90 days): search, filter, expand the raw frame. */
export function LogView() {
  const { id } = useParams<{ id: string }>();
  const { data: charger } = useCharger(id);
  const { data: me } = useMe();
  const timeZone = me?.workspace.timeZone ?? "Africa/Lagos";
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const [action, setAction] = useState("");
  const [direction, setDirection] = useState<Direction>("");
  const [open, setOpen] = useState<string>();

  const filters = {
    q: q || undefined,
    action: action || undefined,
    direction: direction || undefined,
  };
  const log = useInfiniteQuery({
    queryKey: [...keys.log(id), filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET(
        "/v1/console/chargers/{id}/messages/search",
        {
          params: { path: { id }, query: { ...filters, before: pageParam } },
        },
      );
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    placeholderData: (previous) => previous,
  });
  const messages = log.data?.pages.flatMap((p) => p.messages);
  const actions = log.data?.pages[0]?.actions ?? [];
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
    });

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-[13px] text-ink-3">
        <Link href="/console" className="hover:text-ink">
          Overview
        </Link>{" "}
        /{" "}
        <Link href={`/console?charger=${id}`} className="hover:text-ink">
          {charger?.chargePointId ?? "Charger"}
        </Link>{" "}
        / <span aria-current="page">OCPP log</span>
      </nav>
      <PageHeader
        title={charger ? `OCPP log · ${charger.chargePointId}` : "OCPP log"}
        subtitle="Every message to and from the charger, kept for 90 days. New messages appear as they arrive."
      />

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="GroundFailure, a transaction id, Accepted…"
            className="h-9 w-80 max-w-full rounded-control border border-line-strong bg-white px-3 text-[14px] outline-none placeholder:text-ink-3 focus-visible:border-charging"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-9 rounded-control border border-line-strong bg-white px-3 text-[14px]"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-2">Direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            className="h-9 rounded-control border border-line-strong bg-white px-3 text-[14px]"
          >
            <option value="">Both</option>
            <option value="INBOUND">From the charger</option>
            <option value="OUTBOUND">To the charger</option>
          </select>
        </label>
      </div>

      {log.error && (
        <p role="alert" className="text-[14px] text-error">
          {errorMessage(log.error)}
        </p>
      )}

      <div
        className="overflow-hidden rounded-xl border border-line transition-opacity"
        style={{ opacity: log.isPlaceholderData ? 0.6 : 1 }}
      >
        {!messages && (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        )}
        {messages && messages.length === 0 && (
          <p className="px-4 py-8 text-center text-[14px] text-ink-3">
            No messages match. Try another search or clear the filters.
          </p>
        )}
        <ol className="divide-y divide-line font-mono text-[12.5px]">
          {messages?.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                aria-expanded={open === m.id}
                onClick={() => setOpen(open === m.id ? undefined : m.id)}
                className={cn(
                  "flex w-full gap-3 px-4 py-2 text-left hover:bg-subtle",
                  open === m.id && "bg-subtle",
                )}
              >
                <span className="tabular w-36 shrink-0 text-ink-3">
                  {when(m.at)}
                </span>
                <span
                  className="w-4 shrink-0 text-ink-3"
                  aria-label={
                    m.direction === "INBOUND" ? "from charger" : "to charger"
                  }
                >
                  {m.direction === "INBOUND" ? "→" : "←"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-ink">{m.action}</span>{" "}
                  <span className="text-ink-2">{m.summary}</span>
                </span>
              </button>
              {open === m.id && (
                <pre className="overflow-x-auto bg-subtle px-4 pt-1 pb-3 pl-[13.5rem] text-[12px] text-ink-2">
                  {JSON.stringify(m.payload, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ol>
        {log.hasNextPage && (
          <div className="border-t border-line p-3 text-center">
            <Button
              variant="secondary"
              loading={log.isFetchingNextPage}
              onClick={() => void log.fetchNextPage()}
            >
              Load older messages
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
