import { type HTMLAttributes, type ReactNode } from "react";
interface CardProps extends HTMLAttributes<HTMLDivElement> {
    as?: "div" | "section" | "article";
    variant?: "default" | "muted";
}
export declare function Card({ children, className, as: Tag, variant, ...props }: CardProps & {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardHeader({ children, className, divider, }: {
    children: ReactNode;
    className?: string;
    divider?: boolean;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardTitle({ children, className }: {
    children: ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardBody({ children, className }: {
    children: ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardFooter({ children, className }: {
    children: ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export {};
