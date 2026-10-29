import type { Metadata } from "next";
import Link from "next/link";
import { WalletBalance } from "./wallet-balance";

export const metadata: Metadata = { title: "Wallet" };

/** Top-ups and card payments arrive with the payment gateway; the rest is real. */
export default function WalletPage() {
  return (
    <main className="px-5 pt-6">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Wallet</h1>
      <WalletBalance />
      <section aria-labelledby="pay-with" className="mt-8">
        <h2 id="pay-with" className="text-[13px] font-medium text-ink-3">
          Pay with
        </h2>
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-[15px] text-ink-3">
          <li className="px-4 py-3">Debit card</li>
          <li className="px-4 py-3">Bank transfer · Instant top-up</li>
          <li className="px-4 py-3">USSD · Any network</li>
        </ul>
        <p className="mt-2 text-[13px] text-ink-3">
          Top-ups and card payments come with the payment gateway. Until then
          sessions are billed to your account.
        </p>
      </section>
      <Link
        href="/app/account?link=card"
        className="mt-6 inline-flex h-11 items-center text-[15px] font-medium text-ink underline underline-offset-2"
      >
        Link RFID card
      </Link>
    </main>
  );
}
