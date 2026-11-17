import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "./cn";

export interface FieldRenderProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  invalid?: boolean;
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactElement | ((props: FieldRenderProps) => ReactNode);
}

/** Accessible form field wrapper linking label, control, hint, and error message. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedByParts: string[] = [];
  if (hint) describedByParts.push(hintId);
  if (error) describedByParts.push(errorId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined;
  const hasError = Boolean(error);

  const renderControl = () => {
    if (typeof children === "function") {
      return children({
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": hasError || undefined,
        invalid: hasError,
      });
    }

    if (isValidElement(children)) {
      const existingProps = children.props as Record<string, unknown>;
      const mergedDescribedBy = [existingProps["aria-describedby"], describedBy]
        .filter(Boolean)
        .join(" ");

      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (existingProps.id as string | undefined) || fieldId,
        "aria-describedby": mergedDescribedBy || undefined,
        "aria-invalid": hasError || (existingProps["aria-invalid"] as boolean | undefined) || undefined,
        invalid: hasError || (existingProps.invalid as boolean | undefined) || undefined,
      });
    }

    return children;
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {renderControl()}

      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
