import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanView } from "./scan-view";

export const metadata: Metadata = { title: "Scan charger QR" };

export default function ScanPage() {
  return (
    <Suspense>
      <ScanView />
    </Suspense>
  );
}
