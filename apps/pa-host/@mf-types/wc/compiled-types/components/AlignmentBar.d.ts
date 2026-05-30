import type { AlignmentSummary } from "@/api/types";
interface AlignmentBarProps {
    alignment: AlignmentSummary;
    size?: "sm" | "md";
}
export declare function AlignmentBar({ alignment, size }: AlignmentBarProps): import("react/jsx-runtime").JSX.Element;
export {};
