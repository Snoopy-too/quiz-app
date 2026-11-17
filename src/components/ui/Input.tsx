import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Accessible single-line text input styled with design tokens. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || rest["aria-invalid"] || undefined}
      className={cn(
        "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-accent-500",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
        invalid && "border-danger-600 focus-visible:ring-danger-600 focus-visible:border-danger-600",
        className,
      )}
      {...rest}
    />
  );
});
