import type { ReactNode } from "react";
import { cn } from "./cn";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Standardized page header replacing duplicated top-bar + body headings. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-line bg-surface", className)}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {breadcrumbs && <div className="mb-2 text-xs text-ink-muted">{breadcrumbs}</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate">{title}</h1>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
