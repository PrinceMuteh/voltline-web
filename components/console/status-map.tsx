"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { chargerStatus, type Status } from "@/components/ui/status-pill";
import type { Schemas } from "@/lib/api/client";

type Row = Schemas["ChargerRowDto"];
type Site = Schemas["SiteDto"];

/** Worst first: a site's marker takes the colour of its most urgent charger. */
const URGENCY: Status[] = [
  "faulted",
  "offline",
  "unavailable",
  "pending",
  "charging",
  "available",
];
const COLOR: Record<Status, string> = {
  faulted: "#b93c0a",
  offline: "#62626b",
  unavailable: "#62626b",
  pending: "#62626b",
  charging: "#1d4ed8",
  available: "#22c55e",
  "payment-failed": "#b42318",
};
const LABEL: Record<Status, string> = {
  faulted: "Faulted",
  offline: "Offline",
  unavailable: "Unavailable",
  pending: "Pending approval",
  charging: "Charging",
  available: "Available",
  "payment-failed": "Payment failed",
};

/**
 * Sites on a map, each marker coloured by its most urgent charger and showing how many it has.
 * Clicking a charger in a marker's popup opens the same drawer as the table.
 */
export function StatusMap({
  sites,
  chargers,
  onOpen,
}: {
  sites: Site[] | undefined;
  chargers: Row[] | undefined;
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

  // Leaflet touches window, so it loads in the browser only
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      map.current = L.map(el.current, { scrollWheelZoom: false }).setView(
        [9.06, 7.48],
        11,
      );
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
    if (!ready || !sites || !chargers) return;
    void import("leaflet").then((L) => {
      const group = layer.current!;
      group.clearLayers();
      const placed: [number, number][] = [];
      for (const site of sites) {
        if (site.latitude === null || site.longitude === null) continue;
        const here = chargers.filter((c) => c.siteId === site.id);
        if (here.length === 0) continue;
        const statuses = here.map(chargerStatus);
        const worst = URGENCY.find((s) => statuses.includes(s)) ?? "available";

        const icon = L.divIcon({
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:9999px;background:${COLOR[worst]};color:white;font:600 13px var(--font-sans);box-shadow:0 0 0 3px white,0 2px 8px rgb(0 0 0/.25)">${here.length}</span>`,
        });

        // Built with DOM nodes (textContent), never HTML strings, since names come from users
        const popup = document.createElement("div");
        popup.style.minWidth = "200px";
        const title = document.createElement("p");
        title.textContent = site.name;
        title.style.cssText = "margin:0 0 6px;font-weight:600";
        popup.append(title);
        for (const c of here) {
          const status = chargerStatus(c);
          const button = document.createElement("button");
          button.type = "button";
          button.style.cssText =
            "display:flex;width:100%;justify-content:space-between;gap:12px;padding:4px 0;background:none;border:0;cursor:pointer;font:13px var(--font-sans);text-align:left";
          const id = document.createElement("span");
          id.textContent = `${c.chargePointId} ${c.model ?? ""}`;
          id.style.fontFamily = "var(--font-mono)";
          const state = document.createElement("span");
          state.textContent = `● ${LABEL[status]}`;
          state.style.color = COLOR[status];
          button.append(id, state);
          button.addEventListener("click", () => openRef.current(c.id));
          popup.append(button);
        }

        L.marker([site.latitude, site.longitude], {
          icon,
          title: `${site.name}: ${here.length} ${here.length === 1 ? "charger" : "chargers"}, ${LABEL[worst].toLowerCase()}`,
          keyboard: true,
        })
          .bindPopup(popup)
          .addTo(group);
        placed.push([site.latitude, site.longitude]);
      }
      // Frame the network once; later live updates leave the view where the user put it
      if (!fitted.current && placed.length > 0) {
        map.current!.fitBounds(L.latLngBounds(placed), {
          padding: [40, 40],
          maxZoom: 14,
        });
        fitted.current = true;
      }
    });
  }, [ready, sites, chargers]);

  const located = sites?.filter((s) => s.latitude !== null).length ?? 0;

  return (
    <div>
      <div
        ref={el}
        role="region"
        aria-label="Map of sites and charger status"
        className="h-80 w-full overflow-hidden rounded-xl border border-line bg-subtle"
      />
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
        {(["charging", "available", "faulted", "offline"] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: COLOR[s] }}
            />
            {LABEL[s]}
          </li>
        ))}
        <li className="text-ink-3">
          Each marker is a site, coloured by its most urgent charger.
        </li>
      </ul>
      {sites && located < sites.length && (
        <p className="mt-1 text-[12.5px] text-ink-3">
          {sites.length - located}{" "}
          {sites.length - located === 1 ? "site has" : "sites have"} no map
          position yet.
        </p>
      )}
    </div>
  );
}
