import { type HTMLAttributes, type TableHTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from "react";
export declare function TableScroller({ className, children, }: {
    className?: string;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>): import("react/jsx-runtime").JSX.Element;
export declare function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>): import("react/jsx-runtime").JSX.Element;
export declare function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>): import("react/jsx-runtime").JSX.Element;
interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
    hover?: boolean;
}
export declare function TR({ className, hover, ...props }: TRProps): import("react/jsx-runtime").JSX.Element;
export declare function TH({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>): import("react/jsx-runtime").JSX.Element;
export declare function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): import("react/jsx-runtime").JSX.Element;
export {};
