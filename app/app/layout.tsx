import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { template: "%s · Voltline", default: "Voltline" },
  description: "Find a charger. Tap to start. Pay as you go.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

/** The driver app: a phone-width column (390 × 844 in the designs), centred on larger screens. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-subtle">
      <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col overflow-x-hidden bg-white shadow-[0_0_0_1px_var(--color-line)]">
        {children}
      </div>
    </div>
  );
}
