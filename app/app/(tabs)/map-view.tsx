"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  distanceKm,
  storeLocation,
  useOnline,
  useStoredLocation,
} from "@/components/app/bits";
import { StationSheet } from "@/components/app/station-sheet";
import { useDriverMe, useStations } from "@/lib/api/driver";
import type { Schemas } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type Station = Schemas["StationDto"];
type Filter = "CCS2" | "TYPE2" | "available";

export function MapView() {
  const { data: stations, error } = useStations();
  const { data: me } = useDriverMe();
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("station");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const here = useStoredLocation();
  const offline = !useOnline();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (stations ?? [])
      .filter(
        (s) => !q || `${s.name} ${s.area ?? ""}`.toLowerCase().includes(q),
      )
      .filter((s) =>
        filters.every((f) =>
          f === "available"
            ? s.free > 0
            : s.connectors.some((c) => c.type === f),
        ),
      )
      .map((s) => ({ ...s, km: distanceKm(here, s) }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }, [stations, query, filters, here]);

  const open = (id: string | null) => {
    router.replace(id ? `/app?station=${id}` : "/app", { scroll: false });
  };
  const toggle = (f: Filter) =>
    setFilters((list) =>
      list.includes(f) ? list.filter((x) => x !== f) : [...list, f],
    );

  const locate = () =>
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        storeLocation(loc);
      },
      () => undefined,
      { timeout: 10_000 },
    );

  const selected =
    visible.find((s) => s.id === openId) ??
    stations?.find((s) => s.id === openId);

  return (
    <div className="relative flex flex-1 flex-col">
      {offline && (
        <p
          role="status"
          className="z-20 bg-ink px-4 py-2 text-center text-[13.5px] text-white"
        >
          No connection. Showing chargers from your last update.
        </p>
      )}
      <div
        className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3"
        style={{ top: offline ? 36 : 0 }}
      >
        <label className="sr-only" htmlFor="station-search">
          Search area or station
        </label>
        <input
          id="station-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search area or station"
          className="h-12 rounded-xl border border-line bg-white/95 px-4 text-[16px] shadow-[0_4px_16px_rgb(0_0_0/0.08)] outline-none backdrop-blur focus:border-ink-3"
        />
        <div className="flex gap-2" role="group" aria-label="Filters">
          {(
            [
              ["CCS2", "CCS2"],
              ["TYPE2", "Type 2"],
              ["available", "Available now"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filters.includes(f)}
              onClick={() => toggle(f)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[14px] font-medium shadow-sm",
                filters.includes(f)
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <StationsMap
        stations={visible}
        here={here}
        dimmed={offline}
        plugs={me?.plugTypes}
        onOpen={(id) => open(id)}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-between px-3">
        <Link
          href="/app/scan"
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-medium text-white shadow-[0_4px_16px_rgb(0_0_0/0.2)] transition-transform duration-160 ease-out active:scale-[0.97]"
        >
          Scan QR
        </Link>
        <button
          type="button"
          onClick={locate}
          aria-label="Center on my location"
          className="pointer-events-auto grid size-12 place-items-center rounded-full bg-white text-ink shadow-[0_4px_16px_rgb(0_0_0/0.15)] active:scale-[0.97]"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="absolute inset-x-3 top-28 z-10 rounded-lg bg-white p-3 text-[14px] text-error shadow"
        >
          We could not load chargers. Pull down or try again in a moment.
        </p>
      )}

      {/* A list too, so stations are reachable without the map */}
      <h2 className="sr-only">Stations</h2>
      <ul className="sr-only">
        {visible.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => open(s.id)}>
              {s.name}, {s.free} free, {s.maxKw} kW
              {s.km !== null ? `, ${s.km.toFixed(1)} km` : ""}
            </button>
          </li>
        ))}
      </ul>

      <StationSheet
        station={selected}
        km={selected ? distanceKm(here, selected) : null}
        nearest={
          visible.find(
            (s) => !s.offline && s.free > 0 && s.id !== selected?.id,
          ) ?? null
        }
        onClose={() => open(null)}
        onGoTo={(id) => open(id)}
      />
    </div>
  );
}

/** Pins show power and a dot for availability (green free, grey busy, dark offline). */
function StationsMap({
  stations,
  here,
  dimmed,
  plugs,
  onOpen,
}: {
  stations: (Station & { km: number | null })[];
  here: { lat: number; lng: number } | null;
  dimmed: boolean;
  plugs: string[] | undefined;
  onOpen: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);
  const openRef = useRef(onOpen);
  useEffect(() => {
    openRef.current = onOpen;
  });

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      map.current = L.map(el.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([9.06, 7.48], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void import("leaflet").then((L) => {
      const group = layer.current!;
      group.clearLayers();
      const points: [number, number][] = [];
      for (const s of stations) {
        if (s.latitude === null || s.longitude === null) continue;
        const fits = !plugs || s.connectors.some((c) => plugs.includes(c.type));
        const dot = s.offline ? "#62626b" : s.free > 0 ? "#22c55e" : "#d4d4cf";
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute(
          "aria-label",
          `${s.name}: ${s.offline ? "offline" : `${s.free} free`}, up to ${s.maxKw} kW`,
        );
        button.style.cssText = `display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:9999px;border:1px solid #d4d4cf;background:${s.offline ? "#f7f7f5" : "white"};font:600 13px var(--font-sans);color:#0b0b0c;white-space:nowrap;box-shadow:0 2px 8px rgb(0 0 0/.15);opacity:${fits ? 1 : 0.55};cursor:pointer`;
        const dotEl = document.createElement("span");
        dotEl.style.cssText = `width:8px;height:8px;border-radius:9999px;background:${dot}`;
        const label = document.createElement("span");
        label.textContent = `${s.maxKw} kW`;
        button.append(dotEl, label);
        button.addEventListener("click", () => openRef.current(s.id));
        const icon = L.divIcon({
          className: "",
          html: button,
          iconSize: [80, 30],
          iconAnchor: [40, 15],
        });
        L.marker([s.latitude, s.longitude], {
          icon,
          keyboard: false,
          riseOnHover: true,
        }).addTo(group);
        points.push([s.latitude, s.longitude]);
      }
      if (here) {
        L.circleMarker([here.lat, here.lng], {
          radius: 7,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
        }).addTo(group);
      }
      // Frame the main cluster (stations within 60 km of the median one), so a station in
      // another city doesn't zoom the map out until every pin overlaps
      if (!fitted.current && !here && points.length > 0) {
        const median = (values: number[]) =>
          [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
        const centre = L.latLng(
          median(points.map((p) => p[0])),
          median(points.map((p) => p[1])),
        );
        const near = points.filter((p) => centre.distanceTo(p) < 60_000);
        map.current!.fitBounds(L.latLngBounds(near), {
          padding: [70, 50],
          maxZoom: 15,
        });
        fitted.current = true;
      }
    });
  }, [ready, stations, here, plugs]);

  useEffect(() => {
    if (here && map.current) map.current.setView([here.lat, here.lng], 13);
  }, [here]);

  return (
    <div
      ref={el}
      aria-label="Map of chargers"
      role="region"
      className="isolate min-h-[60dvh] flex-1 bg-subtle transition-opacity"
      style={{ opacity: dimmed ? 0.6 : 1 }}
    />
  );
}
