import type { ReactNode } from "react";
import { cn } from "./cn";
import { Button, type ButtonProps } from "./Button";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
  icon?: ReactNode;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/** Empty-list placeholder with clear guidance and optional primary/secondary actions. */
export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-line bg-surface p-8 sm:p-12 text-center shadow-card",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <Button variant={primaryAction.variant || "primary"} onClick={primaryAction.onClick}>
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant={secondaryAction.variant || "secondary"} onClick={secondaryAction.onClick}>
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
