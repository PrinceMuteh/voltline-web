import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2",
  secondary: "border border-line-strong bg-white text-ink hover:bg-subtle",
  ghost: "text-ink hover:bg-subtle",
  destructive: "bg-error text-white hover:bg-[#9a1e14]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

/**
 * 36 px tall, 9 px corners. Scales to 0.97 on press, before the click lands
 * (160 ms ease-out). Tailwind v4 applies hover: only on devices that can hover.
 */
export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-control px-4 text-[14px] font-medium select-none",
        "transition-[transform,background-color] duration-160 ease-out active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}
