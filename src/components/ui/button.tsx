import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-semibold whitespace-nowrap " +
  "transition-[transform,background-color,color,box-shadow] duration-150 " +
  "disabled:pointer-events-none active:translate-y-px";

const variants: Record<Variant, string> = {
  // Disabled reads as inert grey rather than washed-out magenta, so a waiting
  // button never looks like a broken one.
  primary:
    "bg-magenta text-white shadow-[0_2px_0_0_var(--magenta-deep)] hover:bg-magenta-deep " +
    "hover:shadow-[0_1px_0_0_var(--magenta-deep)] " +
    "disabled:bg-paper-deep disabled:text-ink-45 disabled:shadow-none",
  outline:
    "border border-rule-firm bg-card text-ink hover:border-ink hover:bg-paper-deep disabled:opacity-45",
  ghost: "text-ink-70 hover:bg-paper-deep hover:text-ink disabled:opacity-45",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.72rem] tracking-wide uppercase",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base tracking-wide uppercase",
};

export function Button({
  className,
  variant = "outline",
  size = "md",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
