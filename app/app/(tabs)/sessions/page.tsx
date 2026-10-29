import type { Metadata } from "next";
import { DriverSessionsView } from "./sessions-view";

export const metadata: Metadata = { title: "Sessions" };

export default function DriverSessionsPage() {
  return <DriverSessionsView />;
}
