/* eslint-disable @typescript-eslint/no-explicit-any */
// The backend-free demo (NEXT_PUBLIC_DEMO_MODE=true): answers the app's API calls in the
// browser from a snapshot of a real voltline-api (scripts/demo-snapshot.mjs). Dates are
// shifted so "today" stays today. Changes live in memory and reset when the tab reloads.
import { inPeakWindow, minuteOfDay, price } from "../pricing";
import raw from "./snapshot.json";

const DEMO_PASSWORD = "voltline-demo-123";
const DEMO_CODE = "123456";
const TEAM: Record<string, { name: string; role: string }> = {
  "admin@voltline.local": { name: "Demo Admin", role: "ADMIN" },
  "bola@voltline.local": { name: "Bola Ojo", role: "OPERATOR" },
  "grace@voltline.local": { name: "Grace Nwosu", role: "FINANCE" },
  "support@voltline.local": { name: "Field support", role: "SUPPORT" },
};
const TZ = "Africa/Lagos";

// ─── State ───────────────────────────────────────────────────────────────────

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const loadedAt = Date.now();
const shift = loadedAt - Date.parse((raw as any).takenAt);
function shifted<T>(value: T): T {
  if (typeof value === "string" && ISO.test(value)) {
    return new Date(Date.parse(value) + shift).toISOString() as T;
  }
  if (Array.isArray(value)) return value.map(shifted) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shifted(v)]),
    ) as T;
  }
  return value;
}
const db: any = shifted(structuredClone(raw));

interface Live {
  id: string;
  reference: string;
  chargerId: string;
  chargePointId: string;
  evseId: number;
  type: string;
  stationId: string;
  stationName: string;
  startedAt: number;
  endedAt: number | null;
  powerW: number;
  station: any;
}
const driver = {
  seen: new Set<string>(),
  sessions: [] as Live[],
  phone: "",
};
/** The driver's sessions are shared through localStorage, so the console in another tab sees them. */
const STORE = "vl-demo-driver";
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (saved) {
      driver.sessions = saved.sessions;
      driver.seen = new Set(saved.seen);
      driver.phone = saved.phone;
    }
  } catch {
    // Private mode: each tab keeps its own
  }
}
function save() {
  try {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        sessions: driver.sessions,
        seen: [...driver.seen],
        phone: driver.phone,
      }),
    );
  } catch {
    // Private mode: each tab keeps its own
  }
}
const nextReference = () =>
  `S-${
    1 +
    Math.max(
      ...db.console.sessions.rows.map((r: any) => Number(r.reference.slice(2))),
      ...driver.sessions.map((l) => Number(l.reference.slice(2))),
    )
  }`;

// ─── Plumbing ────────────────────────────────────────────────────────────────

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const empty = (status = 204) => new Response(null, { status });
const fail = (status: number, message: string) =>
  json({ statusCode: status, message, error: "Demo" }, status);

const cookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
const setCookie = (name: string, value: string | null) => {
  document.cookie =
    value === null
      ? `${name}=; path=/; max-age=0`
      : `${name}=${value}; path=/; max-age=2592000; samesite=lax`;
};
const role = () => {
  const email = decodeURIComponent(cookie("vl_refresh") ?? "");
  return TEAM[email] ? { email, ...TEAM[email] } : null;
};
const uuid = () => crypto.randomUUID();
const wobble = (w: number | null) =>
  w === null ? null : Math.round(w * (0.97 + Math.random() * 0.06));

type Handler = (m: {
  params: string[];
  query: URLSearchParams;
  body: any;
}) => Response | Promise<Response>;
const routes: [string, RegExp, Handler][] = [];
const route = (method: string, pattern: string, handler: Handler) =>
  routes.push([
    method,
    new RegExp(`^/v1${pattern.replace(/:\w+/g, "([^/]+)")}$`),
    handler,
  ]);

/** Drop-in for fetch: the API client calls this instead of the network. */
export async function demoFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "");
  const body = ["POST", "PUT", "PATCH"].includes(request.method)
    ? await request.text().then((t) => (t ? JSON.parse(t) : {}))
    : undefined;
  for (const [method, re, handler] of routes) {
    const m = re.exec(path);
    if (m && method === request.method) {
      // Console routes need the demo sign-in; driver routes the driver one
      if (path.startsWith("/v1/console/") && !role())
        return fail(401, "Sign in to continue.");
      if (
        path.startsWith("/v1/app/") &&
        !path.startsWith("/v1/app/auth/") &&
        !cookie("vl_driver")
      )
        return fail(401, "Sign in with your phone number to continue.");
      await new Promise((r) => setTimeout(r, 120)); // feel like a network
      load();
      const response = await handler({
        params: m.slice(1).map(decodeURIComponent),
        query: url.searchParams,
        body,
      });
      if (request.method !== "GET") save();
      return response;
    }
  }
  return fail(404, "That isn’t available in the demo.");
}

// ─── Console: auth and profile ───────────────────────────────────────────────

route("POST", "/auth/sign-in", ({ body }) => {
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  if (!TEAM[email] || body.password !== DEMO_PASSWORD)
    return fail(401, "Email or password is incorrect.");
  setCookie("vl_refresh", encodeURIComponent(email));
  return empty();
});
route("POST", "/auth/sign-up", () =>
  fail(
    403,
    "Creating accounts is turned off in this demo. Sign in with admin@voltline.local and voltline-demo-123.",
  ),
);
route("POST", "/auth/refresh", () =>
  role() ? empty() : fail(401, "Sign in again."),
);
route("POST", "/auth/sign-out", () => {
  setCookie("vl_refresh", null);
  return empty();
});
route("GET", "/console/me", () => {
  const r = role()!;
  return json({
    ...db.console.me,
    role: r.role,
    user: { ...db.console.me.user, name: r.name, email: r.email },
  });
});
route("GET", "/console/onboarding", () => json(db.console.onboarding));
route("POST", "/console/realtime/ticket", () =>
  fail(404, "No live socket in the demo."),
);

// ─── Console: overview, network, alerts ──────────────────────────────────────

const rows = () => db.console.chargers as any[];
const detailOf = (id: string) => db.chargers[id]?.detail;
const syncRow = (id: string) => {
  const d = detailOf(id);
  const i = rows().findIndex((r) => r.id === id);
  if (d && i >= 0)
    rows()[i] = { ...rows()[i], status: d.status, approval: d.approval };
};

route("GET", "/console/overview", () => {
  const o = structuredClone(db.console.overview);
  o.powerW = rows().reduce(
    (a, r) => a + (r.status === "CHARGING" ? (wobble(r.powerW) ?? 0) : 0),
    0,
  );
  return json(o);
});
route("GET", "/console/network", () =>
  json({ ...db.console.network, openAlerts: db.console.alerts.length }),
);
route("GET", "/console/alerts", () => json(db.console.alerts));
route("POST", "/console/alerts/:id/resolve", ({ params }) => {
  db.console.alerts = db.console.alerts.filter((a: any) => a.id !== params[0]);
  return empty();
});

// ─── Console: chargers ───────────────────────────────────────────────────────

const live = (r: any) => ({
  ...r,
  powerW: r.status === "CHARGING" ? wobble(r.powerW) : r.powerW,
  // Connected chargers keep talking: their last message is always recent
  lastSeenAt: r.connected
    ? new Date(Date.now() - Math.floor(Math.random() * 20_000)).toISOString()
    : r.lastSeenAt,
});
route("GET", "/console/chargers", () => json(rows().map(live)));
route("GET", "/console/chargers/next-id", () => json(db.console.nextId));
route("GET", "/console/id-tokens", () => json(db.console.idTokens));
route("GET", "/console/chargers/:id", ({ params }) => {
  const d = detailOf(params[0]);
  return d ? json(live(d)) : fail(404, "Charger not found.");
});
route("GET", "/console/chargers/:id/messages", ({ params }) =>
  json((db.chargers[params[0]]?.messages ?? []).slice(0, 50)),
);
route("GET", "/console/chargers/:id/messages/search", ({ params, query }) => {
  const q = (query.get("q") ?? "").toLowerCase();
  const action = query.get("action");
  const direction = query.get("direction");
  const all: any[] = db.chargers[params[0]]?.messages ?? [];
  const messages = all.filter(
    (m) =>
      (!q ||
        `${m.action} ${JSON.stringify(m.payload)}`.toLowerCase().includes(q)) &&
      (!action || m.action === action || m.action === `${action}.conf`) &&
      (!direction || m.direction === direction),
  );
  const actions = [
    ...new Set(
      all.map((m) => m.action).filter((a: string) => !a.endsWith(".conf")),
    ),
  ].sort();
  return json({ messages, nextBefore: null, actions });
});
route("GET", "/console/chargers/:id/connect-check", ({ params }) => {
  const c = db.chargers[params[0]];
  if (!c) return fail(404, "Charger not found.");
  // A charger added in the demo "connects" over a few seconds, so the wizard can be followed
  if (c.createdAt) {
    const s = (Date.now() - c.createdAt) / 1000;
    const step = (after: number, detail: string) =>
      s > after
        ? { state: "done", detail }
        : { state: "waiting", detail: null };
    return json({
      socket: step(4, "ocpp2.0.1"),
      credentials: step(5, "Basic Auth · TLS 1.3"),
      boot: step(7, `${c.detail.model ?? "DC60"} · fw 4.2.1`),
      connectors: step(
        9,
        c.detail.evses
          .map((e: any) => `EVSE ${e.evseId} · Available`)
          .join(", "),
      ),
    });
  }
  return json(c.check);
});
route("GET", "/console/chargers/:id/configuration", ({ params }) => {
  const c = db.chargers[params[0]];
  return c?.configuration
    ? json(c.configuration)
    : fail(409, "This charger is not connected right now.");
});
route("PUT", "/console/chargers/:id/configuration", ({ params, body }) => {
  const items: any[] = db.chargers[params[0]]?.configuration ?? [];
  const item = items.find(
    (i) => i.key === body.key && i.component === (body.component ?? null),
  );
  if (!item) return json({ status: "NotSupported" });
  if (item.readonly) return json({ status: "Rejected" });
  item.value = body.value;
  return json({ status: "Accepted" });
});

const COMMAND: Record<string, [string, string]> = {
  "remote-start": ["Remote start accepted", "RequestStartTransaction"],
  "remote-stop": ["Stop accepted", "RequestStopTransaction"],
  unlock: ["Connector unlocked", "UnlockConnector"],
  "soft-reset": ["Soft reset accepted", "Reset"],
  "hard-reset": ["Hard reset accepted", "Reset"],
  "set-available": ["Set to available", "ChangeAvailability"],
  "set-unavailable": ["Set to unavailable", "ChangeAvailability"],
};
route("POST", "/console/chargers/:id/commands", ({ params, body }) => {
  const d = detailOf(params[0]);
  if (!d) return fail(404, "Charger not found.");
  const [title, action] = COMMAND[body.kind] ?? ["Accepted", body.kind];
  if (!d.connected) {
    return json({
      id: uuid(),
      status: "QUEUED",
      title: `${d.chargePointId} is offline`,
      detail: `${action} is queued and sent the moment it reconnects.`,
    });
  }
  if (d.status === "FAULTED" && body.kind === "soft-reset") {
    return json({
      id: uuid(),
      status: "REJECTED",
      title: `Reset rejected by ${d.chargePointId}`,
      detail:
        "Charger replied Rejected: a fault is active. Clear the fault first.",
    });
  }
  if (body.kind === "set-unavailable") d.status = "UNAVAILABLE";
  if (body.kind === "set-available") d.status = "AVAILABLE";
  syncRow(d.id);
  return json({
    id: uuid(),
    status: "ACCEPTED",
    title,
    detail: `${d.chargePointId} · ${action}.conf Accepted`,
  });
});
route("POST", "/console/chargers/:id/commands/:cid/cancel", () => empty());
route("POST", "/console/chargers/:id/reservations", ({ params, body }) => {
  const d = detailOf(params[0]);
  const card = db.console.idTokens.find((t: any) => t.id === body.idTokenId);
  if (!d || !card) return fail(404, "Charger or card not found.");
  if (d.status !== "AVAILABLE" || d.reservations.length)
    return json({
      status: "REJECTED",
      title: `${d.chargePointId} refused the reservation`,
      detail: "Charger replied Occupied.",
    });
  d.reservations.push({
    id: uuid(),
    evseId: body.evseId,
    idTag: card.uid,
    driver: card.holder,
    expiresAt: new Date(Date.now() + body.minutes * 60_000).toISOString(),
    status: "ACTIVE",
    rejection: null,
  });
  d.status = "RESERVED";
  syncRow(d.id);
  return json({
    status: "ACTIVE",
    title: `EVSE ${body.evseId} reserved for ${card.uid}`,
    detail: "Held.",
  });
});
route(
  "POST",
  "/console/chargers/:id/reservations/:rid/cancel",
  ({ params }) => {
    const d = detailOf(params[0]);
    d.reservations = d.reservations.filter((r: any) => r.id !== params[1]);
    if (d.status === "RESERVED") d.status = "AVAILABLE";
    syncRow(d.id);
    return empty();
  },
);
route("POST", "/console/chargers/:id/local-list/sync", ({ params }) => {
  const d = detailOf(params[0]);
  d.localListVersion += 1;
  d.localListSyncedAt = new Date().toISOString();
  return json({
    status: "Accepted",
    version: d.localListVersion,
    entries: db.console.idTokens.length,
  });
});

// ─── Console: drivers and RFID cards ────────────────────────────────────────

const driversPage = () => db.console.drivers;
route("GET", "/console/drivers", ({ query }) => {
  const q = (query.get("q") ?? "").trim().toLowerCase();
  const digits = q.replace(/\D/g, "").replace(/^0/, "");
  const hex = q.replace(/[\s:]/g, "");
  const page = driversPage();
  const drivers = q
    ? page.drivers.filter(
        (d: any) =>
          d.name?.toLowerCase().includes(q) ||
          d.fleet?.toLowerCase().includes(q) ||
          // Phones are masked (+234 815 ••• 6630): match the parts that show
          (digits.length >= 3 &&
            d.phone
              ?.replace(/\D/g, "")
              .startsWith(`234${digits.slice(0, 3)}`) &&
            (digits.length < 7 ||
              d.phone.replace(/\D/g, "").endsWith(digits.slice(-4)))) ||
          d.cards.some((uid: string) =>
            uid.replace(/:/g, "").toLowerCase().includes(hex),
          ),
      )
    : page.drivers;
  return json({ ...page, drivers });
});
const setDriverStatus = (id: string, status: string) => {
  const d = driversPage().drivers.find((x: any) => x.id === id);
  if (!d) return fail(404, "Driver not found.");
  d.status = status;
  return json({ driver: d, syncing: rows().filter((r) => r.connected).length });
};
route("POST", "/console/drivers/:id/block", ({ params }) =>
  setDriverStatus(params[0], "BLOCKED"),
);
route("POST", "/console/drivers/:id/unblock", ({ params }) =>
  setDriverStatus(params[0], "ACTIVE"),
);
route("POST", "/console/id-tokens", ({ body }) => {
  const hex = String(body.uid)
    .replace(/[\s:-]/g, "")
    .toUpperCase();
  if (!/^([0-9A-F]{2}){4,10}$/.test(hex))
    return fail(400, "Card UIDs are 4 to 10 hex bytes, like 04:A2:1C:9F.");
  const uid = hex.match(/.{2}/g)!.join(":");
  const page = driversPage();
  const taken = db.console.idTokens.find((t: any) => t.uid === uid);
  if (taken)
    return fail(
      409,
      `${uid} is already issued${taken.holder ? ` to ${taken.holder}` : ""}.`,
    );
  const holder = page.drivers.find((d: any) => d.id === body.driverId);
  const fleet = page.fleets.find(
    (f: any) => f.id === (body.fleetId ?? null) || f.name === holder?.fleet,
  );
  holder?.cards.push(uid);
  if (fleet) fleet.cards += 1;
  page.cardsIssued += 1;
  const name = holder?.name ?? fleet?.name ?? null;
  const card = { id: uuid(), uid, holder: name };
  db.console.idTokens.push(card);
  return json(
    { ...card, syncing: rows().filter((r) => r.connected).length },
    201,
  );
});
route("POST", "/console/fleets", ({ body }) => {
  const fleet = {
    id: uuid(),
    name: String(body.name).trim(),
    cards: 0,
    monthKobo: 0,
    invoiceDay: body.invoiceDay ?? 1,
  };
  driversPage().fleets.push(fleet);
  return json(fleet, 201);
});
// No card reader in the demo: a card "taps" a couple of seconds later
route("POST", "/console/chargers/:id/read-card", async () => {
  await new Promise((r) => setTimeout(r, 2200));
  const uid = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b, i) =>
    (i === 0 ? 4 : b).toString(16).padStart(2, "0").toUpperCase(),
  ).join(":");
  return json({ uid, known: false });
});

const password = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(24)),
    (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56],
  ).join("");
const evsesFrom = (connectors: any[]) =>
  connectors.map((c, i) => ({
    evseId: i + 1,
    connectors: [
      {
        connectorId: 1,
        type: c.type,
        maxPowerW: c.maxKw * 1000,
        status: "AVAILABLE",
      },
    ],
  }));
const LABEL: Record<string, string> = {
  CCS2: "CCS2",
  TYPE2: "Type 2",
  CHADEMO: "CHAdeMO",
};

route("POST", "/console/chargers", ({ body }) => {
  if (
    rows().some(
      (r) => r.chargePointId.toLowerCase() === body.chargePointId.toLowerCase(),
    )
  )
    return fail(
      409,
      `${body.chargePointId} is already registered. Charge point IDs are unique across Voltline; choose another.`,
    );
  let site = db.console.sites.find((s: any) => s.id === body.siteId);
  if (!site && body.newSiteName) {
    site = {
      id: uuid(),
      name: body.newSiteName,
      area: null,
      address: null,
      latitude: null,
      longitude: null,
      openingHours: "Open 24 hours",
      gridLimitKw: null,
      chargerCount: 0,
    };
    db.console.sites.push(site);
  }
  if (!site) return fail(422, "Choose a site, or add a new one.");
  site.chargerCount += 1;
  const id = uuid();
  const first = body.connectors[0];
  const tariff = db.console.tariffs.find(
    (t: any) => !t.fleet && t.sites.some((s: any) => s.id === site.id),
  );
  const detail = {
    id,
    chargePointId: body.chargePointId,
    model: body.model ?? null,
    vendor: body.vendor ?? null,
    siteId: site.id,
    siteName: site.name,
    status: "AVAILABLE",
    approval: "PENDING",
    connector: `${LABEL[first.type]} · ${first.maxKw} kW`,
    powerW: null,
    lastSeenAt: null,
    protocol: "2.0.1",
    connected: true,
    activeSessions: [],
    reservations: [],
    localListVersion: 0,
    localListSyncedAt: null,
    firmwareVersion: "4.2.1",
    securityProfile: 2,
    ocppUrl: `wss://ocpp.voltline.example/ocpp/${body.chargePointId}`,
    evses: evsesFrom(body.connectors),
    tariff: tariff
      ? { name: tariff.name, perKwhKobo: tariff.perKwhKobo }
      : null,
  };
  db.chargers[id] = {
    detail,
    messages: [],
    check: null,
    configuration: null,
    createdAt: Date.now(),
  };
  rows().push({ ...detail });
  return json({ charger: detail, password: password() }, 201);
});
route("PATCH", "/console/chargers/:id", ({ params, body }) => {
  const d = detailOf(params[0]);
  if (body.vendor !== undefined) d.vendor = body.vendor;
  if (body.model !== undefined) d.model = body.model;
  if (body.connectors) d.evses = evsesFrom(body.connectors);
  return json(d);
});
route("POST", "/console/chargers/:id/credentials/rotate", () =>
  json({ password: password() }),
);
route("POST", "/console/chargers/:id/approve", ({ params }) => {
  const d = detailOf(params[0]);
  d.approval = "ACCEPTED";
  d.lastSeenAt = new Date().toISOString();
  syncRow(d.id);
  db.console.network.chargers += 1;
  db.console.network.socketsConnected += 1;
  return json(d);
});

// ─── Console: sessions ───────────────────────────────────────────────────────

const RANGE_DAYS: Record<string, number> = { today: 0, "7d": 6, "30d": 29 };
function rangeStart(range: string) {
  const local = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const offset = local.getTime() - Date.now();
  local.setHours(0, 0, 0, 0);
  if (range === "month") local.setDate(1);
  else local.setDate(local.getDate() - (RANGE_DAYS[range] ?? 6));
  return local.getTime() - offset;
}
const ISSUES = ["STOPPED_BY_FAULT", "PAYMENT_FAILED"];
/** Sample sessions plus the ones started in the demo's driver app, newest first. */
const allRows = (): any[] =>
  [
    ...driver.sessions.map((l) => {
      const v = liveView(l);
      return {
        id: l.id,
        reference: l.reference,
        driver: db.driver.me.name ?? "Demo driver",
        chargerId: l.chargerId,
        chargePointId: l.chargePointId,
        siteName: l.stationName,
        startedAt: v.startedAt,
        endedAt: v.endedAt,
        energyWh: v.energyWh,
        amountKobo: v.costKobo,
        status: v.status,
      };
    }),
    ...db.console.sessions.rows,
  ].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
const COMPLETED = ["COMPLETED", "REFUNDED"];

route("GET", "/console/sessions", ({ query }) => {
  const start = rangeStart(query.get("range") ?? "7d");
  const q = (query.get("q") ?? "").trim().toLowerCase();
  // Rows show "Tunde B."; Drivers › View sessions searches "Tunde Bakare"
  const [first, last] = q.split(/\s+/);
  const short = last ? `${first} ${last[0]}.` : null;
  const inRange = allRows().filter((r) => Date.parse(r.startedAt) >= start);
  const searched = inRange.filter(
    (r) =>
      !q ||
      [r.reference, r.driver, r.chargePointId].some(
        (v: string) =>
          v.toLowerCase().includes(q) || (short && v.toLowerCase() === short),
      ),
  );
  const status = query.get("status") ?? "all";
  const rowsOut = searched.filter((r) =>
    status === "active"
      ? r.status === "ACTIVE"
      : status === "completed"
        ? COMPLETED.includes(r.status)
        : status === "issues"
          ? ISSUES.includes(r.status)
          : true,
  );
  const count = (f: (r: any) => boolean) => searched.filter(f).length;
  return json({
    totals: {
      sessions: searched.length,
      energyWh: searched.reduce((a, r) => a + r.energyWh, 0),
      billedKobo: searched
        .filter((r) => ["COMPLETED", ...ISSUES].includes(r.status))
        .reduce((a, r) => a + r.amountKobo, 0),
      needsReview: count((r) => ISSUES.includes(r.status)),
    },
    counts: {
      all: searched.length,
      active: count((r) => r.status === "ACTIVE"),
      completed: count((r) => COMPLETED.includes(r.status)),
      issues: count((r) => ISSUES.includes(r.status)),
    },
    rows: rowsOut,
    truncated: false,
  });
});
route("GET", "/console/sessions/export.csv", ({ query }) => {
  const start = rangeStart(query.get("range") ?? "7d");
  const lines = allRows()
    .filter((r) => Date.parse(r.startedAt) >= start)
    .map((r) =>
      [
        r.reference,
        r.driver,
        r.chargePointId,
        r.siteName,
        r.startedAt,
        r.endedAt ?? "",
        (r.energyWh / 1000).toFixed(1),
        (r.amountKobo / 100).toFixed(2),
        r.status,
      ].join(","),
    );
  const csv = [
    "Session,Driver,Charger,Site,Started,Ended,Energy (kWh),Amount (NGN),Status",
    ...lines,
  ].join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv" } });
});
route("GET", "/console/sessions/:id", ({ params }) => {
  const own = driver.sessions.find((l) => l.id === params[0]);
  const s = own ? detailView(own) : db.sessions[params[0]];
  return s ? json(s) : fail(404, "Session not found.");
});
route("POST", "/console/sessions/:id/stop", ({ params }) => {
  const own = driver.sessions.find((l) => l.id === params[0] && !l.endedAt);
  if (own) endLive(own);
  return json({
    id: uuid(),
    status: "ACCEPTED",
    title: "Stop accepted",
    detail: "RequestStopTransaction.conf Accepted",
  });
});

// ─── Console: tariffs, sites, settings ───────────────────────────────────────

route("GET", "/console/tariffs", () => json(db.console.tariffs));
route("POST", "/console/tariffs", ({ body }) => {
  const t = {
    ...body,
    id: uuid(),
    version: 1,
    sessionCount: 0,
    fleet: null,
    sites: db.console.sites
      .filter((s: any) => body.siteIds.includes(s.id))
      .map((s: any) => ({ id: s.id, name: s.name })),
  };
  delete t.siteIds;
  db.console.tariffs.push(t);
  return json(t, 201);
});
route("PUT", "/console/tariffs/:id", ({ params, body }) => {
  const i = db.console.tariffs.findIndex((t: any) => t.id === params[0]);
  const old = db.console.tariffs[i];
  const priced = [
    "perKwhKobo",
    "perMinuteKobo",
    "sessionFeeKobo",
    "idleGraceMin",
    "idlePerMinuteKobo",
    "peakFrom",
    "peakTo",
    "peakSurchargeBps",
    "vatIncluded",
  ].some((k) => old[k] !== body[k]);
  const versioned = priced && old.sessionCount > 0;
  const next = {
    ...old,
    ...body,
    sites: db.console.sites
      .filter((s: any) => body.siteIds.includes(s.id))
      .map((s: any) => ({ id: s.id, name: s.name })),
    ...(versioned
      ? { id: uuid(), version: old.version + 1, sessionCount: 0 }
      : {}),
  };
  delete next.siteIds;
  db.console.tariffs[i] = next;
  return json(next);
});
route("GET", "/console/sites", () => json(db.console.sites));
route("POST", "/console/sites", ({ body }) => {
  if (
    db.console.sites.some(
      (s: any) => s.name.toLowerCase() === body.name.toLowerCase(),
    )
  )
    return fail(409, `A site called ${body.name} already exists.`);
  const site = {
    area: null,
    address: null,
    latitude: null,
    longitude: null,
    openingHours: "Open 24 hours",
    gridLimitKw: null,
    ...body,
    id: uuid(),
    chargerCount: 0,
  };
  db.console.sites.push(site);
  return json(site, 201);
});
route("PATCH", "/console/sites/:id", ({ params, body }) => {
  const site = db.console.sites.find((s: any) => s.id === params[0]);
  Object.assign(site, body);
  return json(site);
});
route("GET", "/console/ocpp-settings", () => json(db.console.ocppSettings));
route("PATCH", "/console/ocpp-settings", ({ body }) => {
  if (role()?.role !== "ADMIN")
    return fail(403, "Your role does not allow this action.");
  Object.assign(db.console.ocppSettings, body);
  return json(db.console.ocppSettings);
});

// ─── Driver app ──────────────────────────────────────────────────────────────

route("POST", "/app/auth/otp/send", ({ body }) => {
  let digits = String(body.phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("234")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[789]\d{9}$/.test(digits))
    return fail(400, "Enter a Nigerian mobile number like 803 000 0000.");
  driver.phone = `+234${digits}`;
  return json({ phone: driver.phone, devCode: DEMO_CODE });
});
route("POST", "/app/auth/otp/verify", ({ body }) => {
  if (body.code !== DEMO_CODE)
    return fail(401, "That code is not right. Check the text and try again.");
  const isNew = !driver.seen.has(driver.phone);
  driver.seen.add(driver.phone);
  setCookie("vl_driver", "demo");
  return json({ isNew });
});
route("POST", "/app/auth/sign-out", () => {
  setCookie("vl_driver", null);
  return empty();
});
route("GET", "/app/me", () =>
  json({ ...db.driver.me, phone: driver.phone || db.driver.me.phone }),
);
route("PATCH", "/app/me", ({ body }) => {
  Object.assign(db.driver.me, body);
  return json({ ...db.driver.me, phone: driver.phone || db.driver.me.phone });
});
route("POST", "/app/me/cards", ({ body }) => {
  const hex = String(body.uid).replace(/:/g, "").toUpperCase();
  const uid = hex.match(/.{2}/g)!.join(":");
  if (!db.driver.me.cards.includes(uid)) db.driver.me.cards.push(uid);
  return json(db.driver.me);
});

/** Stations, with the demo driver's own running session holding its connector. */
const stations = () =>
  (db.driver.stations as any[]).map((s) => {
    const connectors = s.connectors.map((c: any) =>
      driver.sessions.some(
        (l) =>
          !l.endedAt && l.chargerId === c.chargerId && l.evseId === c.evseId,
      )
        ? { ...c, status: "CHARGING" }
        : c,
    );
    return {
      ...s,
      connectors,
      free: connectors.filter((c: any) => c.status === "AVAILABLE").length,
    };
  });
route("GET", "/app/stations", () => json(stations()));
route("GET", "/app/stations/:id", ({ params }) => {
  const s = stations().find((x) => x.id === params[0]);
  return s ? json(s) : fail(404, "Station not found.");
});
route("GET", "/app/chargers/by-code/:code", ({ params }) => {
  const code = params[0].trim().toUpperCase();
  const s = stations().find((x) =>
    x.connectors.some((c: any) => c.chargePointId === code),
  );
  if (!s)
    return fail(
      404,
      `No charger called ${code}. Check the ID printed under the QR code.`,
    );
  return json({
    ...s,
    connectors: s.connectors.filter((c: any) => c.chargePointId === code),
  });
});

const energyOf = (l: Live) =>
  Math.round(
    (l.powerW * ((l.endedAt ?? Date.now()) - l.startedAt)) / 3_600_000,
  );
function costOf(l: Live) {
  const t = l.station.price;
  if (!t) {
    // No tariff at this site: nothing billed
    return price(
      {
        perKwhKobo: 0,
        perMinuteKobo: 0,
        sessionFeeKobo: 0,
        idleGraceMin: null,
        idlePerMinuteKobo: null,
        peakFrom: null,
        peakTo: null,
        peakSurchargeBps: null,
        vatIncluded: true,
        vatBps: 750,
      },
      {
        energyWh: energyOf(l),
        chargingMinutes: 0,
        pluggedMinutes: 0,
        atPeak: false,
      },
    );
  }
  const minutes = Math.round(
    ((l.endedAt ?? Date.now()) - l.startedAt) / 60_000,
  );
  return price(
    { ...t, perMinuteKobo: 0, vatIncluded: true, vatBps: 750 },
    {
      energyWh: energyOf(l),
      chargingMinutes: minutes,
      pluggedMinutes: minutes,
      atPeak: inPeakWindow(t, minuteOfDay(new Date(l.startedAt), TZ)),
    },
  );
}
function liveView(l: Live) {
  return {
    id: l.id,
    reference: l.reference,
    status: l.endedAt ? "COMPLETED" : "ACTIVE",
    stationName: l.stationName,
    chargePointId: l.chargePointId,
    evseId: l.evseId,
    connectorType: l.type,
    startedAt: new Date(l.startedAt).toISOString(),
    endedAt: l.endedAt ? new Date(l.endedAt).toISOString() : null,
    energyWh: energyOf(l),
    powerW: l.endedAt ? null : wobble(l.powerW),
    socPct:
      l.type === "CCS2"
        ? Math.min(100, 22 + Math.round(energyOf(l) / 600))
        : null,
    costKobo: costOf(l).totalKobo,
    autoStopKobo: db.driver.me.autoStopKobo,
    idle: false,
  };
}
/** The same shape as the console's session detail, built from the demo session. */
function detailView(l: Live) {
  const view = liveView(l);
  const steps = Math.max(
    2,
    Math.min(
      60,
      Math.round(((l.endedAt ?? Date.now()) - l.startedAt) / 10_000),
    ),
  );
  const span = (l.endedAt ?? Date.now()) - l.startedAt;
  const b = costOf(l);
  return {
    id: l.id,
    reference: l.reference,
    driver: db.driver.me.name ?? "Demo driver",
    chargerId: l.chargerId,
    chargePointId: l.chargePointId,
    siteName: l.stationName,
    startedAt: view.startedAt,
    endedAt: view.endedAt,
    energyWh: view.energyWh,
    amountKobo: view.costKobo,
    status: view.status,
    stopReason: l.endedAt ? "Remote" : null,
    chargingEndedAt: view.endedAt,
    issue: null,
    power: Array.from({ length: steps }, (_, i) => ({
      at: new Date(l.startedAt + (span * i) / (steps - 1)).toISOString(),
      powerW: wobble(l.powerW)!,
      socPct: null,
    })),
    peakPowerW: Math.round(l.powerW * 1.03),
    timeline: [
      { at: view.startedAt, label: "Authorized", detail: "idToken Accepted" },
      {
        at: view.startedAt,
        label: "Charging started",
        detail: "TransactionEvent · Started",
      },
      ...(l.endedAt
        ? [
            {
              at: view.endedAt,
              label: "Ended",
              detail: "TransactionEvent · Ended · Remote",
            },
          ]
        : []),
    ],
    billing: { ...b, final: Boolean(l.endedAt) },
    tariff: l.station.price
      ? {
          name: l.station.price.name,
          version: 1,
          perKwhKobo: l.station.price.perKwhKobo,
          vatBps: 750,
          peakSurchargeBps: l.station.price.peakSurchargeBps,
        }
      : null,
    paymentMethod: "Wallet",
    siteAddress: l.station.area,
    workspaceName: "Voltline Demo",
    registeredCompanyName: "Flex Mobility Limited",
  };
}
function endLive(l: Live) {
  l.endedAt = Date.now();
}

route("POST", "/app/sessions", ({ body }) => {
  if (driver.sessions.some((l) => !l.endedAt))
    return fail(409, "You already have a session running.");
  const station = stations().find((s) =>
    s.connectors.some(
      (c: any) => c.chargerId === body.chargerId && c.evseId === body.evseId,
    ),
  );
  const connector = station?.connectors.find(
    (c: any) => c.chargerId === body.chargerId && c.evseId === body.evseId,
  );
  if (!station || !connector) return fail(404, "Charger not found.");
  if (station.offline || connector.status === "OFFLINE")
    return json({
      outcome: "OFFLINE",
      title: `${station.name} is offline`,
      message:
        "This charger is not checked in, so it cannot start a session from the app. An RFID card may still work on site.",
    });
  if (connector.status !== "AVAILABLE")
    return fail(
      409,
      `EVSE ${body.evseId} is in use. Choose another connector.`,
    );
  const l: Live = {
    id: uuid(),
    reference: nextReference(),
    chargerId: connector.chargerId,
    chargePointId: connector.chargePointId,
    evseId: connector.evseId,
    type: connector.type,
    stationId: station.id,
    stationName: station.name,
    startedAt: Date.now(),
    endedAt: null,
    powerW: Math.round(connector.maxKw * 700),
    station,
  };
  driver.sessions.unshift(l);
  return json({
    outcome: "ACCEPTED",
    title: "Charging started",
    message: `The charger accepted the start. ${l.chargePointId} · EVSE ${l.evseId}.`,
  });
});
route("GET", "/app/sessions/live", () => {
  const l = driver.sessions.find(
    (s) => !s.endedAt || Date.now() - s.endedAt < 10 * 60_000,
  );
  return json({ session: l ? liveView(l) : null });
});
route("POST", "/app/sessions/:id/stop", ({ params }) => {
  const l = driver.sessions.find((s) => s.id === params[0] && !s.endedAt);
  if (!l) return fail(409, "This session has already ended.");
  endLive(l);
  return json({ outcome: "ACCEPTED" });
});
route("GET", "/app/sessions", () => {
  const ended = driver.sessions.filter((l) => l.endedAt);
  return json({
    month: new Date().toLocaleDateString("en-GB", {
      month: "long",
      timeZone: TZ,
    }),
    monthEnergyWh: ended.reduce((a, l) => a + energyOf(l), 0),
    monthAmountKobo: ended.reduce((a, l) => a + costOf(l).totalKobo, 0),
    sessions: driver.sessions.map((l) => {
      const v = liveView(l);
      return {
        id: l.id,
        reference: l.reference,
        stationName: l.stationName,
        connectorType: l.type,
        startedAt: v.startedAt,
        endedAt: v.endedAt,
        energyWh: v.energyWh,
        amountKobo: v.costKobo,
        status: v.status,
      };
    }),
  });
});
route("GET", "/app/sessions/:id", ({ params }) => {
  const l = driver.sessions.find((s) => s.id === params[0]);
  return l ? json(detailView(l)) : fail(404, "Session not found.");
});
