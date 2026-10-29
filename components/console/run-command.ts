"use client";

import { toast } from "sonner";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

type Result = Schemas["CommandResultDto"];

/**
 * Shows a loading toast ("Sending UnlockConnector · CP-0007") that turns into the charger's
 * answer. Queued or timed-out commands get a Cancel action.
 */
export async function runCommand({
  label,
  chargerId,
  request,
}: {
  label: string;
  chargerId: string;
  request: () => Promise<{ data?: Result; error?: unknown }>;
}) {
  const toastId = toast.loading(`Sending ${label}`, {
    description: "Awaiting response",
  });
  const { data, error } = await request();
  if (error || !data) {
    toast.error("Command not sent", {
      id: toastId,
      description: errorMessage(error),
    });
    return undefined;
  }
  const queued = data.status === "QUEUED" || data.status === "TIMED_OUT";
  const show =
    data.status === "ACCEPTED"
      ? toast.success
      : queued
        ? toast.warning
        : toast.error;
  show(data.title, {
    id: toastId,
    description: data.detail,
    action: queued
      ? {
          label: "Cancel",
          onClick: () => {
            void api
              .POST("/v1/console/chargers/{id}/commands/{commandId}/cancel", {
                params: { path: { id: chargerId, commandId: data.id } },
              })
              .then(({ error: cancelError }) =>
                cancelError
                  ? toast.error(errorMessage(cancelError))
                  : toast("Command cancelled"),
              );
          },
        }
      : undefined,
  });
  return data;
}
