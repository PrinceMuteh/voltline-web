"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/console/page-header";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { keys, useChargers, useDrivers, useMe } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";

type Driver = Schemas["DriverRowDto"];
type DriversPage = Schemas["DriversPageDto"];

const statusStyle: Record<Driver["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-[#edf9f1] text-volt-ink" },
  BLOCKED: { label: "Blocked", cls: "bg-subtle text-ink-2" },
  PAYMENT_OVERDUE: { label: "Payment overdue", cls: "bg-[#fbeeed] text-error" },
};

export function DriversView() {
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const { data, error, isPlaceholderData } = useDrivers(q);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [fleetOpen, setFleetOpen] = useState(false);
  const canEdit = me && me.role !== "FINANCE";

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.drivers });
    void queryClient.invalidateQueries({ queryKey: keys.idTokens });
  };

  const setBlocked = async (driver: Driver, block: boolean) => {
    const { data: res, error: err } = await api.POST(
      block
        ? "/v1/console/drivers/{id}/block"
        : "/v1/console/drivers/{id}/unblock",
      { params: { path: { id: driver.id } } },
    );
    if (err || !res) return toast.error(errorMessage(err));
    // Show the new status now; the refetch below confirms it
    queryClient.setQueriesData<DriversPage>(
      { queryKey: keys.drivers },
      (page) =>
        page && {
          ...page,
          drivers: page.drivers.map((d) =>
            d.id === res.driver.id ? res.driver : d,
          ),
        },
    );
    toast.success(`Driver ${block ? "blocked" : "unblocked"}`, {
      description: res.syncing
        ? "Cards updated on chargers via SendLocalList"
        : "Chargers get the new card list when they reconnect",
    });
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle="App users, RFID card holders and fleets."
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={() => setFleetOpen(true)}>
                Invite fleet
              </Button>
              <Button onClick={() => setIssueFor("")}>Issue RFID card</Button>
            </>
          )
        }
      />

      {error ? (
        <p role="alert" className="text-[14px] text-error">
          We could not load drivers. {errorMessage(error)}
        </p>
      ) : (
        <section
          aria-label="Summary"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <Tile
            label="Active drivers this month"
            value={data?.activeThisMonth.toLocaleString("en-NG")}
          />
          <Tile
            label="RFID cards issued"
            value={data?.cardsIssued.toLocaleString("en-NG")}
          />
          {data?.fleets.map((f) => (
            <div
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-line p-4"
            >
              <div>
                <p className="text-[13px] font-medium">{f.name}</p>
                <p className="nums mt-1 text-[14px] text-ink-2">
                  {f.cards} {f.cards === 1 ? "card" : "cards"} ·{" "}
                  {naira(f.monthKobo)} this month · invoiced on the{" "}
                  {ordinal(f.invoiceDay)}
                </p>
              </div>
              <Link
                href={`/console/sessions?q=${encodeURIComponent(f.name)}`}
                className="inline-flex h-8 shrink-0 items-center rounded-control border border-line-strong px-3 text-[13px] font-medium hover:bg-subtle"
              >
                Open
              </Link>
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="drivers-heading" className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="drivers-heading" className="text-[15px] font-semibold">
            All drivers
          </h2>
          <label className="sr-only" htmlFor="driver-search">
            Search drivers
          </label>
          <input
            id="driver-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or card UID"
            className="h-9 w-72 max-w-full rounded-control border border-line-strong bg-white px-3 text-[14px] outline-none placeholder:text-ink-3 focus-visible:border-charging"
          />
        </div>

        <div
          className="relative overflow-x-auto rounded-xl border border-line transition-opacity"
          style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
        >
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <thead className="border-b border-line bg-subtle text-[12.5px] text-ink-3">
              <tr>
                {[
                  "Driver",
                  "Phone",
                  "Access",
                  "Sessions",
                  "Wallet",
                  "Status",
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
                <th scope="col" className="w-12 px-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {!data &&
                [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {data?.drivers.map((d) => {
                const name = d.name ?? d.phone ?? "Unnamed driver";
                const status = statusStyle[d.status];
                return (
                  <tr key={d.id} className="hover:bg-subtle">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="tabular px-4 py-3 text-ink-2">
                      {d.phone ?? "Fleet"}
                    </td>
                    <td className="px-4 py-3">
                      {d.app && "App"}
                      {d.app && d.cards.length > 0 && ", "}
                      {d.cards.map((uid, i) => (
                        <span key={uid} className="font-mono text-[13px]">
                          {i > 0 && ", "}
                          {uid}
                        </span>
                      ))}
                      {!d.app && d.cards.length === 0 && (
                        <span className="text-ink-3">None</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3">{d.sessions}</td>
                    <td className="tabular px-4 py-3">
                      {d.billing === "INVOICE"
                        ? "Invoice"
                        : d.billing === "PREPAID"
                          ? "Prepaid"
                          : naira(d.walletKobo ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[12.5px] font-medium",
                          status.cls,
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <ActionMenu
                        label={`Actions for ${name}`}
                        actions={[
                          {
                            label: "View sessions",
                            onSelect: () =>
                              router.push(
                                `/console/sessions?q=${encodeURIComponent(d.name ?? d.cards[0] ?? "")}`,
                              ),
                          },
                          ...(canEdit
                            ? [
                                {
                                  label: "Issue RFID card",
                                  onSelect: () => setIssueFor(d.id),
                                },
                                d.status === "BLOCKED"
                                  ? {
                                      label: "Unblock driver",
                                      onSelect: () => void setBlocked(d, false),
                                    }
                                  : {
                                      label: "Block driver",
                                      destructive: true,
                                      onSelect: () => void setBlocked(d, true),
                                    },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && data.drivers.length === 0 && (
            <div className="px-4 py-8 text-center text-[14px]">
              <p className="text-ink-3">
                {search
                  ? "No drivers match. Try a name, phone number or card UID."
                  : "No drivers yet. They appear when someone signs in to the app or you issue a card."}
              </p>
              {search && (
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <IssueCardModal
        open={issueFor !== null}
        driverId={issueFor ?? ""}
        onClose={() => setIssueFor(null)}
        onIssued={refresh}
      />
      <FleetModal
        open={fleetOpen}
        onClose={() => setFleetOpen(false)}
        onAdded={refresh}
      />
    </>
  );
}

function Tile({ label, value }: { label: string; value: string | undefined }) {
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

/** 04e35a71 → 04:E3:5A:71; undefined unless it is 4 to 10 hex bytes. */
function normaliseUid(value: string) {
  const hex = value.replace(/[\s:-]/g, "").toUpperCase();
  return /^([0-9A-F]{2}){4,10}$/.test(hex)
    ? hex.match(/.{2}/g)!.join(":")
    : undefined;
}

function IssueCardModal({
  open,
  driverId,
  onClose,
  onIssued,
}: {
  open: boolean;
  /** Preselected holder; "" for none. */
  driverId: string;
  onClose: () => void;
  onIssued: () => void;
}) {
  const { data: everyone } = useDrivers("");
  const { data: chargers } = useChargers();
  const readers = chargers?.filter((c) => c.connected) ?? [];
  const [uid, setUid] = useState("");
  const [assign, setAssign] = useState("none");
  const [limit, setLimit] = useState("20000");
  const [readerId, setReaderId] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Reset each time it opens, with the row's driver preselected (adjusted during render)
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (open && openedFor !== driverId) {
    setOpenedFor(driverId);
    setUid("");
    setLimit("20000");
    setAssign(driverId ? `driver:${driverId}` : "none");
  }
  if (!open && openedFor !== null) setOpenedFor(null);

  const reader = readers.find((c) => c.id === readerId) ?? readers[0];
  const people = everyone?.drivers.filter((d) => !d.fleet) ?? [];

  const close = () => {
    abort.current?.abort();
    setReading(false);
    onClose();
  };

  const read = async () => {
    if (!reader) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setReading(true);
    const { data, error } = await api.POST(
      "/v1/console/chargers/{id}/read-card",
      { params: { path: { id: reader.id } }, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    setReading(false);
    if (error || !data) {
      return toast.error("No card read", { description: errorMessage(error) });
    }
    setUid(data.uid);
    if (data.known) toast(`${data.uid} is already issued`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normal = normaliseUid(uid);
    if (!normal) return toast.error("Card UIDs look like 04:A2:1C:9F.");
    const [kind, id] = assign.split(":");
    const naira = Number(limit.replace(/[^\d]/g, ""));
    setSaving(true);
    const { data, error } = await api.POST("/v1/console/id-tokens", {
      body: {
        uid: normal,
        driverId: kind === "driver" ? id : null,
        fleetId: kind === "fleet" ? id : null,
        dailyLimitKobo: limit.trim() ? naira * 100 : null,
      },
    });
    setSaving(false);
    if (error || !data) {
      return toast.error("Card not issued", {
        description: errorMessage(error),
      });
    }
    toast.success("Card issued", {
      description: [
        data.uid,
        data.holder ?? "Unassigned",
        data.syncing ? "syncing to chargers" : "sent when chargers reconnect",
      ].join(" · "),
    });
    onIssued();
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Issue RFID card"
      description="The card works on every charger that accepts your local authorization list, even offline."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <Field
            label="Card UID"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="04:A2:1C:9F"
            autoComplete="off"
            spellCheck={false}
            validate={(v) =>
              v && !normaliseUid(v)
                ? "Card UIDs are 4 to 10 hex bytes, like 04:A2:1C:9F."
                : undefined
            }
            trailing={
              <Button
                variant="ghost"
                className="h-8 px-2.5 font-sans text-[13px]"
                disabled={!reader || reading}
                onClick={() => void read()}
              >
                Read on a charger
              </Button>
            }
          />
          <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 text-[12.5px] text-ink-3">
            {reading && reader ? (
              <>
                <Spinner className="size-3" />
                <span className="text-ink-2">
                  Tap card on {reader.chargePointId}
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    abort.current?.abort();
                    setReading(false);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : readers.length === 0 ? (
              "Type the UID printed on the card. Reading needs a connected charger."
            ) : (
              <>
                Or type the UID printed on the card.
                {readers.length > 1 && (
                  <label className="inline-flex items-center gap-1">
                    Reads on
                    <select
                      value={reader?.id}
                      onChange={(e) => setReaderId(e.target.value)}
                      className="rounded border border-line-strong bg-white px-1 py-0.5 font-mono text-[12px] text-ink"
                    >
                      {readers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.chargePointId}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="card-assign"
            className="text-[13px] font-medium text-ink-2"
          >
            Assign to
          </label>
          <select
            id="card-assign"
            value={assign}
            onChange={(e) => setAssign(e.target.value)}
            className="h-10 rounded-control border border-line-strong bg-white px-2.5 text-[14px]"
          >
            <option value="none">Unassigned (prepaid)</option>
            {everyone?.fleets.map((f) => (
              <option key={f.id} value={`fleet:${f.id}`}>
                {f.name}
              </option>
            ))}
            <optgroup label="Drivers">
              {people.map((d) => (
                <option key={d.id} value={`driver:${d.id}`}>
                  {d.name ?? d.phone}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <Field
          label="Daily spending limit"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          inputMode="numeric"
          hint="In naira. Leave empty for no limit."
          trailing={<span className="pr-2 text-[13px] text-ink-3">₦</span>}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!uid.trim()} loading={saving}>
            Issue card
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FleetModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [day, setDay] = useState("1");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await api.POST("/v1/console/fleets", {
      body: { name: name.trim(), invoiceDay: Number(day) },
    });
    setSaving(false);
    if (error || !data) {
      return toast.error("Fleet not added", {
        description: errorMessage(error),
      });
    }
    toast.success(`${data.name} added`, {
      description: "Issue its cards with Issue RFID card.",
    });
    setName("");
    onAdded();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite fleet"
      description="A fleet's cards are billed together and invoiced once a month."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Fleet name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="GreenRide fleet"
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fleet-day"
            className="text-[13px] font-medium text-ink-2"
          >
            Invoice on
          </label>
          <select
            id="fleet-day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-10 rounded-control border border-line-strong bg-white px-2.5 text-[14px]"
          >
            {Array.from({ length: 28 }, (_, i) => (
              <option key={i} value={i + 1}>
                The {ordinal(i + 1)} of each month
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={name.trim().length < 2}
            loading={saving}
          >
            Add fleet
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ordinal(n: number) {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ??
        "th");
  return `${n}${suffix}`;
}
