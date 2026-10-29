"use client";

import { useParams } from "next/navigation";
import { VoltlineLogo } from "@/components/brand/voltline-logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useMe, useSession } from "@/lib/api/queries";
import { kwh, nairaExact } from "@/lib/format";

/** A printable receipt; the browser's print dialog saves it as PDF. */
export function ReceiptView() {
  const { id } = useParams<{ id: string }>();
  const { data: s, error } = useSession(id);
  const { data: me } = useMe();
  const timeZone = me?.workspace.timeZone ?? "Africa/Lagos";
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });

  if (error) {
    return (
      <p role="alert" className="p-8 text-error">
        {errorMessage(error)}
      </p>
    );
  }
  if (!s) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const b = s.billing;
  const lines: [string, number][] = b
    ? [
        [`Energy · ${kwh(s.energyWh)}`, b.energyKobo],
        ...(b.peakKobo
          ? [["Peak surcharge", b.peakKobo] as [string, number]]
          : []),
        ...(b.timeKobo
          ? [["Charging time", b.timeKobo] as [string, number]]
          : []),
        ...(b.sessionFeeKobo
          ? [["Session fee", b.sessionFeeKobo] as [string, number]]
          : []),
        ...(b.idleKobo
          ? [
              [`Idle fee · ${b.idleMinutes} min`, b.idleKobo] as [
                string,
                number,
              ],
            ]
          : []),
      ]
    : [];

  return (
    <main className="mx-auto max-w-xl px-6 py-10 print:py-0">
      <div className="mb-6 flex justify-end gap-2 print:hidden">
        <Button onClick={() => window.print()}>Print or save as PDF</Button>
      </div>
      <article className="rounded-xl border border-line p-8 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4">
          <div>
            <VoltlineLogo />
            <p className="mt-2 text-[13px] text-ink-3">
              {s.registeredCompanyName ?? s.workspaceName}
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-[20px] font-semibold">Receipt</h1>
            <p className="font-mono text-[13px] text-ink-3">{s.reference}</p>
          </div>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
          <div>
            <dt className="text-ink-3">Driver</dt>
            <dd>{s.driver}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Charger</dt>
            <dd>
              {s.chargePointId} · {s.siteName}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Started</dt>
            <dd>{when(s.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Ended</dt>
            <dd>{s.endedAt ? when(s.endedAt) : "Still charging"}</dd>
          </div>
        </dl>

        {b ? (
          <table className="mt-8 w-full text-[14px]">
            <tbody className="divide-y divide-line">
              {lines.map(([label, kobo]) => (
                <tr key={label}>
                  <td className="py-2">{label}</td>
                  <td className="tabular py-2 text-right">
                    {nairaExact(kobo)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-3">Total</td>
                <td className="tabular py-3 text-right">
                  {nairaExact(b.totalKobo)}
                </td>
              </tr>
              <tr className="text-ink-3">
                <td className="py-2">
                  VAT {(s.tariff?.vatBps ?? 750) / 100}%{" "}
                  {b.vatIncluded ? "included" : "added"}
                </td>
                <td className="tabular py-2 text-right">
                  {nairaExact(b.vatKobo)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="mt-8 text-[14px] text-ink-3">
            This session was not billed.
          </p>
        )}

        <footer className="mt-8 text-[12.5px] text-ink-3">
          <p>
            Billed to {s.paymentMethod}
            {s.tariff && ` · ${s.tariff.name} tariff`}
            {s.status === "REFUNDED" && " · Refunded"}
          </p>
          {s.siteAddress && <p>{s.siteAddress}</p>}
        </footer>
      </article>
    </main>
  );
}
