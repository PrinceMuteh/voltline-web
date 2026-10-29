"use client";

import { cn } from "@/lib/cn";

/** An on/off control with its label and an optional hint, as in the Tariffs editor. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <span>
        <span className="block text-[14.5px] font-medium">{label}</span>
        {hint && <span className="block text-[13px] text-ink-3">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-160 ease-out disabled:opacity-50",
          checked ? "bg-ink" : "bg-line-strong",
        )}
      >
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-160 ease-out"
          style={{ transform: checked ? "translateX(16px)" : "none" }}
        />
      </button>
    </label>
  );
}
