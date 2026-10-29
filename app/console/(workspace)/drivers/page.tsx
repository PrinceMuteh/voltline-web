import type { Metadata } from "next";
import { ComingInPhase } from "@/components/console/coming-in-phase";

export const metadata: Metadata = { title: "Drivers" };

export default function DriversPage() {
  return (
    <ComingInPhase
      title="Drivers"
      phase={5}
      description="App users, RFID card holders and fleets, with card issuing and local authorization list sync."
    />
  );
}
