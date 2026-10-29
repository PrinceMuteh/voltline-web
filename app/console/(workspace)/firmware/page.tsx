import type { Metadata } from "next";
import { ComingInPhase } from "@/components/console/coming-in-phase";

export const metadata: Metadata = { title: "Firmware" };

export default function FirmwarePage() {
  return (
    <ComingInPhase
      title="Firmware"
      phase={5}
      description="Signed firmware campaigns pushed to chargers with UpdateFirmware, with live progress per charger."
    />
  );
}
