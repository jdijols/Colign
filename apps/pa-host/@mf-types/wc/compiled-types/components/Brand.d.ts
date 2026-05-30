import { type ComponentPropsWithoutRef } from "react";
/**
 * Colign logomark: three left-aligned horizontal bars of decreasing length.
 * Visualizes both the RCDO hierarchy (Rally Cry → Defining Objective → Outcome)
 * and the act of alignment itself. Uses currentColor so it inherits whatever
 * text color the parent sets — works seamlessly in light + dark mode.
 */
export declare function ColignMark({ className, ...props }: ComponentPropsWithoutRef<"svg">): import("react/jsx-runtime").JSX.Element;
interface BrandProps {
    size?: "sm" | "md" | "lg";
    withWordmark?: boolean;
    className?: string;
}
/**
 * Logomark + wordmark combo. Use `withWordmark={false}` when only the mark
 * is needed (favicon-shaped contexts). Sizes follow our type scale.
 */
export declare function ColignBrand({ size, withWordmark, className, }: BrandProps): import("react/jsx-runtime").JSX.Element;
export {};
