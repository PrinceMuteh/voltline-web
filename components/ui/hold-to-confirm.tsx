"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Destructive actions fill red over the hold time while pressed (linear) and
 * snap back in 200 ms on release. Slow to decide, fast to respond.
 */
export function HoldToConfirm({
  children,
  onConfirm,
  holdMs = 2000,
  className,
}: {
  children: React.ReactNode;
  onConfirm: () => void;
  holdMs?: number;
  className?: string;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const start = () => {
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      onConfirm();
    }, holdMs);
  };
  const cancel = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) start();
      }}
      onKeyUp={cancel}
      className={cn(
        "relative inline-flex h-9 items-center justify-center overflow-hidden rounded-control border border-error/40 px-4 text-[14px] font-medium text-error select-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-error"
        style={{
          clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
          transition: holding
            ? `clip-path ${holdMs}ms linear`
            : "clip-path 200ms var(--ease-out)",
        }}
      />
      <span
        className={cn("relative transition-colors", holding && "text-white")}
      >
        {children}
      </span>
    </button>
  );
}
