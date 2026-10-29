"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { keys, useMe, useOcppSettings, useSites } from "@/lib/api/queries";

type Site = Schemas["SiteDto"];
type Ocpp = Schemas["OcppSettingsDto"];

export function SettingsView() {
  const { data: me } = useMe();
  const role = me?.role;
  return (
    <>
      <PageHeader title="Settings" />
      <nav
        aria-label="Settings sections"
        className="mb-6 flex flex-wrap gap-4 text-[14px]"
      >
        <a
          href="#sites"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          Sites
        </a>
        <a
          href="#ocpp"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          OCPP
        </a>
        <span className="text-ink-3">
          General, Team and roles, Notifications, API and webhooks: coming next
        </span>
      </nav>
      <div className="flex max-w-3xl flex-col gap-10">
        <SitesSection canEdit={role === "ADMIN" || role === "OPERATOR"} />
        <OcppSection canEdit={role === "ADMIN"} />
      </div>
    </>
  );
}

// ─── Sites ───────────────────────────────────────────────────────────────────

interface SiteDraft {
  name: string;
  area: string;
  address: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  gridLimitKw: string;
}

const draftOf = (s?: Site): SiteDraft => ({
  name: s?.name ?? "",
  area: s?.area ?? "",
  address: s?.address ?? "",
  latitude: s?.latitude?.toString() ?? "",
  longitude: s?.longitude?.toString() ?? "",
  openingHours: s?.openingHours ?? "Open 24 hours",
  gridLimitKw: s?.gridLimitKw?.toString() ?? "",
});

function SitesSection({ canEdit }: { canEdit: boolean }) {
  const { data: sites, error } = useSites();
  const [editing, setEditing] = useState<string | "new">();

  return (
    <section id="sites" aria-labelledby="sites-heading" className="scroll-mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="sites-heading" className="text-[18px] font-semibold">
            Sites
          </h2>
          <p className="text-[13.5px] text-ink-3">
            Where your chargers are. The map position puts a site on the
            Overview map.
          </p>
        </div>
        {canEdit && editing !== "new" && (
          <Button variant="secondary" onClick={() => setEditing("new")}>
            Add site
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[14px] text-error">
          {errorMessage(error)}
        </p>
      )}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {editing === "new" && (
          <li className="p-4">
            <SiteForm onDone={() => setEditing(undefined)} />
          </li>
        )}
        {!sites &&
          [0, 1, 2].map((i) => (
            <li key={i} className="p-4">
              <Skeleton className="h-5 w-full" />
            </li>
          ))}
        {sites?.map((site) =>
          editing === site.id ? (
            <li key={site.id} className="p-4">
              <SiteForm site={site} onDone={() => setEditing(undefined)} />
            </li>
          ) : (
            <li
              key={site.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 text-[14px]">
                <p className="font-medium">{site.name}</p>
                <p className="text-[13px] text-ink-3">
                  {[site.area, site.address].filter(Boolean).join(" · ") ||
                    "No address yet"}
                </p>
                <p className="text-[13px] text-ink-3">
                  {site.chargerCount}{" "}
                  {site.chargerCount === 1 ? "charger" : "chargers"} ·{" "}
                  {site.openingHours}
                  {site.gridLimitKw !== null &&
                    ` · grid limit ${site.gridLimitKw} kW`}
                  {site.latitude === null && " · not on the map yet"}
                </p>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  className="h-8 px-2.5 text-[13px]"
                  onClick={() => setEditing(site.id)}
                >
                  Edit
                </Button>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function SiteForm({ site, onDone }: { site?: Site; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [d, setD] = useState(() => draftOf(site));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string>();
  const set =
    (k: keyof SiteDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setD((prev) => ({ ...prev, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const body = {
      name: d.name.trim(),
      area: d.area.trim() || null,
      address: d.address.trim() || null,
      latitude: num(d.latitude),
      longitude: num(d.longitude),
      openingHours: d.openingHours.trim() || "Open 24 hours",
      gridLimitKw: num(d.gridLimitKw),
    };
    if (body.name.length < 2) return setProblem("Give the site a name.");
    if ((body.latitude === null) !== (body.longitude === null))
      return setProblem("Enter both latitude and longitude, or neither.");
    if (
      [body.latitude, body.longitude, body.gridLimitKw].some(
        (n) => n !== null && Number.isNaN(n),
      )
    )
      return setProblem("Latitude, longitude and grid limit are numbers.");
    setProblem(undefined);
    setSaving(true);
    const { error } = site
      ? await api.PATCH("/v1/console/sites/{id}", {
          params: { path: { id: site.id } },
          body,
        })
      : await api.POST("/v1/console/sites", { body });
    setSaving(false);
    if (error) return setProblem(errorMessage(error));
    toast.success(site ? `${body.name} saved` : `${body.name} added`);
    await queryClient.invalidateQueries({ queryKey: keys.sites });
    onDone();
  };

  return (
    <form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-2">
      <Text
        label="Name"
        value={d.name}
        onChange={set("name")}
        placeholder="Ikeja City Mall"
      />
      <Text
        label="Area"
        value={d.area}
        onChange={set("area")}
        placeholder="Ikeja, Lagos"
      />
      <Text
        label="Address"
        value={d.address}
        onChange={set("address")}
        className="sm:col-span-2"
      />
      <Text
        label="Latitude"
        value={d.latitude}
        onChange={set("latitude")}
        placeholder="6.6142"
        numeric
      />
      <Text
        label="Longitude"
        value={d.longitude}
        onChange={set("longitude")}
        placeholder="3.3576"
        numeric
      />
      <Text
        label="Opening hours"
        value={d.openingHours}
        onChange={set("openingHours")}
      />
      <Text
        label="Grid limit (kW)"
        value={d.gridLimitKw}
        onChange={set("gridLimitKw")}
        placeholder="Optional"
        numeric
      />
      {problem && (
        <p role="alert" className="text-[14px] text-error sm:col-span-2">
          {problem}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={saving}>
          {site ? "Save site" : "Add site"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Text({
  label,
  className,
  numeric,
  ...input
}: {
  label: string;
  className?: string;
  numeric?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <input
        inputMode={numeric ? "decimal" : undefined}
        className="h-10 rounded-control border border-line-strong bg-white px-3 outline-none focus:border-ink-3"
        {...input}
      />
    </label>
  );
}

// ─── OCPP ────────────────────────────────────────────────────────────────────

function OcppSection({ canEdit }: { canEdit: boolean }) {
  const { data, error } = useOcppSettings();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<string>();

  /** Each change saves at once and shows a brief "Saved", as in the design. */
  const save = async (patch: Partial<Ocpp>, field: string) => {
    const { data: next, error: apiError } = await api.PATCH(
      "/v1/console/ocpp-settings",
      {
        body: patch,
      },
    );
    if (apiError || !next)
      return toast.error("Not saved", { description: errorMessage(apiError) });
    queryClient.setQueryData(["console", "ocpp-settings"], next);
    setSaved(field);
    setTimeout(() => setSaved((f) => (f === field ? undefined : f)), 1600);
  };

  return (
    <section id="ocpp" aria-labelledby="ocpp-heading" className="scroll-mt-6">
      <h2 id="ocpp-heading" className="text-[18px] font-semibold">
        OCPP
      </h2>
      {!canEdit && (
        <p className="text-[13.5px] text-ink-3">
          Only admins can change these.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-error">
          {errorMessage(error)}
        </p>
      )}
      {!data ? (
        <Skeleton className="mt-3 h-64 w-full" />
      ) : (
        <div className="mt-3 flex flex-col gap-5 rounded-xl border border-line p-5">
          <div>
            <p className="text-[13px] font-medium text-ink-2">
              Charger endpoint
            </p>
            <p className="font-mono text-[14px] break-all">{data.endpoint}</p>
          </div>
          {(
            [
              [
                "accept16J",
                "Accept OCPP 1.6J",
                "For older and lower-cost chargers.",
              ],
              [
                "accept201",
                "Accept OCPP 2.0.1",
                "Recommended for new hardware.",
              ],
              [
                "autoApproveChargers",
                "Auto-approve new chargers",
                "Off: new chargers wait as Pending until approved.",
              ],
              [
                "syncLocalLists",
                "Sync local authorization lists",
                "Lets RFID cards work while a charger is offline. Sent each time a charger connects.",
              ],
            ] as const
          ).map(([field, label, hint]) => (
            <div key={field} className="flex items-start gap-3">
              <div className="flex-1">
                <Switch
                  label={label}
                  hint={hint}
                  checked={data[field]}
                  disabled={!canEdit}
                  onChange={(v) => void save({ [field]: v }, field)}
                />
              </div>
              <Saved show={saved === field} />
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 opacity-60">
            <span>
              <span className="block text-[14.5px] font-medium">
                Accept OCPP 2.1 (beta)
              </span>
              <span className="block text-[13px] text-ink-3">
                Payment terminals and dynamic QR codes. The gateway doesn’t
                speak 2.1 yet.
              </span>
            </span>
            <span className="text-[13px] text-ink-3">Not available</span>
          </div>
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
            {(
              [
                [
                  "heartbeatIntervalSec",
                  "Heartbeat interval",
                  "s",
                  "Sent at the next BootNotification.",
                ],
                [
                  "meterValuesSampleSec",
                  "Meter values every",
                  "s",
                  "Longer saves SIM data. Pushed to connected chargers.",
                ],
                ["offlineAlertAfterMin", "Offline alert after", "min", ""],
              ] as const
            ).map(([field, label, unit, hint]) => (
              <NumberSetting
                key={field}
                label={label}
                unit={unit}
                hint={hint}
                value={data[field]}
                disabled={!canEdit}
                saved={saved === field}
                onSave={(v) => save({ [field]: v }, field)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function NumberSetting({
  label,
  unit,
  hint,
  value,
  disabled,
  saved,
  onSave,
}: {
  label: string;
  unit: string;
  hint: string;
  value: number;
  disabled: boolean;
  saved: boolean;
  onSave: (v: number) => Promise<unknown>;
}) {
  const [text, setText] = useState(String(value));
  const commit = () => {
    const n = Number(text);
    if (text.trim() === "" || !Number.isInteger(n))
      return setText(String(value));
    if (n !== value) void onSave(n);
  };
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[13px] font-medium text-ink-2">
        {label}
        <Saved show={saved} />
      </span>
      <span className="relative">
        <input
          value={text}
          disabled={disabled}
          inputMode="numeric"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="tabular h-10 w-full rounded-control border border-line-strong bg-white pr-10 pl-3 outline-none focus:border-ink-3 disabled:bg-subtle"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13.5px] text-ink-3">
          {unit}
        </span>
      </span>
      {hint && <span className="text-[12.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

function Saved({ show }: { show: boolean }) {
  return (
    <span
      aria-live="polite"
      className="text-[12.5px] font-medium text-volt-ink transition-opacity duration-200"
      style={{ opacity: show ? 1 : 0 }}
    >
      {show ? "Saved" : ""}
    </span>
  );
}
