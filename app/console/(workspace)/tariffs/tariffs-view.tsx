"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { keys, useMe, useSites, useTariffs } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";
import {
  PREVIEW_CHARGER_KW,
  previewChargingMinutes,
  price,
  type TariffRates,
} from "@/lib/pricing";

type Tariff = Schemas["TariffDto"];

/** The editor works in naira strings, as typed; money becomes kobo only on save and in the preview. */
interface Draft {
  name: string;
  perKwh: string;
  perMinute: string;
  sessionFee: string;
  idleOn: boolean;
  idleGrace: string;
  idlePerMinute: string;
  peakOn: boolean;
  peakFrom: string;
  peakTo: string;
  peakPct: string;
  vatIncluded: boolean;
  siteIds: string[];
  fleetId: string | null;
}

const NEW = "new";
const naira2 = (kobo: number) => String(kobo / 100);

function draftOf(t: Tariff | undefined): Draft {
  return {
    name: t?.name ?? "",
    perKwh: t ? naira2(t.perKwhKobo) : "",
    perMinute: t ? naira2(t.perMinuteKobo) : "0",
    sessionFee: t ? naira2(t.sessionFeeKobo) : "0",
    idleOn: t ? t.idlePerMinuteKobo !== null : true,
    idleGrace: String(t?.idleGraceMin ?? 15),
    idlePerMinute:
      t?.idlePerMinuteKobo != null ? naira2(t.idlePerMinuteKobo) : "50",
    peakOn: t ? t.peakSurchargeBps !== null : false,
    peakFrom: t?.peakFrom ?? "18:00",
    peakTo: t?.peakTo ?? "22:00",
    peakPct:
      t?.peakSurchargeBps != null ? String(t.peakSurchargeBps / 100) : "15",
    vatIncluded: t?.vatIncluded ?? true,
    siteIds: t?.sites.map((s) => s.id) ?? [],
    fleetId: t?.fleet?.id ?? null,
  };
}

const kobo = (naira: string) => Math.round(Number(naira) * 100);
const isMoney = (v: string) =>
  v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;

/** The rates the pricing function and the API take, or a list of what to fix. */
function ratesOf(d: Draft): { rates?: TariffRates; problems: string[] } {
  const problems: string[] = [];
  if (!isMoney(d.perKwh)) problems.push("Enter a price per kWh.");
  if (!isMoney(d.perMinute))
    problems.push("Enter a price per minute (0 for none).");
  if (!isMoney(d.sessionFee))
    problems.push("Enter a session fee (0 for none).");
  if (d.idleOn && (!isMoney(d.idlePerMinute) || !/^\d+$/.test(d.idleGrace)))
    problems.push(
      "Enter the idle grace period in minutes and a price per minute.",
    );
  if (
    d.peakOn &&
    (!/^\d\d:\d\d$/.test(d.peakFrom) || !/^\d\d:\d\d$/.test(d.peakTo))
  )
    problems.push("Enter peak hours like 18:00.");
  if (d.peakOn && !(Number(d.peakPct) >= 0 && Number(d.peakPct) <= 100))
    problems.push("Peak surcharge is a percentage from 0 to 100.");
  if (problems.length) return { problems };
  return {
    problems,
    rates: {
      perKwhKobo: kobo(d.perKwh),
      perMinuteKobo: kobo(d.perMinute),
      sessionFeeKobo: kobo(d.sessionFee),
      idleGraceMin: d.idleOn ? Number(d.idleGrace) : null,
      idlePerMinuteKobo: d.idleOn ? kobo(d.idlePerMinute) : null,
      peakFrom: d.peakOn ? d.peakFrom : null,
      peakTo: d.peakOn ? d.peakTo : null,
      peakSurchargeBps: d.peakOn ? Math.round(Number(d.peakPct) * 100) : null,
      vatIncluded: d.vatIncluded,
      vatBps: 750,
    },
  };
}

export function TariffsView() {
  const { data: tariffs, error } = useTariffs();
  const { data: me } = useMe();
  const canEdit = me?.role === "ADMIN";
  const [selectedId, setSelectedId] = useState<string>();
  const selected =
    selectedId === NEW
      ? undefined
      : (tariffs?.find((t) => t.id === selectedId) ?? tariffs?.[0]);
  const editingId = selectedId === NEW ? NEW : selected?.id;
  // Whether the open editor has unsaved changes, for the confirm when switching tariffs
  const unsaved = useRef({ dirty: false, name: "" });

  const select = (id: string) => {
    if (id === editingId) return;
    const { dirty, name } = unsaved.current;
    if (dirty && !window.confirm(`Discard unsaved changes to ${name}?`)) return;
    setSelectedId(id);
  };

  return (
    <>
      <PageHeader
        title="Tariffs"
        subtitle="What drivers pay, per site. Changes apply to sessions that start after you save."
        actions={
          canEdit && (
            <Button onClick={() => select(NEW)} disabled={editingId === NEW}>
              New tariff
            </Button>
          )
        }
      />
      {error && (
        <p role="alert" className="text-[14px] text-error">
          {errorMessage(error)}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Tariffs">
          <ul className="flex flex-col gap-2">
            {!tariffs &&
              [0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton className="h-16 w-full" />
                </li>
              ))}
            {tariffs?.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => select(t.id)}
                  aria-current={t.id === editingId ? "true" : undefined}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left",
                    t.id === editingId
                      ? "border-ink bg-subtle"
                      : "border-line hover:bg-subtle",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{t.name}</span>
                    <span className="tabular text-[13.5px]">
                      {naira(t.perKwhKobo)}/kWh
                    </span>
                  </span>
                  <span className="block truncate text-[13px] text-ink-3">
                    {t.fleet ? `${t.fleet.name} only · ` : ""}
                    {t.sites.map((s) => s.name).join(", ") || "No sites yet"}
                  </span>
                </button>
              </li>
            ))}
            {tariffs?.length === 0 && editingId !== NEW && (
              <li className="text-[14px] text-ink-3">
                No tariffs yet. Drivers can’t pay until a tariff covers their
                site.
              </li>
            )}
          </ul>
        </nav>

        {tariffs && (editingId === NEW || selected) && (
          <Editor
            key={editingId}
            tariff={selected && editingId !== NEW ? selected : undefined}
            canEdit={canEdit}
            onUnsaved={(state) => {
              unsaved.current = state;
            }}
            onSaved={(saved) => setSelectedId(saved.id)}
            onDiscardNew={() => setSelectedId(undefined)}
          />
        )}
      </div>
    </>
  );
}

function Editor({
  tariff,
  canEdit,
  onUnsaved,
  onSaved,
  onDiscardNew,
}: {
  tariff: Tariff | undefined;
  canEdit: boolean;
  onUnsaved: (state: { dirty: boolean; name: string }) => void;
  onSaved: (t: Tariff) => void;
  onDiscardNew: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: sites } = useSites();
  const [saved, setSaved] = useState(() => draftOf(tariff));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || !tariff;
  useEffect(() => {
    onUnsaved({
      dirty: dirty && canEdit,
      name: tariff?.name ?? "the new tariff",
    });
  });
  const { rates } = ratesOf(draft);

  const save = async () => {
    const result = ratesOf(draft);
    const missing = [
      ...(draft.name.trim().length < 2 ? ["Give the tariff a name."] : []),
      ...result.problems,
    ];
    setProblems(missing);
    if (!result.rates || missing.length) return;
    const body = {
      name: draft.name.trim(),
      siteIds: draft.siteIds,
      fleetId: draft.fleetId,
      ...result.rates,
    };
    setSaving(true);
    const { data, error } = tariff
      ? await api.PUT("/v1/console/tariffs/{id}", {
          params: { path: { id: tariff.id } },
          body,
        })
      : await api.POST("/v1/console/tariffs", { body });
    setSaving(false);
    if (error || !data) {
      toast.error("Tariff not saved", { description: errorMessage(error) });
      return;
    }
    if (tariff && data.version > tariff.version) {
      toast.success(`Saved ${data.name} as version ${data.version}`, {
        description: `Sessions already billed keep version ${tariff.version}; new sessions use these prices.`,
      });
    } else {
      toast.success(`${data.name} saved`);
    }
    const next = draftOf(data);
    setSaved(next);
    setDraft(next);
    await queryClient.invalidateQueries({ queryKey: keys.tariffs });
    onSaved(data);
  };

  const discard = () => {
    setProblems([]);
    if (!tariff) return onDiscardNew();
    setDraft(saved);
  };

  const unusedSites = sites?.filter((s) => !draft.siteIds.includes(s.id)) ?? [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-24 xl:grid-cols-[minmax(0,1fr)_340px]">
      <fieldset
        disabled={!canEdit}
        className="flex flex-col gap-6 rounded-xl border border-line p-5"
      >
        <legend className="sr-only">
          {tariff ? `Edit ${tariff.name}` : "New tariff"}
        </legend>
        {!canEdit && (
          <p className="rounded-lg bg-subtle px-3 py-2 text-[13.5px] text-ink-2">
            Only admins can change tariffs. You can view them and try the price
            preview.
          </p>
        )}
        <Input
          label="Name"
          value={draft.name}
          onChange={(v) => set("name", v)}
          placeholder="Standard DC"
        />
        {tariff && (
          <p className="-mt-4 text-[12.5px] text-ink-3">
            Version {tariff.version} · priced{" "}
            {tariff.sessionCount.toLocaleString("en-NG")}{" "}
            {tariff.sessionCount === 1 ? "session" : "sessions"}
            {tariff.sessionCount > 0 &&
              ". Changing prices saves a new version; those sessions keep this one."}
          </p>
        )}

        <Group title="Charges">
          <div className="grid items-end gap-4 sm:grid-cols-3">
            <Input
              label="Per kWh"
              prefix="₦"
              value={draft.perKwh}
              onChange={(v) => set("perKwh", v)}
              numeric
            />
            <Input
              label="Per minute charging"
              prefix="₦"
              value={draft.perMinute}
              onChange={(v) => set("perMinute", v)}
              numeric
            />
            <Input
              label="Session fee"
              prefix="₦"
              value={draft.sessionFee}
              onChange={(v) => set("sessionFee", v)}
              numeric
            />
          </div>
        </Group>

        <Group>
          <Switch
            label="Idle fee"
            hint="Charged when a car stays plugged in after charging stops, so the bay frees up."
            checked={draft.idleOn}
            onChange={(v) => set("idleOn", v)}
            disabled={!canEdit}
          />
          {draft.idleOn && (
            <div className="mt-3 grid items-end gap-4 sm:grid-cols-2">
              <Input
                label="Grace period"
                suffix="min"
                value={draft.idleGrace}
                onChange={(v) => set("idleGrace", v)}
                numeric
              />
              <Input
                label="Then per minute"
                prefix="₦"
                value={draft.idlePerMinute}
                onChange={(v) => set("idlePerMinute", v)}
                numeric
              />
            </div>
          )}
        </Group>

        <Group>
          <Switch
            label="Peak hours surcharge"
            hint="Raise the kWh price when the site is busiest or on generator power."
            checked={draft.peakOn}
            onChange={(v) => set("peakOn", v)}
            disabled={!canEdit}
          />
          {draft.peakOn && (
            <div className="mt-3 grid items-end gap-4 sm:grid-cols-3">
              <Input
                label="From"
                placeholder="18:00"
                value={draft.peakFrom}
                onChange={(v) => set("peakFrom", v)}
              />
              <Input
                label="To"
                placeholder="22:00"
                value={draft.peakTo}
                onChange={(v) => set("peakTo", v)}
              />
              <Input
                label="Surcharge"
                suffix="%"
                value={draft.peakPct}
                onChange={(v) => set("peakPct", v)}
                numeric
              />
            </div>
          )}
        </Group>

        <Group>
          <Switch
            label="Prices include VAT (7.5%)"
            hint="Receipts show the VAT portion either way."
            checked={draft.vatIncluded}
            onChange={(v) => set("vatIncluded", v)}
            disabled={!canEdit}
          />
        </Group>

        <Group title="Used at">
          <ul className="flex flex-wrap gap-2">
            {draft.siteIds.map((id) => (
              <li
                key={id}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-line-strong pr-1 pl-3 text-[13.5px]"
              >
                {sites?.find((s) => s.id === id)?.name ?? "…"}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "siteIds",
                        draft.siteIds.filter((s) => s !== id),
                      )
                    }
                    aria-label={`Remove ${sites?.find((s) => s.id === id)?.name ?? "site"}`}
                    className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-subtle hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {canEdit && unusedSites.length > 0 && (
              <li>
                <label className="sr-only" htmlFor="add-site">
                  Add site
                </label>
                <select
                  id="add-site"
                  value=""
                  onChange={(e) =>
                    e.target.value &&
                    set("siteIds", [...draft.siteIds, e.target.value])
                  }
                  className="h-8 rounded-full border border-dashed border-line-strong bg-white px-3 text-[13.5px]"
                >
                  <option value="">+ Add site</option>
                  {unusedSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </li>
            )}
          </ul>
          {draft.siteIds.length === 0 && (
            <p className="mt-2 text-[13px] text-ink-3">
              Not used anywhere yet: add a site so drivers there pay this
              tariff.
            </p>
          )}
        </Group>

        {problems.length > 0 && (
          <ul role="alert" className="list-disc pl-5 text-[14px] text-error">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </fieldset>

      <Preview rates={rates} peakFrom={draft.peakOn ? draft.peakFrom : null} />

      <SaveBar
        open={dirty && canEdit}
        name={tariff ? tariff.name : "the new tariff"}
        saving={saving}
        onDiscard={discard}
        onSave={() => void save()}
      />
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-5">
      {title && <h3 className="mb-3 text-[14.5px] font-medium">{title}</h3>}
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  prefix,
  suffix,
  numeric,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  numeric?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <span className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={numeric ? "decimal" : undefined}
          placeholder={placeholder}
          className={cn(
            "tabular h-10 w-full rounded-control border border-line-strong bg-white text-ink outline-none focus:border-ink-3 disabled:bg-subtle disabled:text-ink-2",
            prefix ? "pl-7" : "pl-3",
            suffix ? "pr-12" : "pr-3",
            !numeric && type === "text" && "font-sans",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13.5px] text-ink-3">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

/** "What a driver pays": the same pricing function as billing, recalculated as you drag. */
function Preview({
  rates,
  peakFrom,
}: {
  rates: TariffRates | undefined;
  peakFrom: string | null;
}) {
  const [energy, setEnergy] = useState(30);
  const [plugged, setPlugged] = useState(60);
  const [atPeak, setAtPeak] = useState(true);
  const charging = Math.min(previewChargingMinutes(energy), plugged);
  const b = rates
    ? price(rates, {
        energyWh: energy * 1000,
        chargingMinutes: charging,
        pluggedMinutes: plugged,
        atPeak: atPeak && peakFrom !== null,
      })
    : undefined;

  const lines: [string, number][] = b
    ? [
        [`Energy · ${energy} kWh`, b.energyKobo],
        ...(peakFrom !== null
          ? [["Peak surcharge", b.peakKobo] as [string, number]]
          : []),
        [`Time · ${charging} min`, b.timeKobo],
        ["Session fee", b.sessionFeeKobo],
        [`Idle · ${b.idleMinutes} min after grace`, b.idleKobo],
      ]
    : [];

  return (
    <aside
      aria-labelledby="preview-heading"
      className="h-fit rounded-xl border border-line p-5 xl:sticky xl:top-6"
    >
      <h2 id="preview-heading" className="text-[16px] font-semibold">
        What a driver pays
      </h2>
      <p className="text-[13px] text-ink-3">Drag to try a session.</p>

      <Slider
        label="Energy"
        unit="kWh"
        min={2}
        max={80}
        value={energy}
        onChange={setEnergy}
      />
      <Slider
        label="Time plugged in"
        unit="min"
        min={10}
        max={240}
        step={5}
        value={plugged}
        onChange={setPlugged}
      />
      <p className="mt-2 text-[12.5px] text-ink-3">
        {previewChargingMinutes(energy) > plugged
          ? `${energy} kWh needs ${previewChargingMinutes(energy)} min at ${PREVIEW_CHARGER_KW} kW, longer than it is plugged in.`
          : `Charging takes ${charging} min at ${PREVIEW_CHARGER_KW} kW; the rest is idle.`}
      </p>
      {peakFrom !== null && (
        <label className="mt-3 flex items-center gap-2 text-[13.5px]">
          <input
            type="checkbox"
            checked={atPeak}
            onChange={(e) => setAtPeak(e.target.checked)}
          />
          Starts in peak hours (from {peakFrom})
        </label>
      )}

      {b ? (
        <dl className="mt-4 divide-y divide-line text-[14px]">
          {lines.map(([label, k]) => (
            <div key={label} className="flex justify-between gap-3 py-1.5">
              <dt className="text-ink-2">{label}</dt>
              <dd className="tabular">{naira(k)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-1.5 text-ink-3">
            <dt>VAT 7.5% {b.vatIncluded ? "included" : "added"}</dt>
            <dd className="tabular">{naira(b.vatKobo)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 pt-2.5">
            <dt className="font-semibold">Total</dt>
            <dd className="nums text-[22px] font-semibold">
              {naira(b.totalKobo)}
            </dd>
          </div>
          {b.effectivePerKwhKobo !== null && (
            <p className="pt-1 text-right text-[12.5px] text-ink-3">
              {naira(b.effectivePerKwhKobo)} per kWh overall
            </p>
          )}
        </dl>
      ) : (
        <p className="mt-4 text-[13.5px] text-ink-3">
          Fill in the charges to see the price.
        </p>
      )}
    </aside>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between text-[13.5px]">
        <span className="font-medium">{label}</span>
        <span className="tabular text-ink-2">
          {value} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-ink"
      />
    </label>
  );
}

/** Slides up (300 ms) only while the draft differs from what is saved; back down in 220 ms. */
function SaveBar({
  open,
  name,
  saving,
  onDiscard,
  onSave,
}: {
  open: boolean;
  name: string;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 md:left-[232px]"
      style={{
        transform: open ? "translateY(0)" : "translateY(calc(100% + 16px))",
        transition: `transform ${open ? 300 : 220}ms var(--ease-out)`,
      }}
    >
      <div className="flex w-full max-w-2xl items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-[0_8px_32px_rgb(0_0_0/0.2)]">
        <p className="text-[14px]">Unsaved changes to {name}</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={onDiscard}
          >
            Discard
          </Button>
          <Button
            variant="secondary"
            className="border-white"
            loading={saving}
            onClick={onSave}
          >
            Save tariff
          </Button>
        </div>
      </div>
    </div>
  );
}
