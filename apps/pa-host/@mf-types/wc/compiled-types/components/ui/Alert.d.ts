import { type ReactNode } from "react";
import type { StatusTone } from "@/lib/tokens";
interface AlertProps {
    tone?: StatusTone;
    title?: ReactNode;
    children?: ReactNode;
    className?: string;
}
export declare function Alert({ tone, title, children, className }: AlertProps): import("react/jsx-runtime").JSX.Element;
export {};
