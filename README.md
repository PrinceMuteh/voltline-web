# voltline-web

Every screen of the Voltline Charging Platform (Flex Mobility Limited): marketing site, operator console (`/console`) and driver app (`/app`).

Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · TanStack Query · typed client generated from the API's OpenAPI spec. The backend lives in [`../voltline-api`](../voltline-api).

> Next.js 16 differs from older versions (for example `middleware.ts` is now `proxy.ts`). Read `AGENTS.md` and the guides in `node_modules/next/dist/docs/` before changing framework-level code.

## Run it

Start voltline-api first (see its README), then:

```bash
cp .env.example .env.local    # API_URL and NEXT_PUBLIC_REALTIME_URL, both http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

To see chargers live, also run `npm run sim:fleet` in voltline-api. Open http://localhost:3000/console and sign in with the seeded demo account `admin@voltline.local` / `voltline-demo-123`, or create a new workspace.

## How it talks to the API

The browser only calls this origin. `next.config.ts` rewrites `/api/*` to `API_URL`, so the API's httpOnly auth cookies are first-party and there is no CORS. `lib/api/client.ts` wraps every call: on a 401 it refreshes the session once (shared by all waiting requests) and retries; if that fails, it sends the user to sign-in.

Live updates come over Socket.IO straight from the API (`NEXT_PUBLIC_REALTIME_URL`). `lib/realtime.tsx` fetches a 60-second ticket for each (re)connect and turns events into TanStack Query cache updates or refetches, so screens stay ordinary query consumers.

`proxy.ts` only does an optimistic check for the refresh cookie on `/console/*`. The API is what enforces access.

After the API changes, regenerate the types (the API must be running):

```bash
npm run gen:api               # writes lib/api/schema.d.ts
```

## Layout

```
app/
  page.tsx                   temporary landing (marketing site arrives in phase 6)
  console/sign-in/           sign in / create account
  console/(workspace)/       console shell (sidebar) + Overview (tiles, energy chart, chargers, drawer),
                             Add a charger wizard (chargers/new), Alerts, Sessions (drawer, CSV), Tariffs
  console/receipts/[id]      printable session receipt (print or save as PDF)
  console/(workspace)/chargers/[id]/log   searchable OCPP log for one charger
  console/(workspace)/settings            Sites and OCPP settings
  app/                       the driver app (phone-width): welcome/ onboarding, (tabs)/ map,
                             sessions, wallet, account; charging/ live session; receipt/[id];
                             scan/ QR or charger ID. /app/c/{chargePointId} is a charger's QR link.
  legal/                     Terms of Use, Privacy Policy (placeholders)
components/ui/               Button, StatusPill, SegmentedControl, HoldToConfirm, Drawer, Skeleton, Field, Spinner
components/console/          PageHeader, ChargerDrawer, phase placeholders
lib/api/                     client, generated schema, TanStack Query hooks
lib/realtime.tsx             Socket.IO bridge into the query cache
lib/pricing.ts               copy of voltline-api's pricing function, for the instant tariff preview.
                             Don't edit it here: change src/billing/pricing.ts there and run npm run sync:pricing
app/globals.css              design tokens from the Flex Mobility design system
```

## Driver app

Open http://localhost:3000/app (or 3001 if 3000 is taken) and sign in with any Nigerian mobile number. No SMS provider is wired yet, so outside production the 6-digit code is shown on screen. Drivers have their own `vl_driver` cookie; console and driver sign-ins never open each other's pages. Payments are not taken yet: sessions are priced and billed to the driver's account, and the wallet shows its balance without top-ups.

## Demo without a backend (Vercel)

With `NEXT_PUBLIC_DEMO_MODE=true` the app needs no API. It answers its own `/api` calls in the browser from `lib/demo/snapshot.json`, a snapshot of a real voltline-api with the demo fleet running; dates are shifted so "today" stays today. A banner says it is a demo.

- Console: sign in as `admin@voltline.local` / `voltline-demo-123` (also `bola@`, `grace@`, `support@` for the other roles). Creating accounts is turned off.
- Driver app: any Nigerian mobile number; the code is `123456`.
- Commands, reservations, settings, tariff and site edits respond realistically but reset on reload. Charging sessions started in the driver app are kept in the browser's localStorage, so the console in another tab lists them.
- Not live: no OCPP, no live socket (screens refresh every 5 s instead), no payments.

To deploy: import this repository in Vercel, add the environment variable `NEXT_PUBLIC_DEMO_MODE` = `true`, and deploy. No other settings are needed.

To refresh the sample data, run the API and `npm run sim:fleet`, then `npm run demo:snapshot` here.

## Design rules worth keeping

- Colours, fonts and motion curves come from the tokens in `app/globals.css`; don't hard-code new ones.
- Sidebar, filters, tab switches and live numbers never animate. Overlays do, within the durations in the design system.
- Status pills always pair a colour with a word.
- Inputs validate on blur and clear the error as you type; errors are in words.
