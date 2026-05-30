import { type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  hint?: ReactNode;
  required?: boolean;
}

export function Label({ className, children, hint, required, ...props }: LabelProps) {
  return (
    <div className="flex items-baseline justify-between mb-1.5">
      <label
        className={cn(
          "text-xs font-medium text-neutral-700 dark:text-neutral-300",
          className
        )}
        {...props}
      >
        {children}
        {required ? (
          <span className="ml-0.5 text-rose-600 dark:text-rose-400" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</span>
      ) : null}
    </div>
  );
}

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Wrap any form control to get the label / hint / error-text pattern for
 * free. Keeps form rows visually consistent across the app.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  helpText,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {helpText && !error && (
        <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {helpText}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
