import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
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
          <span className="ml-0.5 text-rose-700 dark:text-rose-400" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <span className="text-[11px] text-neutral-600 dark:text-neutral-400">{hint}</span>
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
 *
 * a11y: helpText and error get stable IDs (derived from htmlFor when set,
 * otherwise from {@code useId()}) and are wired into the child control via
 * {@code aria-describedby} so screen readers announce them when the control
 * receives focus. An error also sets {@code aria-invalid="true"} on the
 * child. Existing aria-describedby on the child is preserved and prepended.
 *
 * If children is anything other than a single React element (a fragment,
 * multiple siblings, or a raw string) the wiring is silently skipped — the
 * visible text still renders, but the consumer has to apply aria-describedby
 * themselves. In practice every form control in colign is a single Input /
 * Textarea / Select / div so this is fine.
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
  const reactId = useId();
  const baseId = htmlFor ?? `field-${reactId}`;
  const helpId = `${baseId}-help`;
  const errorId = `${baseId}-error`;
  const describedBy = [
    helpText && !error ? helpId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  const enrichedChildren = enrichChild(children, {
    describedBy: describedBy || undefined,
    invalid: error ? true : undefined,
  });

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required} hint={hint}>
          {label}
        </Label>
      )}
      {enrichedChildren}
      {helpText && !error && (
        <p
          id={helpId}
          className="mt-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed"
        >
          {helpText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type AriaAware = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * Inject aria-describedby / aria-invalid into a single React-element child,
 * preserving any caller-set value. Returns the child unchanged when it's not
 * a single valid element (Field already documents this limitation).
 */
function enrichChild(
  children: ReactNode,
  { describedBy, invalid }: { describedBy: string | undefined; invalid: true | undefined },
): ReactNode {
  if (!describedBy && !invalid) return children;
  const onlyChild = Children.toArray(children).filter(isValidElement);
  if (onlyChild.length !== 1) return children;

  const child = onlyChild[0] as ReactElement<AriaAware>;
  const merged: AriaAware = {};
  if (describedBy) {
    const existing = child.props["aria-describedby"];
    merged["aria-describedby"] = existing ? `${existing} ${describedBy}` : describedBy;
  }
  if (invalid !== undefined && child.props["aria-invalid"] === undefined) {
    merged["aria-invalid"] = true;
  }
  return cloneElement(child, merged);
}
