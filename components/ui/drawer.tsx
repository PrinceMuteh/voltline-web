"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const ENTER_MS = 450;
const LEAVE_MS = 260;

/**
 * Right-hand drawer. Enters in 450 ms on the iOS drawer curve and leaves in 260 ms;
 * the scrim fades with it. Escape and the scrim close it, and focus returns to the opener.
 */
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Mount as soon as it opens; start leaving as soon as it closes (adjusted during render)
  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);

  // Show on the frame after mounting so the entry transitions; unmount once it has left
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => {
      setMounted(false);
      openerRef.current?.focus();
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!shown) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-ink/20 transition-opacity"
        style={{
          opacity: shown ? 1 : 0,
          transitionDuration: `${shown ? ENTER_MS : LEAVE_MS}ms`,
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-white shadow-[0_0_0_1px_var(--color-line),-16px_0_48px_rgb(0_0_0/0.08)] outline-none",
          "transition-transform",
        )}
        style={{
          transform: shown ? "translateX(0)" : "translateX(100%)",
          transitionDuration: `${shown ? ENTER_MS : LEAVE_MS}ms`,
          transitionTimingFunction: shown
            ? "var(--ease-drawer)"
            : "var(--ease-out)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
