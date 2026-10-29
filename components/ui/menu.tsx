"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A single-choice menu. It grows from its button (origin-aware scale): 200 ms in, 150 ms out.
 * Arrow keys move between items; Escape and outside clicks close it.
 */
export function Menu<T extends string>({
  label,
  value,
  options,
  onChange,
  align = "end",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  // Keep the list mounted while it scales out
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-checked="true"]')
      ?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-control border border-line-strong bg-white px-3 text-[14px] font-medium transition-transform duration-160 ease-out hover:bg-subtle active:scale-[0.97]"
      >
        <span className="sr-only">{label}: </span>
        {current?.label}
        <span aria-hidden className="text-[11px] text-ink-3">
          ▾
        </span>
      </button>
      {mounted && (
        <ul
          ref={listRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              rootRef.current?.querySelector("button")?.focus();
            }
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const items = [
              ...(listRef.current?.querySelectorAll<HTMLElement>(
                '[role="menuitemradio"]',
              ) ?? []),
            ];
            const at = items.indexOf(document.activeElement as HTMLElement);
            const step = e.key === "ArrowDown" ? 1 : -1;
            items.at((at + step) % items.length)?.focus();
          }}
          className={cn(
            "absolute top-full z-30 mt-1 min-w-44 rounded-lg border border-line bg-white p-1 shadow-[0_8px_24px_rgb(0_0_0/0.08)]",
            align === "end"
              ? "right-0 origin-top-right"
              : "left-0 origin-top-left",
            "transition-[opacity,scale]",
            open
              ? "scale-100 opacity-100 duration-200 ease-out starting:scale-95 starting:opacity-0"
              : "scale-95 opacity-0 duration-150 ease-out",
          )}
        >
          {options.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={o.value === value}
                tabIndex={-1}
                onClick={() => choose(o.value)}
                className="flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-left text-[14px] outline-none hover:bg-subtle focus-visible:bg-subtle"
              >
                {o.label}
                {o.value === value && (
                  <span aria-hidden className="text-ink-3">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
