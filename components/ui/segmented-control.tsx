"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * A styled copy of the list is clipped to the active item, so background and
 * text change in one motion (220 ms ease-in-out).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState<string>();
  // The first position is placed without motion; only later changes animate
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    const measure = () => {
      const active = list?.querySelector<HTMLButtonElement>(
        `[data-value="${value}"]`,
      );
      if (!list || !active) return;
      const left = active.offsetLeft;
      const right = list.offsetWidth - (left + active.offsetWidth);
      setClip(`inset(3px ${right}px 3px ${left}px round 7px)`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (list) observer.observe(list);
    return () => observer.disconnect();
  }, [value, options]);

  useEffect(() => {
    if (clip && !animate) requestAnimationFrame(() => setAnimate(true));
  }, [clip, animate]);

  const items = (active: boolean) =>
    options.map((option) => (
      <button
        key={option.value}
        type="button"
        data-value={option.value}
        role={active ? undefined : "tab"}
        aria-selected={active ? undefined : option.value === value}
        tabIndex={active ? -1 : option.value === value ? 0 : -1}
        onClick={active ? undefined : () => onChange(option.value)}
        onKeyDown={
          active
            ? undefined
            : (event) => {
                const index = options.findIndex((o) => o.value === value);
                const step =
                  event.key === "ArrowRight"
                    ? 1
                    : event.key === "ArrowLeft"
                      ? -1
                      : 0;
                if (!step) return;
                event.preventDefault();
                const next = options.at((index + step) % options.length)!;
                onChange(next.value);
                listRef.current
                  ?.querySelector<HTMLButtonElement>(
                    `[role="tab"][data-value="${next.value}"]`,
                  )
                  ?.focus();
              }
        }
        className={cn(
          "h-8 flex-1 rounded-[7px] px-3 text-[13.5px] font-medium whitespace-nowrap",
          active ? "text-ink" : "text-ink-3",
          // Before hydration measures the overlay, the server HTML still shows the selection
          !active &&
            !clip &&
            option.value === value &&
            "bg-white text-ink shadow-[0_0_0_1px_var(--color-line)]",
        )}
      >
        {option.label}
      </button>
    ));

  return (
    <div className={cn("relative rounded-[10px] bg-subtle p-[3px]", className)}>
      <div ref={listRef} role="tablist" aria-label={label} className="flex">
        {items(false)}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex p-[3px] [&>button]:bg-white [&>button]:shadow-[0_0_0_1px_var(--color-line)]",
          animate && "transition-[clip-path] duration-220 ease-in-out",
          !clip && "invisible",
        )}
        style={{ clipPath: clip }}
      >
        {items(true)}
      </div>
    </div>
  );
}
