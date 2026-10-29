"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { VoltlineLogo } from "@/components/brand/voltline-logo";
import { Button } from "@/components/ui/button";
import { Field, validateEmail } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusPill } from "@/components/ui/status-pill";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type Mode = "sign-in" | "create";
type ChargerCount = Schemas["SignUpDto"]["chargerCount"];
type Country = Schemas["SignUpDto"]["country"];

const countries: { value: Country; label: string }[] = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "South Africa" },
  { value: "OTHER", label: "Other" },
];

const chargerCounts: { value: ChargerCount; label: string }[] = [
  { value: "ONE_TO_TEN", label: "1 to 10" },
  { value: "ELEVEN_TO_FIFTY", label: "11 to 50" },
  { value: "FIFTY_ONE_PLUS", label: "51+" },
];

/** Only same-app console paths, so ?next= can't send people elsewhere. */
function nextPath(fallback: string) {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/console") && !next.startsWith("//")
    ? next
    : fallback;
}

export function SignInView() {
  const [mode, setMode] = useState<Mode>("sign-in");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" aria-label="Voltline home" className="self-start">
          <VoltlineLogo />
        </Link>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <SegmentedControl
            label="Sign in or create an account"
            options={[
              { value: "sign-in", label: "Sign in" },
              { value: "create", label: "Create account" },
            ]}
            value={mode}
            onChange={setMode}
            className="mb-8"
          />
          <div key={mode} className="animate-blur-in">
            {mode === "sign-in" ? <SignInForm /> : <CreateAccountForm />}
          </div>
        </div>
      </section>

      <PreviewPanel />
    </main>
  );
}

function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    setSubmitting(true);
    setError(undefined);
    const { error } = await api.POST("/v1/auth/sign-in", {
      body: { email, password },
    });
    if (error) {
      setSubmitting(false);
      return setError(errorMessage(error));
    }
    router.replace(nextPath("/console"));
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
          Welcome back
        </h1>
        <p className="text-ink-3">Sign in to your operator workspace.</p>
      </header>

      <Field
        label="Work email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        validate={validateEmail}
        required
      />
      <Field
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        labelAside={
          <button
            type="button"
            className="text-[13px] text-ink-3 hover:text-ink"
            onClick={() =>
              toast("Password reset is not available yet", {
                description:
                  "Ask an admin in your workspace to help you sign in.",
              })
            }
          >
            Forgot password?
          </button>
        }
        trailing={
          <button
            type="button"
            className="h-8 rounded-md px-2 text-[13px] font-medium text-ink-3 hover:text-ink"
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        }
      />

      {error && <FormError message={error} />}

      <Button type="submit" loading={submitting} className="h-10">
        Sign in
      </Button>
      <div className="flex items-center gap-3 text-[13px] text-ink-3">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        variant="secondary"
        className="h-10"
        onClick={() =>
          toast("SSO is not set up for your workspace", {
            description:
              "An admin can turn it on in Settings once it is available.",
          })
        }
      >
        Continue with SSO
      </Button>
    </form>
  );
}

function CreateAccountForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    country: "NG" as Country,
    chargerCount: "ONE_TO_TEN" as ChargerCount,
  });
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const set =
    <K extends keyof typeof form>(key: K) =>
    (value: (typeof form)[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    const { error } = await api.POST("/v1/auth/sign-up", { body: form });
    if (error) {
      setSubmitting(false);
      return setError(errorMessage(error));
    }
    // Phase 2 replaces this with the Add a charger wizard
    router.replace("/console/chargers/new");
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">
          Start your network
        </h1>
        <p className="text-ink-3">
          Set up a workspace and connect your first charger.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Your name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => set("name")(e.target.value)}
          validate={(v) =>
            v.trim().length < 2 ? "Enter your name." : undefined
          }
        />
        <Field
          label="Company"
          autoComplete="organization"
          value={form.company}
          onChange={(e) => set("company")(e.target.value)}
          validate={(v) =>
            v.trim().length < 2 ? "Enter your company name." : undefined
          }
        />
      </div>
      <Field
        label="Work email"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={(e) => set("email")(e.target.value)}
        validate={validateEmail}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        value={form.password}
        onChange={(e) => set("password")(e.target.value)}
        validate={(v) =>
          v.length < 10
            ? "Use at least 10 characters for your password."
            : undefined
        }
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="country" className="text-[13px] font-medium text-ink-2">
          Country of operation
        </label>
        <select
          id="country"
          value={form.country}
          onChange={(e) => set("country")(e.target.value as Country)}
          className="h-10 rounded-control border border-line-strong bg-white px-3"
        >
          {countries.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
          How many chargers will you connect?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {chargerCounts.map((c) => (
            <label
              key={c.value}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center rounded-control border text-[14px] font-medium",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-charging",
                form.chargerCount === c.value
                  ? "border-ink bg-subtle text-ink"
                  : "border-line-strong text-ink-2",
              )}
            >
              <input
                type="radio"
                name="chargerCount"
                value={c.value}
                checked={form.chargerCount === c.value}
                onChange={() => set("chargerCount")(c.value)}
                className="sr-only"
              />
              <span className="tabular">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <FormError message={error} />}

      <Button type="submit" loading={submitting} className="h-10">
        Create account and add a charger
      </Button>
      <p className="text-[12.5px] text-ink-3">
        By creating an account you agree to the{" "}
        <Link href="/legal/terms" className="underline">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline">
          Privacy Policy
        </Link>{" "}
        of Flex Mobility Limited.
      </p>
    </form>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-control bg-[#fbeeed] px-3 py-2 text-[13.5px] text-error"
    >
      {message}
    </p>
  );
}

const previewChargers = [
  {
    id: "CP-0021",
    site: "Airport Road Hub",
    status: "charging" as const,
    power: "84.5 kW",
  },
  { id: "CP-0018", site: "Wuse II Mall", status: "available" as const },
  { id: "CP-0031", site: "Lekki Phase 1", status: "faulted" as const },
];

function PreviewPanel() {
  return (
    <aside className="hidden flex-col justify-between bg-ink px-12 py-10 text-white lg:flex">
      <div />
      <div className="mx-auto w-full max-w-[440px]">
        <p className="text-[12px] font-medium tracking-[0.08em] text-volt">
          OPERATOR CONSOLE
        </p>
        <h2 className="mt-3 text-[32px] leading-[1.15] font-semibold tracking-[-0.025em]">
          Every charger, every session, one console.
        </h2>
        <ul className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
          {previewChargers.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="tabular text-[13px]">{c.id}</p>
                <p className="text-[13px] text-white/60">{c.site}</p>
              </div>
              <div className="flex items-center gap-3">
                {c.power && (
                  <span className="tabular text-[13px] text-white/80">
                    {c.power}
                  </span>
                )}
                <StatusPill status={c.status} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-white/60">
          OCPP 1.6J and 2.0.1 · Card, transfer and USSD payments · Offline-safe
          billing
        </p>
      </div>
      <p className="text-center text-[12.5px] text-white/50">
        A product of Flex Mobility Limited ·{" "}
        <Link href="/legal/terms" className="hover:text-white">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacy" className="hover:text-white">
          Privacy
        </Link>
      </p>
    </aside>
  );
}
