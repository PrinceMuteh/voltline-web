import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptView } from "./receipt-view";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage() {
  return (
    <Suspense>
      <ReceiptView />
    </Suspense>
  );
}
