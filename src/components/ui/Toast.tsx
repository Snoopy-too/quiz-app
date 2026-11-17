import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastInput {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastInput, "message" | "variant">> {
  id: string;
  title?: string;
  durationMs: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
}

const NOOP_TOAST: ToastContextValue = {
  toast: () => "",
  success: () => "",
  error: () => "",
  info: () => "",
  warning: () => "",
  dismiss: () => {},
};

const ToastContext = createContext<ToastContextValue>(NOOP_TOAST);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-success-600/30 bg-surface text-ink",
  error: "border-danger-600/40 bg-surface text-ink",
  warning: "border-warning-500/40 bg-surface text-ink",
  info: "border-brand-300 bg-surface text-ink",
};

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  success: "text-success-600",
  error: "text-danger-600",
  warning: "text-warning-500",
  info: "text-brand-600",
};

function ToastBanner({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(item.durationMs);
  const lastTickRef = useRef(0);

  useEffect(() => {
    if (paused) return;
    lastTickRef.current = Date.now();
    const timer = window.setTimeout(() => {
      onDismiss(item.id);
    }, remainingRef.current);

    return () => {
      window.clearTimeout(timer);
      const elapsed = Date.now() - lastTickRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };
  }, [paused, item.id, onDismiss]);

  const IconComponent = VARIANT_ICONS[item.variant];
  const isAssertive = item.variant === "error";

  return (
    <div
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-pop animate-scaleIn",
        VARIANT_STYLES[item.variant],
      )}
    >
      <IconComponent
        className={cn("h-5 w-5 shrink-0 mt-0.5", VARIANT_ICON_COLOR[item.variant])}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        {item.title && <p className="text-sm font-semibold text-ink">{item.title}</p>}
        <p className="text-sm text-ink-muted break-words">{item.message}</p>
      </div>
      <IconButton
        aria-label="Dismiss notification"
        size="sm"
        variant="ghost"
        onClick={() => onDismiss(item.id)}
        className="-mr-1 -mt-1 shrink-0"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/** Provides application-wide accessible toast notifications via useToast(). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next: ToastItem = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant || "info",
      durationMs: input.durationMs ?? 5000,
    };
    setToasts((prev) => [...prev.slice(-3), next]);
    return id;
  }, []);

  const success = useCallback(
    (message: string, title?: string) => toast({ message, title, variant: "success" }),
    [toast],
  );
  const error = useCallback(
    (message: string, title?: string) => toast({ message, title, variant: "error" }),
    [toast],
  );
  const info = useCallback(
    (message: string, title?: string) => toast({ message, title, variant: "info" }),
    [toast],
  );
  const warning = useCallback(
    (message: string, title?: string) => toast({ message, title, variant: "warning" }),
    [toast],
  );

  const contextValue = useMemo(
    () => ({ toast, success, error, info, warning, dismiss }),
    [toast, success, error, info, warning, dismiss],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[10050] flex flex-col gap-2 items-end max-w-[calc(100vw-2rem)]"
      >
        {toasts.map((item) => (
          <ToastBanner key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
