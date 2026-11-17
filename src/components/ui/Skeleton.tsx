import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-line/70", className)}
      {...rest}
    />
  );
}
