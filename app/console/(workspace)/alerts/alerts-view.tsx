"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { keys, useAlerts, useMe } from "@/lib/api/queries";
import { NeedsAttention } from "../needs-attention";

export function AlertsView() {
  const { data: alerts, error } = useAlerts();
  const { data: me } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canResolve = me && me.role !== "FINANCE";

  const resolve = async (id: string) => {
    const { error: apiError } = await api.POST(
      "/v1/console/alerts/{id}/resolve",
      {
        params: { path: { id } },
      },
    );
    if (apiError) return toast.error(errorMessage(apiError));
    void queryClient.invalidateQueries({ queryKey: keys.alerts });
    void queryClient.invalidateQueries({ queryKey: keys.network });
  };

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Faults and chargers that have gone quiet. They clear on their own when the charger recovers."
      />
      {error ? (
        <p role="alert" className="text-[14px] text-error">
          {errorMessage(error)}
        </p>
      ) : (
        <section className="max-w-3xl rounded-xl border border-line px-5 py-2">
          <NeedsAttention
            alerts={alerts}
            onInspect={(chargerId) =>
              router.push(`/console?charger=${chargerId}`)
            }
          />
          {canResolve && alerts && alerts.length > 0 && (
            <div className="border-t border-line py-3">
              <p className="mb-2 text-[13px] text-ink-3">
                Dealt with something outside Voltline? Mark it resolved.
              </p>
              <ul className="flex flex-wrap gap-2">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <Button
                      variant="ghost"
                      className="h-8 px-2.5 text-[13px]"
                      onClick={() => void resolve(a.id)}
                    >
                      Resolve “{a.title}”
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
