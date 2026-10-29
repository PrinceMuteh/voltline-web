"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PLUG_LABEL } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api/client";
import { driverKeys, useDriverMe } from "@/lib/api/driver";
import { naira } from "@/lib/format";

const BUDGETS = [500_000, 1_000_000, 1_500_000, 2_500_000, 5_000_000];

export function AccountView() {
  const { data: me } = useDriverMe();
  const queryClient = useQueryClient();
  const router = useRouter();
  const linking = useSearchParams().get("link") === "card";
  const [uid, setUid] = useState("");
  const [cardError, setCardError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const save = async (body: {
    autoStopKobo?: number | null;
    name?: string;
  }) => {
    const { data, error } = await api.PATCH("/v1/app/me", { body });
    if (error || !data) return toast.error(errorMessage(error));
    queryClient.setQueryData(driverKeys.me, data);
    toast.success("Saved");
  };

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setCardError(undefined);
    const { data, error } = await api.POST("/v1/app/me/cards", {
      body: { uid },
    });
    setBusy(false);
    if (error || !data) return setCardError(errorMessage(error));
    queryClient.setQueryData(driverKeys.me, data);
    setUid("");
    toast.success("Card linked. Tap it on any charger to start.");
  };

  const signOut = async () => {
    await api.POST("/v1/app/auth/sign-out");
    queryClient.removeQueries({ queryKey: ["app"] });
    router.replace("/app/welcome");
  };

  if (!me) {
    return (
      <main className="flex flex-col gap-3 px-5 pt-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="px-5 pt-6 pb-6">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Account</h1>
      <p className="text-[15px] text-ink-2">
        {me.name ?? "Driver"} ·{" "}
        {me.phone.replace(/^\+234(\d{3})(\d{3})(\d{4})$/, "+234 $1 $2 $3")}
      </p>

      <ul className="mt-6 divide-y divide-line rounded-xl border border-line text-[15px]">
        <Row label="Vehicles">
          {me.plugTypes.length} ·{" "}
          {me.plugTypes.map((p) => PLUG_LABEL[p]).join(", ")}
        </Row>
        <Row label="RFID cards">
          {me.cards.length ? me.cards.join(", ") : "None linked"}
        </Row>
        <li className="flex items-center justify-between gap-3 px-4 py-3">
          <label htmlFor="budget" className="text-ink-2">
            Auto-stop budget
          </label>
          <select
            id="budget"
            value={me.autoStopKobo ?? ""}
            onChange={(e) =>
              void save({
                autoStopKobo: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="h-9 rounded-control border border-line-strong bg-white px-2 text-[16px]"
          >
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {naira(b)}
              </option>
            ))}
            <option value="">No limit</option>
          </select>
        </li>
        <Row label="Operator">{me.operator}</Row>
      </ul>
      <p className="mt-2 text-[13px] text-ink-3">
        Charging stops by itself when the session cost reaches your budget.
      </p>

      <section id="cards" aria-labelledby="card-heading" className="mt-8">
        <h2 id="card-heading" className="text-[16px] font-semibold">
          Link an RFID card
        </h2>
        <p className="text-[14px] text-ink-3">
          The number is printed on the back, like 04:A2:1C:9F.
        </p>
        <form onSubmit={link} className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="card-uid">
            Card number
          </label>
          <input
            id="card-uid"
            value={uid}
            onChange={(e) => setUid(e.target.value.toUpperCase())}
            autoFocus={linking}
            autoComplete="off"
            placeholder="04:A2:1C:9F"
            className="h-12 min-w-0 flex-1 rounded-control border border-line-strong px-3 font-mono text-[16px] outline-none focus:border-ink-3"
          />
          <Button
            type="submit"
            className="h-12"
            loading={busy}
            disabled={!uid.trim()}
          >
            Link
          </Button>
        </form>
        {cardError && (
          <p role="alert" className="mt-2 text-[14px] text-error">
            {cardError}
          </p>
        )}
      </section>

      <ul className="mt-8 divide-y divide-line rounded-xl border border-line text-[15px]">
        <li>
          <Link href="/legal/terms" className="flex justify-between px-4 py-3">
            Terms of Use <span aria-hidden>→</span>
          </Link>
        </li>
        <li>
          <Link
            href="/legal/privacy"
            className="flex justify-between px-4 py-3"
          >
            Privacy Policy <span aria-hidden>→</span>
          </Link>
        </li>
      </ul>

      <Button
        variant="secondary"
        className="mt-6 h-11 w-full"
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
      <p className="mt-6 text-center text-[12.5px] text-ink-3">
        Voltline is a product of Flex Mobility Limited. Version 1.0.0
      </p>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-ink-2">{label}</span>
      <span className="truncate text-right">{children}</span>
    </li>
  );
}
