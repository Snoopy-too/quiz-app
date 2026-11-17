import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

/** Accessible loading spinner with optional screen-reader label. */
export function Spinner({ size = "md", label = "Loading", className }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-brand-600", SIZES[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
