"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { keys, useCharger, useConnectCheck, useSites } from "@/lib/api/queries";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";

type Charger = Schemas["ChargerDetailDto"];
type ConnectorType = Schemas["ConnectorInputDto"]["type"];
type Connector = { type: ConnectorType; maxKw: string };

const STEPS = ["Details", "Credentials", "Connect", "Go live"] as const;
const NEW_SITE = "__new";
const connectorTypes: { value: ConnectorType; label: string }[] = [
  { value: "CCS2", label: "CCS2" },
  { value: "TYPE2", label: "Type 2" },
  { value: "CHADEMO", label: "CHAdeMO" },
];

/**
 * Four steps. The charger is created when Details is submitted (as Pending), so the
 * credentials and the live checklist refer to a real record; ?charger=<id> resumes it.
 */
export function AddChargerWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const resumeId = searchParams.get("charger") ?? undefined;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back" | null>(null);
  const [chargerId, setChargerId] = useState<string | undefined>(resumeId);
  const [password, setPassword] = useState<string>();
  const [live, setLive] = useState(false);
  const { data: charger, error: loadError } = useCharger(chargerId);

  // Resuming a charger that was created earlier: its password is gone, so start at Connect.
  // Adjusted during render (once per charger) rather than in an effect.
  const [resumedFor, setResumedFor] = useState<string>();
  if (resumeId && charger?.id === resumeId && resumedFor !== resumeId) {
    setResumedFor(resumeId);
    if (charger.approval === "ACCEPTED") setLive(true);
    else setStep(2);
  }

  const go = (next: number) => {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  };

  const onCreated = (created: Charger, newPassword?: string) => {
    queryClient.setQueryData(keys.charger(created.id), created);
    void queryClient.invalidateQueries({ queryKey: keys.chargers });
    void queryClient.invalidateQueries({ queryKey: ["console", "onboarding"] });
    if (newPassword) setPassword(newPassword);
    // Just created here, not resumed: stay on the flow (next step is Credentials)
    setResumedFor(created.id);
    setChargerId(created.id);
    router.replace(`/console/chargers/new?charger=${created.id}`, {
      scroll: false,
    });
    go(1);
  };

  const restart = () => {
    setChargerId(undefined);
    setPassword(undefined);
    setLive(false);
    setDirection(null);
    setStep(0);
    router.replace("/console/chargers/new");
  };

  if (resumeId && !charger) {
    return loadError ? (
      <p role="alert" className="text-[14px] text-error">
        {errorMessage(loadError)}
      </p>
    ) : (
      <Skeleton className="h-80 w-full max-w-2xl" />
    );
  }

  if (live && charger) {
    return <LiveSuccess charger={charger} onAddAnother={restart} />;
  }

  return (
    <div className="max-w-2xl">
      <StepDots step={step} />
      <div
        key={step}
        className={cn(
          "mt-8",
          direction === "forward" && "animate-step-forward",
          direction === "back" && "animate-step-back",
        )}
      >
        {step === 0 && <DetailsStep charger={charger} onDone={onCreated} />}
        {step === 1 && charger && (
          <CredentialsStep
            charger={charger}
            password={password}
            onPassword={setPassword}
            onBack={() => go(0)}
            onNext={() => go(2)}
          />
        )}
        {step === 2 && charger && (
          <ConnectStep
            charger={charger}
            onBack={() => go(1)}
            onNext={() => go(3)}
          />
        )}
        {step === 3 && charger && (
          <GoLiveStep
            charger={charger}
            onBack={() => go(2)}
            onLive={(approved) => {
              queryClient.setQueryData(keys.charger(approved.id), approved);
              void queryClient.invalidateQueries({ queryKey: keys.chargers });
              setLive(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Dots with labels; the line under them fills with a transform (300 ms ease-in-out). */
function StepDots({ step }: { step: number }) {
  return (
    <div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className="flex items-center gap-2 text-[13px]"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-medium",
                i < step && "bg-volt text-white",
                i === step && "bg-ink text-white",
                i > step && "border border-line-strong text-ink-3",
              )}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={i === step ? "font-medium text-ink" : "text-ink-3"}
            >
              {label}
              <span className="sr-only">
                {i < step ? " (done)" : i === step ? " (current)" : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <div
        aria-hidden
        className="mt-3 h-0.5 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full origin-left bg-ink transition-transform duration-300 ease-in-out"
          style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }}
        />
      </div>
    </div>
  );
}

function StepHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="text-[14.5px] text-ink-3">{lead}</p>
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex justify-between gap-3">{children}</div>;
}

// ─── Step 1 · Details ────────────────────────────────────────────────────────

function DetailsStep({
  charger,
  onDone,
}: {
  charger: Charger | undefined;
  onDone: (charger: Charger, password?: string) => void;
}) {
  const { data: sites } = useSites();
  const [chargePointId, setChargePointId] = useState(
    charger?.chargePointId ?? "",
  );
  const [siteId, setSiteId] = useState(charger?.siteId ?? "");
  const [newSiteName, setNewSiteName] = useState("");
  const [vendor, setVendor] = useState(charger?.vendor ?? "");
  const [model, setModel] = useState(charger?.model ?? "");
  const [connectors, setConnectors] = useState<Connector[]>(
    charger?.evses.map((e) => ({
      type: e.connectors[0]?.type ?? "CCS2",
      maxKw: String((e.connectors[0]?.maxPowerW ?? 60_000) / 1000),
    })) ?? [{ type: "CCS2", maxKw: "60" }],
  );
  const [error, setError] = useState<string>();
  const [idError, setIdError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Suggest the next free ID (CP-0045 after CP-0044) for a new charger
  useEffect(() => {
    if (charger) return;
    void api.GET("/v1/console/chargers/next-id").then(({ data }) => {
      if (data) setChargePointId((current) => current || data.chargePointId);
    });
  }, [charger]);

  // Until a site is picked: the first one, or "New site…" in a workspace without sites
  const site = siteId || (sites?.[0]?.id ?? (sites ? NEW_SITE : ""));

  const updateConnector = (i: number, patch: Partial<Connector>) =>
    setConnectors((list) =>
      list.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIdError(undefined);
    if (!/^[A-Za-z0-9._-]{1,48}$/.test(chargePointId)) {
      setIdError(
        "Use letters, numbers, dots, dashes or underscores, up to 48 characters.",
      );
      return;
    }
    if (site === NEW_SITE && newSiteName.trim().length < 2) {
      setError("Enter a name for the new site.");
      return;
    }
    const body = {
      ...(site === NEW_SITE
        ? { newSiteName: newSiteName.trim() }
        : { siteId: site }),
      vendor: vendor.trim() || undefined,
      model: model.trim() || undefined,
      connectors: connectors.map((c) => ({
        type: c.type,
        maxKw: Number(c.maxKw),
      })),
    };
    setSaving(true);
    try {
      if (charger) {
        const { data, error: apiError } = await api.PATCH(
          "/v1/console/chargers/{id}",
          {
            params: { path: { id: charger.id } },
            body,
          },
        );
        if (apiError) return setError(errorMessage(apiError));
        onDone(data);
      } else {
        const res = await api.POST("/v1/console/chargers", {
          body: { chargePointId, ...body },
        });
        if (!res.data) {
          const message = errorMessage(res.error);
          return res.response.status === 409
            ? setIdError(message)
            : setError(message);
        }
        const data = res.data;
        onDone(data.charger, data.password);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading
        title="Charger details"
        lead="Match the identity you will configure in the charger."
      />
      <div className="flex flex-col gap-5">
        <div>
          <Field
            label="Charge point ID"
            value={chargePointId}
            onChange={(e) => setChargePointId(e.target.value.trim())}
            disabled={Boolean(charger)}
            hint={
              charger
                ? "The ID can’t change once the charger is registered."
                : "Becomes the last part of its OCPP URL."
            }
            autoComplete="off"
            spellCheck={false}
            required
          />
          {idError && (
            <p role="alert" className="mt-1.5 text-[12.5px] text-error">
              {idError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="site" className="text-[13px] font-medium text-ink-2">
            Site
          </label>
          <select
            id="site"
            value={site}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-10 rounded-control border border-line-strong bg-white px-3 outline-none focus:border-ink-3"
          >
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_SITE}>New site…</option>
          </select>
          {site === NEW_SITE && (
            <Field
              label="New site name"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder="Ikeja City Mall"
              className="mt-2"
            />
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            maxLength={50}
          />
          <Field
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="DC60"
            maxLength={20}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
            Connectors
          </legend>
          <ul className="flex flex-col gap-2">
            {connectors.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[13.5px] text-ink-3">
                  EVSE {i + 1}
                </span>
                <label className="sr-only" htmlFor={`type-${i}`}>
                  EVSE {i + 1} connector type
                </label>
                <select
                  id={`type-${i}`}
                  value={c.type}
                  onChange={(e) =>
                    updateConnector(i, {
                      type: e.target.value as ConnectorType,
                    })
                  }
                  className="h-10 flex-1 rounded-control border border-line-strong bg-white px-3 outline-none focus:border-ink-3"
                >
                  {connectorTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={`kw-${i}`}>
                  EVSE {i + 1} power in kW
                </label>
                <div className="relative w-28">
                  <input
                    id={`kw-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={400}
                    value={c.maxKw}
                    onChange={(e) =>
                      updateConnector(i, { maxKw: e.target.value })
                    }
                    className="tabular h-10 w-full rounded-control border border-line-strong bg-white pr-10 pl-3 outline-none focus:border-ink-3"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13.5px] text-ink-3">
                    kW
                  </span>
                </div>
                {connectors.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setConnectors((list) => list.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove EVSE ${i + 1}`}
                    className="grid size-9 place-items-center rounded-control text-ink-3 hover:bg-subtle hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {connectors.length < 4 && (
            <button
              type="button"
              onClick={() =>
                setConnectors((list) => [
                  ...list,
                  { type: "CCS2", maxKw: "60" },
                ])
              }
              className="mt-2 text-[13.5px] font-medium text-ink-2 hover:text-ink"
            >
              + Add connector
            </button>
          )}
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="mt-5 text-[14px] text-error">
          {error}
        </p>
      )}
      <Actions>
        <Link
          href="/console"
          className="inline-flex h-9 items-center rounded-control px-4 text-[14px] font-medium text-ink-2 hover:bg-subtle"
        >
          Cancel
        </Link>
        <Button type="submit" loading={saving}>
          Continue
        </Button>
      </Actions>
    </form>
  );
}

// ─── Step 2 · Credentials ────────────────────────────────────────────────────

function CredentialsStep({
  charger,
  password,
  onPassword,
  onBack,
  onNext,
}: {
  charger: Charger;
  password: string | undefined;
  onPassword: (password: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string>();

  const rotate = async () => {
    setRotating(true);
    setError(undefined);
    const { data, error: apiError } = await api.POST(
      "/v1/console/chargers/{id}/credentials/rotate",
      { params: { path: { id: charger.id } } },
    );
    setRotating(false);
    if (apiError) return setError(errorMessage(apiError));
    onPassword(data.password);
    setRevealed(true);
  };

  return (
    <div>
      <StepHeading
        title="Security and credentials"
        lead="Enter these in the charger’s OCPP settings."
      />

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
          Security profile
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer flex-col gap-0.5 rounded-control border border-ink bg-subtle p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-charging">
            <input
              type="radio"
              name="profile"
              checked
              readOnly
              className="sr-only"
            />
            <span className="flex items-center gap-2 text-[14px] font-medium">
              Profile 2
              <span className="rounded-full bg-volt/15 px-1.5 text-[11.5px] font-medium text-volt-ink">
                Recommended
              </span>
            </span>
            <span className="text-[13px] text-ink-3">
              Basic Auth over TLS. Works with nearly every charger.
            </span>
          </label>
          <label className="flex cursor-not-allowed flex-col gap-0.5 rounded-control border border-line-strong p-3 opacity-60">
            <input type="radio" name="profile" disabled className="sr-only" />
            <span className="text-[14px] font-medium">Profile 3</span>
            <span className="text-[13px] text-ink-3">
              Mutual TLS with a client certificate the charger holds. Available
              once client certificates are set up for your gateway.
            </span>
          </label>
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col gap-5">
        <CopyRow label="OCPP server URL" value={charger.ocppUrl} mono />
        {password ? (
          <CopyRow
            label="Password"
            value={password}
            mono
            masked={!revealed}
            extra={
              <Button
                variant="ghost"
                className="h-8 px-2.5"
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? "Hide" : "Reveal"}
              </Button>
            }
            hint="Shown once. Store it in the charger now; you can rotate it later from the charger’s page."
          />
        ) : (
          <div className="rounded-lg border border-line bg-subtle px-4 py-3 text-[13.5px]">
            <p className="font-medium">
              The password was shown once, when the charger was added.
            </p>
            <p className="text-ink-2">
              If it was not stored in the charger, generate a new one. The old
              password stops working.
            </p>
            <Button
              variant="secondary"
              className="mt-2"
              loading={rotating}
              onClick={rotate}
            >
              Generate new password
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-[14px] text-error">
            {error}
          </p>
        )}
        {process.env.NODE_ENV === "development" && password && (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-[12.5px] text-ink-3">
            No charger at hand? From voltline-api run{" "}
            <code className="font-mono text-ink-2 break-all">
              npm run sim -- --id {charger.chargePointId} --password {password}
            </code>
          </p>
        )}
      </div>

      <Actions>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Continue</Button>
      </Actions>
    </div>
  );
}

function CopyRow({
  label,
  value,
  mono,
  masked,
  extra,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  masked?: boolean;
  extra?: React.ReactNode;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <div className="flex items-center gap-1 rounded-control border border-line-strong bg-subtle py-1 pr-1 pl-3">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[14px]",
            mono && "font-mono",
          )}
          aria-label={masked ? `${label} (hidden)` : undefined}
        >
          {masked ? "•".repeat(Math.min(value.length, 24)) : value}
        </span>
        {extra}
        <Button
          variant="secondary"
          className="h-8 w-[76px] px-2.5"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {hint && <p className="text-[12.5px] text-ink-3">{hint}</p>}
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}

// ─── Step 3 · Connect ────────────────────────────────────────────────────────

const CHECKS = [
  { key: "socket", label: "WebSocket connected" },
  { key: "credentials", label: "Credentials accepted" },
  { key: "boot", label: "BootNotification received" },
  { key: "connectors", label: "Connectors reported" },
] as const;

function ConnectStep({
  charger,
  onBack,
  onNext,
}: {
  charger: Charger;
  onBack: () => void;
  onNext: () => void;
}) {
  const { data: check } = useConnectCheck(charger.id);
  const allDone = check
    ? CHECKS.every((c) => check[c.key].state === "done")
    : false;

  return (
    <div>
      <StepHeading
        title={`Waiting for ${charger.chargePointId} to connect`}
        lead="Power the charger on. This page updates as messages arrive."
      />

      <ol
        aria-live="polite"
        className="divide-y divide-line rounded-xl border border-line"
      >
        {CHECKS.map((c) => {
          const item = check?.[c.key];
          const state = item?.state ?? "waiting";
          return (
            <li key={c.key} className="flex items-start gap-3 px-4 py-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center"
              >
                {state === "done" ? (
                  <span className="grid size-5 place-items-center rounded-full bg-volt text-[11px] text-white">
                    ✓
                  </span>
                ) : state === "failed" ? (
                  <span className="grid size-5 place-items-center rounded-full bg-error text-[11px] font-semibold text-white">
                    !
                  </span>
                ) : (
                  <Spinner className="size-3.5 text-ink-3" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[14.5px]",
                    state === "waiting" && "text-ink-3",
                  )}
                >
                  {c.label}
                  <span className="sr-only">
                    {state === "done"
                      ? " (passed)"
                      : state === "failed"
                        ? " (failed)"
                        : " (waiting)"}
                  </span>
                </p>
                {item?.detail && (
                  <p
                    className={cn(
                      "text-[13px]",
                      state === "failed"
                        ? "text-error"
                        : "font-mono text-ink-3",
                    )}
                  >
                    {item.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <div className="animate-blur-in mt-4 rounded-xl border border-volt/40 bg-volt/10 px-4 py-3">
          <p className="font-medium">{charger.chargePointId} connected</p>
          <p className="text-[14px] text-ink-2">
            Every check passed. It is waiting for your approval.
          </p>
        </div>
      )}

      <details className="mt-5 text-[14px]">
        <summary className="cursor-pointer font-medium text-ink-2">
          Not connecting after 2 minutes?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          <li>
            Check the URL ends with the exact charge point ID, including case:{" "}
            <code className="font-mono text-[13px]">{charger.ocppUrl}</code>
          </li>
          <li>
            Confirm the SIM or Wi-Fi has data and the charger clock is correct
            (TLS fails on a wrong date).
          </li>
          <li>Make sure the charger is set to OCPP-J (JSON), not SOAP.</li>
        </ul>
      </details>

      <Actions>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!allDone}>
          Continue
        </Button>
      </Actions>
    </div>
  );
}

// ─── Step 4 · Go live ────────────────────────────────────────────────────────

function GoLiveStep({
  charger,
  onBack,
  onLive,
}: {
  charger: Charger;
  onBack: () => void;
  onLive: (charger: Charger) => void;
}) {
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string>();

  const approve = async () => {
    setApproving(true);
    setError(undefined);
    const { data, error: apiError } = await api.POST(
      "/v1/console/chargers/{id}/approve",
      {
        params: { path: { id: charger.id } },
      },
    );
    setApproving(false);
    if (apiError) return setError(errorMessage(apiError));
    onLive(data);
  };

  const rows: [string, React.ReactNode][] = [
    [
      "Charger",
      `${charger.chargePointId}${charger.model ? ` · ${charger.model}` : ""}`,
    ],
    ["Site", charger.siteName],
    [
      "Protocol",
      `${charger.protocol ? `OCPP ${charger.protocol}` : "OCPP"} · Profile ${charger.securityProfile}`,
    ],
    ["Firmware", charger.firmwareVersion ?? "Not reported"],
    [
      "Tariff",
      charger.tariff ? (
        `${charger.tariff.name} · ${naira(charger.tariff.perKwhKobo)} / kWh`
      ) : (
        <span>
          None for this site yet.{" "}
          <Link
            href="/console/tariffs"
            className="underline underline-offset-2"
          >
            Set a tariff
          </Link>{" "}
          before drivers can pay.
        </span>
      ),
    ],
    ["Visible to drivers", "After approval"],
  ];

  return (
    <div>
      <StepHeading
        title="Review and go live"
        lead={`${charger.chargePointId} is connected and waiting as Pending. Approving accepts its BootNotification and opens it to drivers.`}
      />
      <dl className="divide-y divide-line rounded-xl border border-line">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[150px_1fr] gap-3 px-4 py-2.5 text-[14px]"
          >
            <dt className="text-ink-3">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <p role="alert" className="mt-4 text-[14px] text-error">
          {error}
        </p>
      )}
      <Actions>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={approve} loading={approving}>
          Approve and go live
        </Button>
      </Actions>
    </div>
  );
}

function LiveSuccess({
  charger,
  onAddAnother,
}: {
  charger: Charger;
  onAddAnother: () => void;
}) {
  return (
    <div className="animate-blur-in max-w-2xl rounded-xl border border-line p-8 text-center">
      <span
        aria-hidden
        className="mx-auto grid size-10 place-items-center rounded-full bg-volt text-[18px] text-white"
      >
        ✓
      </span>
      <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">
        {charger.chargePointId} is live
      </h2>
      <p className="mx-auto mt-1 max-w-md text-[14.5px] text-ink-3">
        Drivers can now find it in the app. We will alert you if it goes offline
        for more than 10 minutes.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          href="/console"
          className="inline-flex h-9 items-center rounded-control bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-160 ease-out active:scale-[0.97]"
        >
          Go to overview
        </Link>
        <Button variant="secondary" onClick={onAddAnother}>
          Add another
        </Button>
      </div>
    </div>
  );
}
