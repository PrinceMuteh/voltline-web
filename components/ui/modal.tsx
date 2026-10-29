"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ENTER_MS = 250;
const LEAVE_MS = 200;

/**
 * Centred modal. Scales from 0.96 with a fading scrim: 250 ms in, 200 ms out.
 * Escape and the scrim close it, and focus returns to the opener.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Mount as soon as it opens; start leaving as soon as it closes (adjusted during render)
  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);

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
    panelRef.current
      ?.querySelector<HTMLElement>("input, select, button")
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  if (!mounted) return null;

  const duration = `${shown ? ENTER_MS : LEAVE_MS}ms`;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-ink/20 transition-opacity"
        style={{ opacity: shown ? 1 : 0, transitionDuration: duration }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-[440px] rounded-xl bg-white p-6 shadow-[0_0_0_1px_var(--color-line),0_24px_64px_rgb(0_0_0/0.12)] transition-[opacity,scale]"
        style={{
          opacity: shown ? 1 : 0,
          scale: shown ? "1" : "0.96",
          transitionDuration: duration,
          transitionTimingFunction: "var(--ease-out)",
        }}
      >
        <h2
          id="modal-title"
          className="text-[18px] font-semibold tracking-[-0.01em]"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[14px] text-ink-2">{description}</p>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
