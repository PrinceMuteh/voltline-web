"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

/** Query keys and hooks for the driver app (/v1/app/*). */
export const driverKeys = {
  me: ["app", "me"] as const,
  stations: ["app", "stations"] as const,
  live: ["app", "live"] as const,
  history: ["app", "history"] as const,
  receipt: (id: string) => ["app", "receipt", id] as const,
};

export function useDriverMe() {
  return useQuery({
    queryKey: driverKeys.me,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/app/me");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useStations() {
  return useQuery({
    queryKey: driverKeys.stations,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/app/stations");
      if (error) throw error;
      return data;
    },
    // Availability changes as cars come and go
    refetchInterval: 15_000,
  });
}

/** The running session, polled every 3 s while a screen shows it. */
export function useLiveSession(poll = true) {
  return useQuery({
    queryKey: driverKeys.live,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/app/sessions/live");
      if (error) throw error;
      return data.session;
    },
    refetchInterval: poll ? 3_000 : false,
  });
}

export function useHistory() {
  return useQuery({
    queryKey: driverKeys.history,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/app/sessions");
      if (error) throw error;
      return data;
    },
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: driverKeys.receipt(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/app/sessions/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
  });
}
