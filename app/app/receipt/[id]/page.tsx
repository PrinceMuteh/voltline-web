import type { Metadata } from "next";
import { Suspense } from "react";
import { DriverReceiptView } from "./receipt-view";

export const metadata: Metadata = { title: "Receipt" };

export default function DriverReceiptPage() {
  return (
    <Suspense>
      <DriverReceiptView />
    </Suspense>
  );
}
