import type { Metadata } from "next";
import { ComingInPhase } from "@/components/console/coming-in-phase";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingInPhase
      title="Settings"
      phase={5}
      description="Workspace details, team and roles, OCPP settings, notifications, API keys and webhooks."
    />
  );
}
