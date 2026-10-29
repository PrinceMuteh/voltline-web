import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use" };

// The full text from the design handoff is published with the marketing site (phase 6).
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-[12px] font-medium tracking-[0.08em] text-ink-3">
        LEGAL
      </p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.025em]">
        Terms of Use
      </h1>
      <p className="mt-4 text-ink-2">
        The full Terms of Use of Flex Mobility Limited will be published here.
        For questions, email hello@flexmobility.co.
      </p>
    </main>
  );
}
