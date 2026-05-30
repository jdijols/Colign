import { type ReactNode } from "react";
interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    width?: "md" | "lg" | "xl";
}
/**
 * Right-anchored slide-over panel. Plain Tailwind (no Flowbite Drawer) so it
 * inherits the design system tokens. Closes on Escape, click-outside, or the
 * X button. Locks body scroll while open.
 */
export declare function Drawer({ open, onClose, title, description, children, footer, width, }: DrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
