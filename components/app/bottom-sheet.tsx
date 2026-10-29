"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ENTER_MS = 500;
const LEAVE_MS = 260;
/** Dismiss when dragged down this far, or flicked faster than this. */
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.11; // px per ms

/**
 * A Vaul-style bottom sheet. It opens in 500 ms on the iOS drawer curve; drag the handle down
 * (or flick it) to close; dragging up meets rubber-band resistance. Escape also closes it.
 */
export function BottomSheet({
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
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ y: number; t: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => {
      setMounted(false);
      setDrag(0);
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!shown) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  if (!mounted) return null;

  const onDown = (e: React.PointerEvent) => {
    start.current = { y: e.clientY, t: performance.now() };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    // Up: resistance grows the further it is pulled
    setDrag(dy > 0 ? dy : -Math.sqrt(-dy) * 3);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const velocity = dy / Math.max(1, performance.now() - start.current.t);
    start.current = null;
    setDragging(false);
    if (dy > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) onClose();
    else setDrag(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-40 mx-auto max-w-[430px]">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 transition-opacity"
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
        className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[20px] bg-white pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.12)] outline-none"
        style={{
          transform: shown
            ? `translateY(${Math.max(drag, -24)}px)`
            : "translateY(100%)",
          transition: dragging
            ? "none"
            : `transform ${shown ? ENTER_MS : LEAVE_MS}ms ${shown ? "var(--ease-drawer)" : "var(--ease-out)"}`,
        }}
      >
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="flex cursor-grab touch-none justify-center pt-2.5 pb-3"
        >
          <span
            aria-hidden
            className="h-1.5 w-10 rounded-full bg-line-strong"
          />
          <button type="button" onClick={onClose} className="sr-only">
            Close
          </button>
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
