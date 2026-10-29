"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api, type Schemas } from "./api/client";
import { keys } from "./api/queries";

type Message = Schemas["OcppMessageDto"];
type Row = Schemas["ChargerRowDto"];

const RealtimeContext = createContext(false);

/** True while the console socket is connected. */
export const useRealtimeConnected = () => useContext(RealtimeContext);

/**
 * One Socket.IO connection per console tab. Events are small signals; this turns them into
 * cache updates (power and the message log) or refetches (everything else), so screens stay
 * plain TanStack Query consumers.
 */
export function RealtimeBridge({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000";
    const socket = io(`${url}/console`, {
      transports: ["websocket"],
      // A fresh 60 s ticket for every (re)connect; the access cookie stays httpOnly
      auth: (cb) => {
        void api
          .POST("/v1/console/realtime/ticket")
          .then(({ data }) => cb({ ticket: data?.ticket }));
      },
    });

    // Refetch at most once a second per key, however many events arrive
    const pending = new Map<string, QueryKey>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refetch = (...queryKeys: QueryKey[]) => {
      for (const key of queryKeys) pending.set(JSON.stringify(key), key);
      timer ??= setTimeout(() => {
        for (const key of pending.values()) {
          // Prefix match: list keys carry their filters after the base key
          void queryClient.invalidateQueries({ queryKey: key });
        }
        pending.clear();
        timer = undefined;
      }, 1000);
    };

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("charger.status", ({ chargerId }: { chargerId: string }) => {
      refetch(
        keys.chargers,
        keys.overview,
        keys.network,
        keys.charger(chargerId),
      );
    });
    socket.on(
      "charger.power",
      ({ chargerId, powerW }: { chargerId: string; powerW: number | null }) => {
        queryClient.setQueryData<Row[]>(keys.chargers, (rows) =>
          rows?.map((r) => (r.id === chargerId ? { ...r, powerW } : r)),
        );
        queryClient.setQueryData<Row>(keys.charger(chargerId), (row) =>
          row ? { ...row, powerW } : row,
        );
        refetch(keys.overview);
      },
    );
    socket.on(
      "charger.message",
      ({ chargerId, message }: { chargerId: string; message: Message }) => {
        queryClient.setQueryData<Message[]>(keys.messages(chargerId), (list) =>
          list ? [message, ...list].slice(0, 50) : list,
        );
        // Any message is a sign of life: keep "Last message" current
        refetch(keys.chargers, keys.log(chargerId));
      },
    );
    socket.on(
      "charger.connect_check",
      ({ chargerId }: { chargerId: string }) => {
        refetch(keys.check(chargerId), keys.charger(chargerId));
      },
    );
    socket.on("session.updated", ({ sessionId }: { sessionId: string }) => {
      // Charger details list their running sessions
      refetch(keys.sessions, keys.session(sessionId), keys.overview, [
        "console",
        "charger",
      ]);
    });
    socket.on("session.meter", ({ sessionId }: { sessionId: string }) => {
      refetch(keys.sessions, keys.session(sessionId), keys.overview);
    });
    socket.on("alert.changed", () => {
      refetch(keys.alerts, keys.network, keys.overview);
    });

    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={connected}>
      {children}
    </RealtimeContext.Provider>
  );
}
