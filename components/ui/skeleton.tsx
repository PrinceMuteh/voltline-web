import { cn } from "@/lib/cn";

/** Holds the layout so nothing jumps. Opacity pulse only, no shimmer. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse-quiet rounded-md bg-subtle", className)}
    />
  );
}
