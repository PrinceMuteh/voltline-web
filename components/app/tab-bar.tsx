"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  {
    href: "/app",
    label: "Map",
    icon: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  },
  {
    href: "/app/sessions",
    label: "Sessions",
    icon: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  },
  {
    href: "/app/wallet",
    label: "Wallet",
    icon: "M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2",
  },
  {
    href: "/app/account",
    label: "Account",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  },
] as const;

/** Translucent, blurred tab bar. Tab switches are instant: they are used constantly. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-line bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const current =
            t.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] font-medium",
                  current ? "text-ink" : "text-ink-3",
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={current ? 2 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
