"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { paths } from "./schema";

export function useMe() {
  return useQuery({
    queryKey: ["console", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/me");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useOnboarding() {
  return useQuery({
    queryKey: ["console", "onboarding"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/onboarding");
      if (error) throw error;
      return data;
    },
  });
}

/** Query keys shared by the hooks below and the realtime bridge that invalidates them. */
export const keys = {
  overview: ["console", "overview"] as const,
  network: ["console", "network"] as const,
  chargers: ["console", "chargers"] as const,
  charger: (id: string) => ["console", "charger", id] as const,
  messages: (id: string) => ["console", "charger", id, "messages"] as const,
  check: (id: string) => ["console", "charger", id, "check"] as const,
  alerts: ["console", "alerts"] as const,
  sites: ["console", "sites"] as const,
  sessions: ["console", "sessions"] as const,
  session: (id: string) => ["console", "session", id] as const,
  tariffs: ["console", "tariffs"] as const,
};

export type SessionsQuery = NonNullable<
  paths["/v1/console/sessions"]["get"]["parameters"]["query"]
>;

export function useOverview() {
  return useQuery({
    queryKey: keys.overview,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/overview");
      if (error) throw error;
      return data;
    },
  });
}

export function useNetwork() {
  return useQuery({
    queryKey: keys.network,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/network");
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useChargers() {
  return useQuery({
    queryKey: keys.chargers,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/chargers");
      if (error) throw error;
      return data;
    },
  });
}

export function useCharger(id: string | undefined) {
  return useQuery({
    queryKey: keys.charger(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/chargers/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useChargerMessages(id: string | undefined) {
  return useQuery({
    queryKey: keys.messages(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/v1/console/chargers/{id}/messages",
        { params: { path: { id: id! } } },
      );
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectCheck(id: string | undefined) {
  return useQuery({
    queryKey: keys.check(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/v1/console/chargers/{id}/connect-check",
        { params: { path: { id: id! } } },
      );
      if (error) throw error;
      return data;
    },
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: keys.alerts,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/alerts");
      if (error) throw error;
      return data;
    },
  });
}

export function useSites() {
  return useQuery({
    queryKey: keys.sites,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/sites");
      if (error) throw error;
      return data;
    },
  });
}

export function useSessions(query: SessionsQuery) {
  return useQuery({
    queryKey: [...keys.sessions, query],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/sessions", {
        params: { query },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: keys.session(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/sessions/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useTariffs() {
  return useQuery({
    queryKey: keys.tariffs,
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/console/tariffs");
      if (error) throw error;
      return data;
    },
  });
}
