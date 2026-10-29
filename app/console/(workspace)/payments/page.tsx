import type { Metadata } from "next";
import { ComingInPhase } from "@/components/console/coming-in-phase";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <ComingInPhase
      title="Payments"
      phase={4}
      description="Transactions, site host payouts and payment gateway settings."
    />
  );
}
