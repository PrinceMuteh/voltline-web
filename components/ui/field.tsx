"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "children"
> {
  label: string;
  hint?: string;
  /** Returns an error in words, or undefined. Runs on blur; the error clears as you type. */
  validate?: (value: string) => string | undefined;
  trailing?: React.ReactNode;
  labelAside?: React.ReactNode;
}

export function Field({
  label,
  hint,
  validate,
  trailing,
  labelAside,
  className,
  onBlur,
  onChange,
  ...input
}: FieldProps) {
  const id = useId();
  const [error, setError] = useState<string>();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          className={cn(
            "h-10 w-full rounded-control border bg-white px-3 text-ink outline-none placeholder:text-ink-3",
            "focus:border-ink-3",
            error ? "border-error" : "border-line-strong",
            trailing ? "pr-16" : undefined,
          )}
          onBlur={(event) => {
            if (validate) setError(validate(event.target.value));
            onBlur?.(event);
          }}
          onChange={(event) => {
            if (error) setError(undefined);
            onChange?.(event);
          }}
          {...input}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {(error || hint) && (
        <p
          id={`${id}-note`}
          className={cn("text-[12.5px]", error ? "text-error" : "text-ink-3")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const validateEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? undefined
    : "Enter an email address like name@company.com.";
