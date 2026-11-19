import type { ReactNode } from "react";
import { cn } from "./cn";

export interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  className?: string;
  containerClassName?: string;
}

/** Standardized page header replacing duplicated top-bar + body headings. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  containerClassName,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-line bg-surface", className)}>
      <div className={cn("mx-auto max-w-7xl px-4 py-5 sm:px-6", containerClassName)}>
        {breadcrumbs && <div className="mb-2 text-xs text-ink-muted">{breadcrumbs}</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {typeof title === "string" ? <h1 className="truncate">{title}</h1> : title}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
