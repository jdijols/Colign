import { type ReactNode } from "react";
import type { StatusTone } from "@/lib/tokens";
interface BadgeProps {
    children: ReactNode;
    tone?: StatusTone;
    size?: "xs" | "sm";
    variant?: "soft" | "solid" | "outline";
    className?: string;
}
export declare function Badge({ children, tone, size, variant, className, }: BadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
