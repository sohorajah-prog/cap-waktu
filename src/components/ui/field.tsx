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

export function SelectInput({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none border border-rule-firm bg-card px-3 pr-9 text-sm text-ink",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22%230c2333%22 stroke-width=%221.5%22><path d=%22M1 1.5 6 6.5 11 1.5%22/></svg>')]",
        "bg-[length:12px_8px] bg-[right_0.85rem_center] bg-no-repeat",
        "focus:border-cerulean focus:shadow-[inset_0_-2px_0_0_var(--cerulean)]",
        className,
      )}
      {...props}
    />
  );
}
