import { type LabelHTMLAttributes, type ReactNode } from "react";
interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    hint?: ReactNode;
    required?: boolean;
}
export declare function Label({ className, children, hint, required, ...props }: LabelProps): import("react/jsx-runtime").JSX.Element;
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
export declare function Field({ label, htmlFor, required, hint, helpText, error, children, className, }: FieldProps): import("react/jsx-runtime").JSX.Element;
export {};
