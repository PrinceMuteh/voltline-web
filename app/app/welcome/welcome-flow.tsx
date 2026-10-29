"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckBadge, storeLocation } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type Step = "welcome" | "phone" | "code" | "plugs" | "location" | "done";
type Plug = "CCS2" | "TYPE2" | "CHADEMO";
const ORDER: Step[] = ["welcome", "phone", "code", "plugs", "location", "done"];

const plugs: { value: Plug; label: string; hint: string }[] = [
  { value: "CCS2", label: "CCS2", hint: "Most new cars sold in Nigeria" },
  { value: "TYPE2", label: "Type 2", hint: "AC charging at malls and offices" },
  { value: "CHADEMO", label: "CHAdeMO", hint: "Older Nissan and some imports" },
];

/** "803 000 0000" from up to 10 digits; a leading 0 is dropped. */
const formatPhone = (digits: string) =>
  [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
    .filter(Boolean)
    .join(" ");

export function WelcomeFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [wantsCard, setWantsCard] = useState(false);
  const [digits, setDigits] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const go = (to: Step) => {
    setDirection(ORDER.indexOf(to) > ORDER.indexOf(step) ? "forward" : "back");
    setError(undefined);
    setStep(to);
  };
  const finish = (path = "/app") => {
    void queryClient.invalidateQueries({ queryKey: ["app"] });
    router.replace(next ?? (wantsCard ? "/app/account?link=card" : path));
  };

  const sendCode = async () => {
    setBusy(true);
    setError(undefined);
    const { data, error: apiError } = await api.POST("/v1/app/auth/otp/send", {
      body: { phone: digits },
    });
    setBusy(false);
    if (apiError || !data) return setError(errorMessage(apiError));
    setDevCode(data.devCode);
    go("code");
  };

  const verify = async (code: string) => {
    setBusy(true);
    setError(undefined);
    const { data, error: apiError } = await api.POST(
      "/v1/app/auth/otp/verify",
      {
        body: { phone: digits, code },
      },
    );
    setBusy(false);
    if (apiError || !data) {
      setError(errorMessage(apiError));
      return false;
    }
    if (data.isNew) go("plugs");
    else finish();
    return true;
  };

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-8">
      {step !== "welcome" && step !== "done" && (
        <button
          type="button"
          onClick={() => go(ORDER[ORDER.indexOf(step) - 1] ?? "welcome")}
          className="-ml-2 self-start rounded-control px-2 py-1 text-[15px] text-ink-2 hover:bg-subtle"
          aria-label="Back"
        >
          ← Back
        </button>
      )}
      <div
        key={step}
        className={cn(
          "flex flex-1 flex-col",
          direction === "forward"
            ? "animate-screen-forward"
            : "animate-screen-back",
        )}
      >
        {step === "welcome" && (
          <>
            <WelcomeMap />
            <h1 className="mt-8 font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">
              Find a charger. Tap to start. Pay as you go.
            </h1>
            <p className="mt-3 text-[16px] text-ink-2">
              Live availability, pricing up front, and a receipt for every
              session.
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button className="h-12 text-[16px]" onClick={() => go("phone")}>
                Continue with phone number
              </Button>
              <button
                type="button"
                onClick={() => {
                  setWantsCard(true);
                  go("phone");
                }}
                className="h-11 text-[15px] font-medium text-ink-2"
              >
                I already have an RFID card
              </button>
            </div>
          </>
        )}

        {step === "phone" && (
          <form
            className="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              if (digits.length === 10) void sendCode();
            }}
          >
            <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]">
              Your phone number
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              We will text you a 6-digit code. No password to remember.
            </p>
            <label className="mt-6 flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-2">
                Phone number
              </span>
              <span className="flex h-12 items-center rounded-control border border-line-strong bg-white focus-within:border-ink-3">
                <span className="border-r border-line px-3 text-[16px] text-ink-2">
                  NG +234
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                  value={formatPhone(digits)}
                  onChange={(e) => {
                    let d = e.target.value.replace(/\D/g, "");
                    if (d.startsWith("234")) d = d.slice(3);
                    if (d.startsWith("0")) d = d.slice(1);
                    setDigits(d.slice(0, 10));
                  }}
                  placeholder="803 000 0000"
                  className="h-full flex-1 bg-transparent px-3 text-[16px] tracking-wide outline-none"
                />
              </span>
              <span className="text-[13px] text-ink-3" aria-live="polite">
                {digits.length < 10
                  ? `${10 - digits.length} more digits`
                  : "Looks right"}
              </span>
            </label>
            {error && (
              <p role="alert" className="mt-3 text-[14px] text-error">
                {error}
              </p>
            )}
            <p className="mt-auto pt-8 text-[13px] text-ink-3">
              By continuing you agree to the{" "}
              <Link
                href="/legal/terms"
                className="underline underline-offset-2"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="underline underline-offset-2"
              >
                Privacy Policy
              </Link>{" "}
              of Flex Mobility Limited.
            </p>
            <Button
              type="submit"
              className="mt-3 h-12 text-[16px]"
              disabled={digits.length !== 10}
              loading={busy}
            >
              Send code
            </Button>
          </form>
        )}

        {step === "code" && (
          <CodeStep
            phone={`+234 ${formatPhone(digits)}`}
            devCode={devCode}
            error={error}
            busy={busy}
            onVerify={verify}
            onResend={sendCode}
          />
        )}

        {step === "plugs" && <PlugStep onDone={() => go("location")} />}

        {step === "location" && (
          <>
            <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]">
              Show chargers near you?
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              Your location is used only while the app is open, to sort chargers
              by distance. It is never shared with charger owners.
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button
                className="h-12 text-[16px]"
                loading={busy}
                onClick={() => {
                  setBusy(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      storeLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                      });
                      setBusy(false);
                      go("done");
                    },
                    () => {
                      setBusy(false);
                      go("done");
                    },
                    { timeout: 10_000 },
                  );
                }}
              >
                Allow while using the app
              </Button>
              <button
                type="button"
                onClick={() => go("done")}
                className="h-11 text-[15px] font-medium text-ink-2"
              >
                Not now
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <div className="mt-20">
              <CheckBadge />
            </div>
            <h1 className="mt-6 text-center text-[26px] font-semibold tracking-[-0.02em]">
              You are all set
            </h1>
            <p className="mt-2 text-center text-[15px] text-ink-2">
              Top up your wallet or add a card before your first charge.
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button className="h-12 text-[16px]" onClick={() => finish()}>
                Find a charger
              </Button>
              <button
                type="button"
                onClick={() => finish("/app/wallet")}
                className="h-11 text-[15px] font-medium text-ink-2"
              >
                Top up wallet first
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/** Six boxes over one hidden one-time-code input, so SMS autofill works. */
function CodeStep({
  phone,
  devCode,
  error,
  busy,
  onVerify,
  onResend,
}: {
  phone: string;
  devCode?: string;
  error?: string;
  busy: boolean;
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const change = (value: string) => {
    const d = value.replace(/\D/g, "").slice(0, 6);
    setCode(d);
    if (d.length === 6) {
      void onVerify(d).then((ok) => {
        if (!ok) setCode("");
      });
    }
  };

  return (
    <>
      <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]">
        Enter the code
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">Sent to {phone}.</p>
      <label
        className="relative mt-6 block"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="sr-only">6-digit code</span>
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => change(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          disabled={busy}
          className="absolute inset-0 z-10 opacity-0"
        />
        <span aria-hidden className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "grid h-14 place-items-center rounded-control border text-[24px] font-semibold",
                i === Math.min(code.length, 5) && !busy
                  ? "border-ink ring-2 ring-charging/40"
                  : "border-line-strong",
              )}
            >
              {code[i] && (
                <span key={code[i] + i} className="animate-fade-up">
                  {code[i]}
                </span>
              )}
            </span>
          ))}
        </span>
      </label>
      {busy && (
        <p
          className="mt-3 flex items-center gap-2 text-[14px] text-ink-2"
          aria-live="polite"
        >
          <Spinner className="size-3.5" /> Checking
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[14px] text-error">
          {error}
        </p>
      )}
      {devCode && (
        <p className="mt-4 rounded-lg border border-dashed border-line-strong px-3 py-2 text-[13px] text-ink-3">
          Development: no SMS is sent yet. Your code is{" "}
          <span className="font-mono font-medium text-ink">{devCode}</span>.
        </p>
      )}
      <div className="mt-6 text-[14px]">
        {wait > 0 ? (
          <span className="text-ink-3">
            Resend code in 0:{String(wait).padStart(2, "0")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setWait(30);
              setCode("");
              void onResend();
            }}
            className="font-medium text-ink underline underline-offset-2"
          >
            Resend code
          </button>
        )}
      </div>
    </>
  );
}

function PlugStep({ onDone }: { onDone: () => void }) {
  const [chosen, setChosen] = useState<Plug[]>(["CCS2"]);
  const [busy, setBusy] = useState(false);
  const save = async (value: Plug[]) => {
    setBusy(true);
    await api.PATCH("/v1/app/me", { body: { plugTypes: value } });
    setBusy(false);
    onDone();
  };
  return (
    <>
      <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]">
        Which plug does your car use?
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">
        We will show chargers that fit. Pick all that apply.
      </p>
      <fieldset className="mt-6 flex flex-col gap-2">
        <legend className="sr-only">Plugs</legend>
        {plugs.map((p) => {
          const on = chosen.includes(p.value);
          return (
            <label
              key={p.value}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-charging",
                on ? "border-ink bg-subtle" : "border-line-strong",
              )}
            >
              <span>
                <span className="block text-[16px] font-medium">{p.label}</span>
                <span className="block text-[13.5px] text-ink-3">{p.hint}</span>
              </span>
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setChosen((c) =>
                    on ? c.filter((x) => x !== p.value) : [...c, p.value],
                  )
                }
                className="size-5 accent-ink"
              />
            </label>
          );
        })}
      </fieldset>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button
          className="h-12 text-[16px]"
          disabled={chosen.length === 0}
          loading={busy}
          onClick={() => void save(chosen)}
        >
          Continue
        </Button>
        <button
          type="button"
          onClick={() => void save(["CCS2", "TYPE2", "CHADEMO"])}
          className="h-11 text-[15px] font-medium text-ink-2"
        >
          Not sure, show all
        </button>
      </div>
    </>
  );
}

/** The welcome illustration: a flat map with three charger pins, 120 kW highlighted. */
function WelcomeMap() {
  const pin = (x: number, y: number, label: string, hot = false) => (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="-30"
        y="-16"
        width="60"
        height="28"
        rx="14"
        fill={hot ? "#0b0b0c" : "#ffffff"}
        stroke="#d4d4cf"
      />
      <circle cx="-17" cy="-2" r="4" fill="#22c55e" />
      <text
        x="5"
        y="3"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill={hot ? "#ffffff" : "#0b0b0c"}
      >
        {label}
      </text>
    </g>
  );
  return (
    <svg
      viewBox="0 0 340 220"
      className="mt-6 w-full rounded-2xl bg-subtle"
      role="img"
      aria-label="Map with three chargers"
    >
      <path
        d="M0 150 C80 120 140 170 220 130 S320 90 340 110"
        stroke="#e8e8e4"
        strokeWidth="18"
        fill="none"
      />
      <path
        d="M60 0 C70 80 110 140 100 220"
        stroke="#e8e8e4"
        strokeWidth="14"
        fill="none"
      />
      <path
        d="M250 0 C230 70 260 150 240 220"
        stroke="#e8e8e4"
        strokeWidth="10"
        fill="none"
      />
      {pin(90, 70, "22 kW")}
      {pin(200, 105, "120 kW", true)}
      {pin(270, 170, "60 kW")}
    </svg>
  );
}
