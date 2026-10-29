"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { useMe, useSession } from "@/lib/api/queries";
import { clock, duration, kwh, nairaExact } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { PowerChart } from "./power-chart";
import { runCommand } from "./run-command";
import { SessionStatusPill } from "./session-status";

type Detail = Schemas["SessionDetailDto"];

export function SessionDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  // Keep the last session rendered while the drawer slides out
  const [shownId, setShownId] = useState(sessionId);
  if (sessionId && sessionId !== shownId) setShownId(sessionId);

  return (
    <Drawer open={sessionId !== null} onClose={onClose} label="Session">
      {shownId && <SessionPanel id={shownId} onClose={onClose} />}
    </Drawer>
  );
}

function SessionPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: s, error } = useSession(id);
  const { data: me } = useMe();
  const now = useNow(10_000);
  const timeZone = me?.workspace.timeZone;
  const latestSoc =
    s?.power.findLast((p) => p.socPct !== null)?.socPct ?? null;
  const [stopping, setStopping] = useState(false);
  const stop = async () => {
    if (!s) return;
    setStopping(true);
    await runCommand({
      label: `stop · ${s.reference} on ${s.chargePointId}`,
      chargerId: s.chargerId,
      request: () =>
        api.POST("/v1/console/sessions/{id}/stop", {
          params: { path: { id: s.id } },
        }),
    });
    setStopping(false);
  };
  const minutes = s
    ? ((s.endedAt ? Date.parse(s.endedAt) : now) - Date.parse(s.startedAt)) /
      60_000
    : 0;

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        {s ? (
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-[17px] font-semibold">
                {s.reference}
              </h2>
              <SessionStatusPill status={s.status} />
            </div>
            <p className="text-[13.5px] text-ink-3">
              {s.driver} · {s.chargePointId} · {s.siteName}
            </p>
          </div>
        ) : (
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
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
        {s && (
          <>
            {s.issue && (
              <div
                role="status"
                className={
                  s.issue.kind === "payment"
                    ? "mb-4 rounded-lg border border-error/30 bg-[#fbeeed] px-4 py-3 text-[13.5px]"
                    : "mb-4 rounded-lg border border-warning/30 bg-[#fbf0eb] px-4 py-3 text-[13.5px]"
                }
              >
                <p className="font-medium">{s.issue.title}</p>
                <p className="text-ink-2">{s.issue.text}</p>
              </div>
            )}

            <section aria-labelledby="power-heading">
              <h3
                id="power-heading"
                className="mb-2 text-[13px] font-medium text-ink-3"
              >
                Power
              </h3>
              <PowerChart
                points={s.power}
                peakW={s.peakPowerW}
                timeZone={timeZone}
              />
            </section>

            <dl
              className={
                latestSoc === null
                  ? "mt-4 grid grid-cols-3 gap-3"
                  : "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
              }
            >
              <Fact label="Energy">{kwh(s.energyWh)}</Fact>
              <Fact label="Duration">{duration(minutes)}</Fact>
              <Fact label={s.status === "ACTIVE" ? "So far" : "Amount"}>
                {nairaExact(s.amountKobo)}
              </Fact>
              {latestSoc !== null && <Fact label="Battery">{latestSoc}%</Fact>}
            </dl>

            <section aria-labelledby="timeline-heading" className="mt-6">
              <h3
                id="timeline-heading"
                className="text-[13px] font-medium text-ink-3"
              >
                Timeline (OCPP)
              </h3>
              <ol className="mt-2 border-l border-line pl-4">
                {s.timeline.map((t, i) => (
                  <li key={i} className="relative pb-3 last:pb-0">
                    <span
                      aria-hidden
                      className="absolute top-1.5 -left-[21px] size-2 rounded-full border-2 border-white bg-ink-3"
                    />
                    <p className="text-[14px]">
                      <span className="font-medium">{t.label}</span>{" "}
                      <span className="tabular text-[12.5px] text-ink-3">
                        {clock(t.at, timeZone).slice(0, 5)}
                      </span>
                    </p>
                    {t.detail && (
                      <p className="font-mono text-[12.5px] text-ink-3">
                        {t.detail}
                      </p>
                    )}
                  </li>
                ))}
                {s.status === "ACTIVE" && (
                  <li className="relative text-[13.5px] text-ink-3">
                    <span
                      aria-hidden
                      className="absolute top-1.5 -left-[21px] size-2 animate-pulse-quiet rounded-full border-2 border-white bg-charging"
                    />
                    Charging now
                  </li>
                )}
              </ol>
            </section>

            <Billing s={s} />
          </>
        )}
      </div>

      {s && s.status === "ACTIVE" && me && me.role !== "FINANCE" && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <Button variant="secondary" loading={stopping} onClick={() => void stop()}>
            Stop session
          </Button>
          <p className="text-[12.5px] text-ink-3">
            Asks the charger to end it now; the bill is final once the charger confirms.
          </p>
        </footer>
      )}
      {s && s.status !== "ACTIVE" && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <a
            href={`/console/receipts/${s.id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center rounded-control border border-line-strong bg-white px-4 text-[14px] font-medium transition-transform duration-160 ease-out hover:bg-subtle active:scale-[0.97]"
          >
            Download receipt
          </a>
          {s.status !== "REFUNDED" && (
            <p className="text-[12.5px] text-ink-3">
              {s.status === "PAYMENT_FAILED" ? "Retrying payment" : "Refunding"}{" "}
              needs the payment gateway, which is not connected yet.
            </p>
          )}
        </footer>
      )}
    </>
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
      <dd className="tabular text-[14px] font-medium">{children}</dd>
    </div>
  );
}

function Billing({ s }: { s: Detail }) {
  const b = s.billing;
  if (!b || !s.tariff) {
    return (
      <p className="mt-6 text-[13.5px] text-ink-3">
        No tariff covered this charger’s site when the session started, so it
        was not billed.
      </p>
    );
  }
  const lines: [string, number][] = [
    [
      `Energy (${kwh(s.energyWh)} × ${nairaExact(s.tariff.perKwhKobo)})`,
      b.energyKobo,
    ],
    ...(b.peakKobo
      ? [
          [
            `Peak surcharge (${(s.tariff.peakSurchargeBps ?? 0) / 100}%)`,
            b.peakKobo,
          ] as [string, number],
        ]
      : []),
    ...(b.timeKobo ? [["Time", b.timeKobo] as [string, number]] : []),
    ...(b.sessionFeeKobo
      ? [["Session fee", b.sessionFeeKobo] as [string, number]]
      : []),
    [`Idle fee${b.idleMinutes ? ` (${b.idleMinutes} min)` : ""}`, b.idleKobo],
  ];
  return (
    <section aria-labelledby="billing-heading" className="mt-6">
      <h3 id="billing-heading" className="text-[13px] font-medium text-ink-3">
        Billing{!b.final && " (estimate while charging)"}
      </h3>
      <dl className="mt-2 divide-y divide-line rounded-lg border border-line text-[14px]">
        {lines.map(([label, kobo]) => (
          <div key={label} className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-ink-2">{label}</dt>
            <dd className="tabular">{nairaExact(kobo)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 px-3 py-2 text-ink-3">
          <dt>
            VAT {s.tariff.vatBps / 100}% {b.vatIncluded ? "included" : "added"}
          </dt>
          <dd className="tabular">{nairaExact(b.vatKobo)}</dd>
        </div>
        <div className="flex justify-between gap-3 px-3 py-2 font-semibold">
          <dt>
            Total{" "}
            <span className="font-normal text-ink-3">· {s.paymentMethod}</span>
          </dt>
          <dd className="tabular">{nairaExact(b.totalKobo)}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-[12.5px] text-ink-3">
        {s.tariff.name} v{s.tariff.version}
        {b.atPeak && " · started in peak hours"}
        {b.stoppedByFault && " · fault stop: energy only"}
      </p>
    </section>
  );
}
