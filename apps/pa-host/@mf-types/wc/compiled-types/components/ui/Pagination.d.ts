interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}
export declare function Pagination({ page, totalPages, onPageChange, className }: PaginationProps): import("react/jsx-runtime").JSX.Element;
export {};
