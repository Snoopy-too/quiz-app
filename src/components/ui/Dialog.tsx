import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/**
 * Accessible modal dialog built on the native <dialog> element with showModal(),
 * Escape and backdrop-click handling, busy guard, and focus restoration.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy = false,
  showCloseButton = true,
  size = "md",
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      if (typeof el.showModal === "function") {
        if (!el.open) {
          el.showModal();
        }
      } else {
        el.setAttribute("open", "");
      }
      document.body.style.overflow = "hidden";
    } else {
      if (typeof el.close === "function") {
        if (el.open) {
          el.close();
        }
      } else {
        el.removeAttribute("open");
      }
      document.body.style.overflow = "";
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    }

    return () => {
      document.body.style.overflow = "";
      if (el.open) {
        if (typeof el.close === "function") {
          el.close();
        } else {
          el.removeAttribute("open");
        }
      }
    };
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!open || !el) return;

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === el && !busy) {
        onClose();
      }
    };
    el.addEventListener("click", handleBackdropClick);
    return () => el.removeEventListener("click", handleBackdropClick);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop",
        "backdrop:bg-black/50 backdrop:backdrop-blur-xs open:animate-scaleIn",
        SIZES[size],
        className,
      )}
    >
      <div className="p-6">
        {(title || (showCloseButton && !busy)) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            {title ? (
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {showCloseButton && (
              <IconButton
                aria-label="Close dialog"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            )}
          </div>
        )}

        {description && (
          <p id={descriptionId} className="text-sm text-ink-muted whitespace-pre-line mb-4">
            {description}
          </p>
        )}

        {children}

        {footer && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
