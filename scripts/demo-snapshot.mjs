// Captures the running voltline-api's responses into lib/demo/snapshot.json, which the
// backend-free demo (NEXT_PUBLIC_DEMO_MODE=true) serves. Run with the API and the simulated
// fleet up:  npm run demo:snapshot   (API_URL defaults to http://localhost:4000)
import { writeFileSync } from "node:fs";

const API = (process.env.API_URL ?? "http://localhost:4000") + "/v1";
const ADMIN = { email: "admin@voltline.local", password: "voltline-demo-123" };
// A seeded driver with a wallet, used for the driver app's screens
const DRIVER_PHONE = "8030004412";
/** Keep power charts light: at most this many points per session. */
const MAX_POINTS = 120;

const jar = { console: "", driver: "" };
async function call(who, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", cookie: jar[who] },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) jar[who] = set.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const get = (who, path) => call(who, "GET", path);

await call("console", "POST", "/auth/sign-in", ADMIN);
const sent = await call("driver", "POST", "/app/auth/otp/send", { phone: DRIVER_PHONE });
await call("driver", "POST", "/app/auth/otp/verify", { phone: DRIVER_PHONE, code: sent.devCode });

const snap = { takenAt: new Date().toISOString(), console: {}, chargers: {}, sessions: {}, driver: {} };
const c = snap.console;
for (const [key, path] of Object.entries({
  me: "/console/me",
  onboarding: "/console/onboarding",
  overview: "/console/overview",
  network: "/console/network",
  chargers: "/console/chargers",
  alerts: "/console/alerts",
  sites: "/console/sites",
  tariffs: "/console/tariffs",
  idTokens: "/console/id-tokens",
  ocppSettings: "/console/ocpp-settings",
  nextId: "/console/chargers/next-id",
  sessions: "/console/sessions?range=30d",
  drivers: "/console/drivers",
})) {
  c[key] = await get("console", path);
}

for (const row of c.chargers) {
  const id = row.id;
  snap.chargers[id] = {
    detail: await get("console", `/console/chargers/${id}`),
    messages: (await get("console", `/console/chargers/${id}/messages/search`)).messages,
    check: await get("console", `/console/chargers/${id}/connect-check`),
    configuration: row.connected
      ? await get("console", `/console/chargers/${id}/configuration`).catch(() => null)
      : null,
  };
}

for (const row of c.sessions.rows) {
  const detail = await get("console", `/console/sessions/${row.id}`);
  if (detail.power.length > MAX_POINTS) {
    const step = detail.power.length / MAX_POINTS;
    detail.power = Array.from({ length: MAX_POINTS }, (_, i) => detail.power[Math.floor(i * step)]);
  }
  snap.sessions[row.id] = detail;
}

const d = snap.driver;
d.me = await get("driver", "/app/me");
d.stations = await get("driver", "/app/stations");

writeFileSync(new URL("../lib/demo/snapshot.json", import.meta.url), JSON.stringify(snap));
console.log(
  `Snapshot: ${c.chargers.length} chargers, ${c.sessions.rows.length} sessions, ${d.stations.length} stations`,
);
