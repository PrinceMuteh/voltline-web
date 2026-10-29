import type { Metadata } from "next";
import { Suspense } from "react";
import { LogView } from "./log-view";

export const metadata: Metadata = { title: "OCPP log" };

export default function ChargerLogPage() {
  // LogView reads the charger id from the URL, which needs a Suspense boundary
  return (
    <Suspense>
      <LogView />
    </Suspense>
  );
}
