"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, chargerStatus } from "@/components/ui/status-pill";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { ChargerSettings } from "./charger-settings";
import { runCommand } from "./run-command";
import { useCharger, useChargerMessages, useMe } from "@/lib/api/queries";
import { clock, kw, since } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type Kind = Schemas["CommandDto"]["kind"];
type Charger = Schemas["ChargerDetailDto"];

export function ChargerDrawer({
  chargerId,
  onClose,
}: {
  chargerId: string | null;
  onClose: () => void;
}) {
  // Keep the last charger rendered while the drawer slides out
  const [shownId, setShownId] = useState(chargerId);
  if (chargerId && chargerId !== shownId) setShownId(chargerId);

  return (
    <Drawer open={chargerId !== null} onClose={onClose} label="Charger">
      {shownId && <ChargerPanel id={shownId} onClose={onClose} />}
    </Drawer>
  );
}

function ChargerPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: charger, error } = useCharger(id);
  const { data: me } = useMe();
  const now = useNow();
  const logRef = useRef<HTMLElement>(null);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        {charger ? (
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-[17px] font-semibold">
                {charger.chargePointId}
              </h2>
              <StatusPill status={chargerStatus(charger)} />
            </div>
            <p className="text-[13.5px] text-ink-3">
              {[charger.model, charger.siteName].filter(Boolean).join(" · ")}
            </p>
          </div>
        ) : (
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-control text-[18px] text-ink-3 hover:bg-subtle hover:text-ink"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <p role="alert" className="text-[14px] text-error">
            {errorMessage(error)}
          </p>
        )}
        {charger && (
          <>
            {charger.approval !== "ACCEPTED" && (
              <Notice>
                <p className="font-medium">Waiting for your approval.</p>
                <p className="text-ink-2">
                  Drivers cannot see {charger.chargePointId} until you approve
                  it.
                </p>
                <Link
                  href={`/console/chargers/new?charger=${charger.id}`}
                  className="mt-2 inline-flex h-8 items-center rounded-control bg-ink px-3 text-[13.5px] font-medium text-white"
                >
                  Review and approve
                </Link>
              </Notice>
            )}
            {charger.approval === "ACCEPTED" &&
              charger.status === "OFFLINE" &&
              charger.lastSeenAt && (
                <Notice>
                  <p className="font-medium">
                    {charger.chargePointId} has not been heard from for{" "}
                    {since(charger.lastSeenAt, now)}.
                  </p>
                  <p className="text-ink-2">
                    Last message{" "}
                    {clock(charger.lastSeenAt, me?.workspace.timeZone)}. Drivers
                    with RFID cards can still charge; their sessions sync when
                    it reconnects. Usually a SIM data or power issue.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      logRef.current?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="mt-2 text-[13.5px] font-medium underline underline-offset-2"
                  >
                    View last messages
                  </button>
                </Notice>
              )}

            <dl className="grid grid-cols-2 gap-3">
              <Fact label="Power now">
                {charger.status === "OFFLINE" || charger.status === "FAULTED"
                  ? "–"
                  : kw(charger.powerW ?? 0)}
              </Fact>
              <Fact label="Connector">{charger.connector}</Fact>
              <Fact label="Protocol">
                {charger.protocol
                  ? `OCPP ${charger.protocol}`
                  : "Not connected yet"}
              </Fact>
              <Fact label="Last message">
                {charger.lastSeenAt
                  ? `${since(charger.lastSeenAt, now)} ago`
                  : "Never"}
              </Fact>
            </dl>

            {charger.approval === "ACCEPTED" && me && me.role !== "FINANCE" && (
              <RemoteActions
                charger={charger}
                canHardReset={me.role !== "SUPPORT"}
              />
            )}

            {charger.approval === "ACCEPTED" && me && me.role !== "FINANCE" && (
              <ChargerSettings
                chargerId={charger.id}
                connected={charger.connected}
                canEdit={me.role === "ADMIN" || me.role === "OPERATOR"}
              />
            )}

            <section ref={logRef} aria-labelledby="ocpp-log" className="mt-6">
              <h3 id="ocpp-log" className="text-[13px] font-medium text-ink-3">
                OCPP messages (live)
              </h3>
              <MessageLog id={charger.id} timeZone={me?.workspace.timeZone} />
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-line bg-subtle px-4 py-3 text-[13.5px]">
      {children}
    </div>
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
    <div className="rounded-lg border border-line px-3 py-2">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="tabular text-[14.5px] font-medium">{children}</dd>
    </div>
  );
}

function RemoteActions({
  charger,
  canHardReset,
}: {
  charger: Charger;
  canHardReset: boolean;
}) {
  const v16 = charger.protocol === "1.6J";
  const actionOf: Record<Kind, string> = {
    "remote-start": v16 ? "RemoteStartTransaction" : "RequestStartTransaction",
    "remote-stop": v16 ? "RemoteStopTransaction" : "RequestStopTransaction",
    unlock: "UnlockConnector",
    "soft-reset": "Reset",
    "hard-reset": "Reset",
    "set-available": "ChangeAvailability",
    "set-unavailable": "ChangeAvailability",
  };
  const running = charger.activeSessions[0];
  const outOfService = charger.status === "UNAVAILABLE";

  const send = (kind: Kind) =>
    runCommand({
      label: `${actionOf[kind]} · ${charger.chargePointId}`,
      chargerId: charger.id,
      request: () =>
        api.POST("/v1/console/chargers/{id}/commands", {
          params: { path: { id: charger.id } },
          body: { kind, evseId: kind === "remote-stop" ? running?.evseId : undefined },
        }),
    });

  return (
    <section aria-labelledby="remote-actions" className="mt-6">
      <h3 id="remote-actions" className="text-[13px] font-medium text-ink-3">
        Remote actions
      </h3>
      {running && (
        <p className="mt-1 text-[13px] text-ink-2">
          {running.reference} is charging on EVSE {running.evseId}.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {running ? (
          <Button variant="secondary" onClick={() => void send("remote-stop")}>
            Stop session
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={outOfService}
            onClick={() => void send("remote-start")}
          >
            Remote start
          </Button>
        )}
        <Button variant="secondary" onClick={() => void send("unlock")}>
          Unlock connector
        </Button>
        <Button variant="secondary" onClick={() => void send("soft-reset")}>
          Soft reset
        </Button>
        <Button
          variant="secondary"
          onClick={() => void send(outOfService ? "set-available" : "set-unavailable")}
        >
          {outOfService ? "Make available" : "Make unavailable"}
        </Button>
        {canHardReset && (
          <HoldToConfirm onConfirm={() => void send("hard-reset")}>
            Hold to hard reset
          </HoldToConfirm>
        )}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-3">
        {outOfService
          ? "Out of service: drivers can’t start sessions until you make it available."
          : "Make unavailable takes it out of service; a running session finishes first."}
        {canHardReset && " A hard reset ends any running session. Hold for 2 seconds to confirm."}
      </p>
    </section>
  );
}

function MessageLog({ id, timeZone }: { id: string; timeZone?: string }) {
  const { data: messages } = useChargerMessages(id);
  // Rows present on first load appear at once; later ones slide in
  const [initial, setInitial] = useState<Set<string>>();
  if (messages && !initial) setInitial(new Set(messages.map((m) => m.id)));

  if (!messages) {
    return <Skeleton className="mt-2 h-24 w-full" />;
  }
  if (messages.length === 0) {
    return (
      <p className="mt-2 text-[13.5px] text-ink-3">
        No messages yet. They appear here as soon as the charger connects.
      </p>
    );
  }
  return (
    <ol className="mt-2 divide-y divide-line rounded-lg border border-line font-mono text-[12.5px]">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`flex gap-2 px-3 py-1.5 ${initial?.has(m.id) ? "" : "animate-slide-in"}`}
        >
          <span className="tabular shrink-0 text-ink-3">
            {clock(m.at, timeZone)}
          </span>
          <span
            className="shrink-0 text-ink-3"
            aria-label={
              m.direction === "INBOUND" ? "from charger" : "to charger"
            }
          >
            {m.direction === "INBOUND" ? "→" : "←"}
          </span>
          <span className="min-w-0">
            <span className="font-medium text-ink">{m.action}</span>{" "}
            <span className="text-ink-2">{m.summary}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
