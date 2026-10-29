"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { keys, useIdTokens } from "@/lib/api/queries";
import { since } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type Charger = Schemas["ChargerDetailDto"];

const HOLD_FOR = [15, 30, 60, 120];

/**
 * Who may use the charger: reservations (ReserveNow / CancelReservation) and the RFID list it
 * keeps for offline charging (SendLocalList).
 */
export function ChargerAccess({
  charger,
  canSync,
}: {
  charger: Charger;
  canSync: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: cards } = useIdTokens();
  const now = useNow(30_000);
  const [cardId, setCardId] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [evseId, setEvseId] = useState(charger.evses[0]?.evseId ?? 1);
  const [reserving, setReserving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: keys.charger(charger.id) });

  const reserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId) return toast.error("Choose the card to hold it for.");
    setReserving(true);
    const { data, error } = await api.POST(
      "/v1/console/chargers/{id}/reservations",
      {
        params: { path: { id: charger.id } },
        body: { evseId, idTokenId: cardId, minutes },
      },
    );
    setReserving(false);
    if (error || !data) {
      return toast.error("Not reserved", { description: errorMessage(error) });
    }
    (data.status === "ACTIVE" ? toast.success : toast.error)(data.title, {
      description:
        data.status === "ACTIVE"
          ? `Held for ${minutes} min. Only that card can start a session.`
          : data.detail,
    });
    void refresh();
  };

  const cancel = async (reservationId: string) => {
    const { error } = await api.POST(
      "/v1/console/chargers/{id}/reservations/{reservationId}/cancel",
      { params: { path: { id: charger.id, reservationId } } },
    );
    if (error) return toast.error(errorMessage(error));
    toast("Reservation cancelled");
    void refresh();
  };

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await api.POST(
      "/v1/console/chargers/{id}/local-list/sync",
      { params: { path: { id: charger.id } } },
    );
    setSyncing(false);
    if (error || !data) {
      return toast.error("RFID list not sent", {
        description: errorMessage(error),
      });
    }
    (data.status === "Accepted" ? toast.success : toast.error)(
      data.status === "Accepted"
        ? `RFID list v${data.version} sent · ${data.entries} cards`
        : `${charger.chargePointId} replied ${data.status}`,
    );
    void refresh();
  };

  return (
    <section aria-labelledby="access-heading" className="mt-6">
      <h3 id="access-heading" className="text-[13px] font-medium text-ink-3">
        Reservations and offline cards
      </h3>

      {charger.reservations.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-[13.5px]">
          {charger.reservations.map((r) => {
            const left = Math.max(
              0,
              Math.round((Date.parse(r.expiresAt) - now) / 60_000),
            );
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span>
                  <span className="font-medium">EVSE {r.evseId}</span> held for{" "}
                  <span className="font-mono">{r.idTag}</span>
                  {r.driver && ` (${r.driver})`}
                  <span className="block text-[12.5px] text-ink-3">
                    {left > 0 ? `${left} min left` : "Expiring now"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  className="h-8 px-2.5 text-[13px]"
                  onClick={() => void cancel(r.id)}
                >
                  Cancel
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={reserve} className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-[12.5px] text-ink-2">Hold for card</span>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="h-9 rounded-control border border-line-strong bg-white px-2 text-[16px] sm:text-[14px]"
          >
            <option value="">Choose a card…</option>
            {cards?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.uid}
                {c.holder ? ` · ${c.holder}` : ""}
              </option>
            ))}
          </select>
        </label>
        {charger.evses.length > 1 && (
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] text-ink-2">EVSE</span>
            <select
              value={evseId}
              onChange={(e) => setEvseId(Number(e.target.value))}
              className="h-9 rounded-control border border-line-strong bg-white px-2 text-[16px] sm:text-[14px]"
            >
              {charger.evses.map((e) => (
                <option key={e.evseId} value={e.evseId}>
                  EVSE {e.evseId}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] text-ink-2">For</span>
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="h-9 rounded-control border border-line-strong bg-white px-2 text-[16px] sm:text-[14px]"
          >
            {HOLD_FOR.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          variant="secondary"
          loading={reserving}
          disabled={!charger.connected}
        >
          Reserve
        </Button>
      </form>
      {!charger.connected && (
        <p className="mt-1 text-[12.5px] text-ink-3">
          Reservations need the charger to be connected.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-subtle px-3 py-2 text-[13px]">
        <span className="text-ink-2">
          {charger.localListVersion > 0 && charger.localListSyncedAt
            ? `Offline RFID list v${charger.localListVersion}, sent ${since(charger.localListSyncedAt, now)} ago`
            : "No offline RFID list sent yet"}
        </span>
        {canSync && (
          <Button
            variant="ghost"
            className="h-8 px-2.5 text-[13px]"
            loading={syncing}
            disabled={!charger.connected}
            onClick={() => void sync()}
          >
            Send now
          </Button>
        )}
      </div>
    </section>
  );
}
