import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-ink-muted border-line",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-emerald-50 text-success-600 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-danger-600 border-red-200",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** Compact status pill styled with semantic tokens. */
export function Badge({ variant = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
