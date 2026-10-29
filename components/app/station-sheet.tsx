"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { driverKeys, useDriverMe } from "@/lib/api/driver";
import { cn } from "@/lib/cn";
import { naira, nairaExact } from "@/lib/format";
import { CheckBadge, PLUG_LABEL } from "./bits";
import { BottomSheet } from "./bottom-sheet";

type Station = Schemas["StationDto"];
type Connector = Station["connectors"][number];
type Outcome = Schemas["StartResultDto"];

/** Opens from a pin: price, connectors, and Start charging. */
export function StationSheet({
  station,
  km,
  nearest,
  onClose,
  onGoTo,
}: {
  station: Station | undefined;
  km: number | null;
  nearest: Station | null;
  onClose: () => void;
  onGoTo: (id: string) => void;
}) {
  // Keep the last station rendered while the sheet slides away
  const [shown, setShown] = useState(station);
  if (station && station !== shown) setShown(station);

  return (
    <BottomSheet
      open={Boolean(station)}
      onClose={onClose}
      label={shown?.name ?? "Station"}
    >
      {shown &&
        (shown.offline ? (
          <OfflineState station={shown} nearest={nearest} onGoTo={onGoTo} />
        ) : (
          <StartPanel key={shown.id} station={shown} km={km} />
        ))}
    </BottomSheet>
  );
}

export function StartPanel({
  station,
  km,
  title,
}: {
  station: Station;
  km: number | null;
  /** The QR flow leads with the charger instead of the station. */
  title?: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useDriverMe();
  const fits = (c: Connector) => !me || me.plugTypes.includes(c.type);
  const firstFree =
    station.connectors.find((c) => c.status === "AVAILABLE" && fits(c)) ??
    station.connectors.find((c) => c.status === "AVAILABLE");
  const [pick, setPick] = useState(firstFree ? key(firstFree) : "");
  const [phase, setPhase] = useState<"idle" | "connecting" | "started">("idle");
  const [outcome, setOutcome] = useState<Outcome>();
  const [error, setError] = useState<string>();
  const chosen = station.connectors.find((c) => key(c) === pick);
  const price = station.price;

  const start = async () => {
    if (!chosen) return;
    setPhase("connecting");
    setOutcome(undefined);
    setError(undefined);
    const { data, error: apiError } = await api.POST("/v1/app/sessions", {
      body: { chargerId: chosen.chargerId, evseId: chosen.evseId },
    });
    if (apiError || !data) {
      setPhase("idle");
      return setError(errorMessage(apiError));
    }
    if (data.outcome === "ACCEPTED") {
      setPhase("started");
      void queryClient.invalidateQueries({ queryKey: driverKeys.live });
      return;
    }
    setPhase("idle");
    setOutcome(data);
  };

  if (phase === "started") {
    return (
      <div className="animate-blur-in pt-4 pb-2 text-center">
        <CheckBadge />
        <h2 className="mt-4 text-[22px] font-semibold">Charging started</h2>
        <p className="mt-1 text-[15px] text-ink-2">
          {chosen?.chargePointId} accepted the start. EVSE {chosen?.evseId}.
        </p>
        <Button
          className="mt-6 h-12 w-full text-[16px]"
          onClick={() => router.push("/app/charging")}
        >
          View live session
        </Button>
      </div>
    );
  }

  if (outcome) {
    return (
      <div className="animate-blur-in pt-2 pb-2">
        <h2 className="text-[22px] font-semibold">{outcome.title}</h2>
        <p className="mt-2 text-[15px] text-ink-2">{outcome.message}</p>
        <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-[14px]">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-ink-3">Charged</dt>
            <dd>Nothing</dd>
          </div>
          {chosen && (
            <div className="flex justify-between px-4 py-2.5">
              <dt className="text-ink-3">Connector</dt>
              <dd>
                {PLUG_LABEL[chosen.type]} · EVSE {chosen.evseId}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-5 flex flex-col gap-2">
          <Button className="h-12 text-[16px]" onClick={() => void start()}>
            Try again
          </Button>
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => setOutcome(undefined)}
          >
            Choose another connector
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-2">
      {title ?? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
                {station.name}
              </h2>
              <p className="text-[14px] text-ink-3">
                {[station.area, km !== null && `${km.toFixed(1)} km`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span
              className={cn(
                "mt-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap",
                station.free > 0
                  ? "bg-[#edf9f1] text-volt-ink"
                  : "bg-subtle text-ink-2",
              )}
            >
              {station.free} free
            </span>
          </div>
        </>
      )}

      <p className="mt-3 text-[14.5px] text-ink-2">
        {price ? (
          <>
            <span className="font-medium text-ink">
              {naira(price.perKwhKobo)} / kWh
            </span>
            {price.idlePerMinuteKobo !== null &&
              ` · Idle fee after ${price.idleGraceMin ?? 0} min`}
            {price.sessionFeeKobo > 0 &&
              ` · ${naira(price.sessionFeeKobo)} session fee`}
          </>
        ) : (
          "No price set here yet"
        )}
        {" · "}
        {station.openingHours}
      </p>
      {price?.peakSurchargeBps && (
        <p className="text-[13px] text-ink-3">
          +{price.peakSurchargeBps / 100}% on energy {price.peakFrom}–
          {price.peakTo}
        </p>
      )}

      <fieldset className="mt-4">
        <legend className="mb-2 text-[13px] font-medium text-ink-2">
          Connector
        </legend>
        <div className="flex flex-col gap-2">
          {station.connectors.map((c) => {
            const free = c.status === "AVAILABLE";
            return (
              <label
                key={key(c)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-charging",
                  !free && "cursor-not-allowed opacity-50",
                  free && "cursor-pointer",
                  pick === key(c)
                    ? "border-ink bg-subtle"
                    : "border-line-strong",
                )}
              >
                <span>
                  <span className="block text-[15.5px] font-medium">
                    {PLUG_LABEL[c.type]} · {c.maxKw} kW
                  </span>
                  <span className="block text-[13px] text-ink-3">
                    {c.chargePointId} · EVSE {c.evseId} · {statusWord(c.status)}
                    {!fits(c) && " · doesn’t fit your car"}
                  </span>
                </span>
                <input
                  type="radio"
                  name="connector"
                  disabled={!free}
                  checked={pick === key(c)}
                  onChange={() => setPick(key(c))}
                  className="size-5 accent-ink"
                />
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-4 text-[13.5px] text-ink-3">
        Plug in first, then start.
        {me?.walletKobo != null && ` Wallet ${nairaExact(me.walletKobo)}.`}{" "}
        Payment is not taken yet in this preview; the session is billed to your
        account.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-[14px] text-error">
          {error}
        </p>
      )}
      <Button
        className="mt-4 h-12 w-full text-[16px]"
        disabled={!chosen || phase === "connecting"}
        onClick={() => void start()}
      >
        {phase === "connecting" ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" /> Connecting to{" "}
            {chosen?.chargePointId ?? "charger"}
          </span>
        ) : chosen ? (
          "Start charging"
        ) : (
          "No connector free"
        )}
      </Button>
    </div>
  );
}

function OfflineState({
  station,
  nearest,
  onGoTo,
}: {
  station: Station;
  nearest: Station | null;
  onGoTo: (id: string) => void;
}) {
  return (
    <div className="animate-blur-in pb-2">
      <h2 className="text-[22px] font-semibold">{station.name} is offline</h2>
      <p className="mt-2 text-[15px] text-ink-2">
        This charger has not checked in
        {station.offlineMinutes !== null &&
          ` for ${station.offlineMinutes} minutes`}
        , so it cannot start a session from the app. An RFID card may still work
        on site.
      </p>
      {nearest && (
        <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-[14px]">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-ink-3">Nearest open</dt>
            <dd>
              {nearest.name} · {nearest.free} free
            </dd>
          </div>
        </dl>
      )}
      {nearest && (
        <Button
          className="mt-5 h-12 w-full text-[16px]"
          onClick={() => onGoTo(nearest.id)}
        >
          Go to {nearest.name}
        </Button>
      )}
    </div>
  );
}

const key = (c: Connector) => `${c.chargerId}/${c.evseId}`;

function statusWord(status: string) {
  return (
    {
      AVAILABLE: "Available",
      RESERVED: "Reserved",
      CHARGING: "In use",
      FAULTED: "Faulted",
      UNAVAILABLE: "Out of service",
      OFFLINE: "Offline",
    }[status] ?? status
  );
}
