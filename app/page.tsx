import Link from "next/link";

// Temporary landing until the Flex Mobility and Voltline marketing pages land (phase 6).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <p className="text-[13px] font-medium tracking-wide text-volt-ink">
        VOLTLINE
      </p>
      <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.025em]">
        Run every charger from one console.
      </h1>
      <p className="text-ink-2">
        Voltline connects any OCPP 1.6J or 2.0.1 charger, bills drivers by the
        kWh, and keeps stations online.
      </p>
      <div>
        <Link
          href="/console/sign-in"
          className="inline-flex h-9 items-center rounded-control bg-ink px-4 text-[14px] font-medium text-white"
        >
          Sign in to the console
        </Link>{" "}
        <Link
          href="/app"
          className="ml-2 inline-flex h-9 items-center rounded-control border border-line-strong px-4 text-[14px] font-medium"
        >
          Open the driver app
        </Link>
      </div>
    </main>
  );
}
