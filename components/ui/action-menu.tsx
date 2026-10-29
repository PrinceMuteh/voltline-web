"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface Action {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

/** Room the list needs below its button; with less, it opens upward. */
const LIST_ROOM = 160;

const place = (r: DOMRect, up: boolean) => ({
  top: up ? r.top - 4 : r.bottom + 4,
  right: window.innerWidth - r.right,
  up,
});

/**
 * A row's "…" menu. Rendered in a portal so a scrolling table can't clip it, and it opens
 * upward near the bottom of the window. Grows from its button: 200 ms in.
 */
export function ActionMenu({
  label,
  actions,
}: {
  label: string;
  actions: Action[];
}) {
  const [at, setAt] = useState<{
    top: number;
    right: number;
    up: boolean;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = (focus = true) => {
    setAt(null);
    if (focus) buttonRef.current?.focus();
  };

  const open = at !== null;
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !listRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      )
        setAt(null);
    };
    // Follow the button when the page or the table scrolls
    const onScroll = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (r) setAt((a) => a && place(r, a.up));
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          if (at) return close();
          const r = e.currentTarget.getBoundingClientRect();
          setAt(place(r, window.innerHeight - r.bottom < LIST_ROOM));
        }}
        className="inline-flex size-8 items-center justify-center rounded-control text-ink-2 transition-transform duration-160 ease-out hover:bg-subtle active:scale-[0.95]"
      >
        <span aria-hidden className="text-[16px] leading-none">
          …
        </span>
      </button>
      {at &&
        createPortal(
          <ul
            ref={listRef}
            role="menu"
            aria-label={label}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
              e.preventDefault();
              const items = [
                ...(listRef.current?.querySelectorAll<HTMLElement>(
                  '[role="menuitem"]',
                ) ?? []),
              ];
              const i = items.indexOf(document.activeElement as HTMLElement);
              items
                .at((i + (e.key === "ArrowDown" ? 1 : -1)) % items.length)
                ?.focus();
            }}
            className={cn(
              "fixed z-50 min-w-48 rounded-lg border border-line bg-white p-1 shadow-[0_8px_24px_rgb(0_0_0/0.08)]",
              "transition-[opacity,scale] duration-200 ease-out starting:scale-95 starting:opacity-0",
              at.up
                ? "origin-bottom-right -translate-y-full"
                : "origin-top-right",
            )}
            style={{ top: at.top, right: at.right }}
          >
            {actions.map((a) => (
              <li key={a.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    close(false);
                    a.onSelect();
                  }}
                  className={cn(
                    "flex w-full rounded-md px-2.5 py-1.5 text-left text-[14px] outline-none hover:bg-subtle focus-visible:bg-subtle",
                    a.destructive && "text-error",
                  )}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
