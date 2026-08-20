"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="label-eyebrow text-ink-70">
          {label}
        </label>
        {hint ? <span className="font-mono text-[0.62rem] text-ink-45">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function TextInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full border border-rule-firm bg-card px-3 text-sm text-ink",
        "placeholder:text-ink-45 focus:border-cerulean focus-visible:outline-none",
        "focus:shadow-[inset_0_-2px_0_0_var(--cerulean)] transition-shadow",
        className,
      )}
      {...props}
    />
  );
});

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex border border-rule-firm bg-card">
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 px-2 py-2.5 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.1em] transition-colors",
              i > 0 && "border-l border-rule-firm",
              active
                ? "bg-ink text-citrus"
                : "text-ink-70 hover:bg-paper-deep",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The chevron is a real element rather than a background data-URI: an inline
 * SVG url() carries literal spaces, which Tailwind splits into broken class
 * names and which silently ate the background colour.
 */
export function SelectInput({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none border border-rule-firm bg-card px-3 pr-9 text-sm text-ink",
          "transition-shadow focus:border-cerulean focus:shadow-[inset_0_-2px_0_0_var(--cerulean)]",
          "disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-ink-45",
          className,
        )}
        {...props}
      />
      <svg
        aria-hidden
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-ink-45"
      >
        <path
          d="M1 1.5 6 6.5 11 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
