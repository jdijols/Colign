import { type ComponentPropsWithoutRef } from "react";

/**
 * Colign logomark: three left-aligned horizontal bars of decreasing length.
 * Visualizes both the RCDO hierarchy (Rally Cry → Defining Objective → Outcome)
 * and the act of alignment itself. Uses currentColor so it inherits whatever
 * text color the parent sets — works seamlessly in light + dark mode.
 */
export function ColignMark({
  className = "h-5 w-5",
  ...props
}: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="13" height="2" rx="1" />
      <rect x="3" y="17" width="8" height="2" rx="1" />
    </svg>
  );
}

interface BrandProps {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}

/**
 * Logomark + wordmark combo. Use `withWordmark={false}` when only the mark
 * is needed (favicon-shaped contexts). Sizes follow our type scale.
 */
export function ColignBrand({
  size = "md",
  withWordmark = true,
  className = "",
}: BrandProps) {
  const gap = size === "sm" ? "gap-1.5" : size === "lg" ? "gap-2.5" : "gap-2";
  const text =
    size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  const mark =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      <ColignMark className={mark} />
      {withWordmark && (
        <span className={`font-semibold tracking-tight ${text}`}>colign</span>
      )}
    </span>
  );
}
