import { cn } from "@/lib/cn";

export type Status =
  | "charging"
  | "available"
  | "reserved"
  | "faulted"
  | "offline"
  | "unavailable"
  | "pending"
  | "payment-failed";

const styles: Record<
  Status,
  { label: string; dot: string; text: string; bg: string }
> = {
  charging: {
    label: "Charging",
    dot: "bg-charging",
    text: "text-charging",
    bg: "bg-[#eef2fd]",
  },
  available: {
    label: "Available",
    dot: "bg-volt",
    text: "text-volt-ink",
    bg: "bg-[#edf9f1]",
  },
  reserved: {
    label: "Reserved",
    dot: "bg-volt-ink",
    text: "text-volt-ink",
    bg: "bg-subtle",
  },
  faulted: {
    label: "Faulted",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-[#fbf0eb]",
  },
  offline: {
    label: "Offline",
    dot: "bg-ink-3",
    text: "text-ink-2",
    bg: "bg-subtle",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-ink-3",
    text: "text-ink-2",
    bg: "bg-subtle",
  },
  pending: {
    label: "Pending approval",
    dot: "bg-warning",
    text: "text-ink-2",
    bg: "bg-subtle",
  },
  "payment-failed": {
    label: "Payment failed",
    dot: "bg-error",
    text: "text-error",
    bg: "bg-[#fbeeed]",
  },
};

/** Always colour plus a word. */
export function StatusPill({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12.5px] font-medium",
        s.bg,
        s.text,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

/** A charger's pill: approval first (a Pending charger is not on the network yet), then status. */
export function chargerStatus(charger: {
  status: string;
  approval: string;
}): Status {
  if (charger.approval !== "ACCEPTED") return "pending";
  return charger.status.toLowerCase() as Status;
}
