"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { VoltlineLogo } from "@/components/brand/voltline-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { useMe, useNetwork } from "@/lib/api/queries";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/console", label: "Overview" },
  { href: "/console/sessions", label: "Sessions" },
  { href: "/console/drivers", label: "Drivers" },
  { href: "/console/tariffs", label: "Tariffs" },
  { href: "/console/payments", label: "Payments" },
  { href: "/console/firmware", label: "Firmware" },
  { href: "/console/alerts", label: "Alerts" },
  { href: "/console/settings", label: "Settings" },
] as const;

/** Navigation never animates: it is used dozens of times a day. */
export function Sidebar() {
  const pathname = usePathname();
  const { data: me, isPending } = useMe();
  const { data: network, isError: networkDown } = useNetwork();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await api.POST("/v1/auth/sign-out");
    queryClient.clear();
    router.replace("/console/sign-in");
  };

  return (
    <aside className="flex flex-col border-line bg-subtle px-4 py-5 md:w-[232px] md:shrink-0 md:border-r">
      <Link href="/console" className="px-2">
        <VoltlineLogo />
      </Link>
      <div className="mt-5 px-2">
        {isPending ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <p className="truncate text-[14px] font-semibold">
            {me?.workspace.name}
          </p>
        )}
        <p className="text-[12.5px] text-ink-3">Operator workspace</p>
      </div>

      <nav aria-label="Console" className="mt-5">
        <ul className="flex flex-wrap gap-0.5 md:flex-col">
          {nav.map((item) => {
            const current =
              item.href === "/console"
                ? pathname === "/console"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-control border px-3 text-[14px]",
                    current
                      ? "border-line bg-white font-medium text-ink"
                      : "border-transparent text-ink-2 hover:text-ink",
                  )}
                >
                  {item.label}
                  {item.href === "/console/alerts" &&
                    network !== undefined &&
                    network.openAlerts > 0 && (
                      <span className="tabular ml-auto rounded-full bg-ink px-1.5 text-[11.5px] leading-[18px] font-medium text-white">
                        {network.openAlerts}
                        <span className="sr-only"> open</span>
                      </span>
                    )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="mt-6 flex items-center gap-2 px-2 text-[12.5px] text-ink-3 md:mt-auto">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            networkDown ? "bg-error" : network ? "bg-volt" : "bg-line-strong",
          )}
        />
        {networkDown
          ? "OCPP gateway unreachable"
          : network
            ? `OCPP gateway healthy · ${network.socketsConnected} of ${network.chargers} sockets connected`
            : "Checking OCPP gateway…"}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line px-2 pt-4">
        <div className="min-w-0">
          {isPending ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              <p className="truncate text-[13px] font-medium">
                {me?.user.name}
              </p>
              <p className="text-[12px] text-ink-3 capitalize">
                {me?.role.toLowerCase().replace("_", " ")}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 text-[13px] text-ink-3 hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
