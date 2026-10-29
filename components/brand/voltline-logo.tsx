import { cn } from "@/lib/cn";

/** Voltline mark (green square, bolt) and wordmark. Placeholder until the final logo files arrive. */
export function VoltlineLogo({
  className,
  inverted,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#22C55E" />
        <path
          d="M13.2 4.5 7 13.2h4.4l-.9 6.3 6.3-8.9h-4.5l.9-6.1Z"
          fill="#0B0B0C"
        />
      </svg>
      <span
        className={cn(
          "text-[16px] font-semibold tracking-[-0.02em]",
          inverted ? "text-white" : "text-ink",
        )}
      >
        Voltline
      </span>
    </span>
  );
}
