import type { Metadata } from "next";
import { ChargingView } from "./charging-view";

export const metadata: Metadata = { title: "Charging" };

export default function ChargingPage() {
  return <ChargingView />;
}
