import { cn } from "@/lib/cn";
import type { Schemas } from "@/lib/api/client";

type SessionStatus = Schemas["SessionRowDto"]["status"];

const styles: Record<
  SessionStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  ACTIVE: {
    label: "Active",
    dot: "bg-charging",
    text: "text-charging",
    bg: "bg-[#eef2fd]",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-volt",
    text: "text-volt-ink",
    bg: "bg-[#edf9f1]",
  },
  STOPPED_BY_FAULT: {
    label: "Stopped by fault",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-[#fbf0eb]",
  },
  PAYMENT_FAILED: {
    label: "Payment failed",
    dot: "bg-error",
    text: "text-error",
    bg: "bg-[#fbeeed]",
  },
  REFUNDED: {
    label: "Refunded",
    dot: "bg-ink-3",
    text: "text-ink-2",
    bg: "bg-subtle",
  },
};

/** Session status: colour plus a word, like the charger pills. */
export function SessionStatusPill({ status }: { status: SessionStatus }) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12.5px] font-medium whitespace-nowrap",
        s.bg,
        s.text,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
