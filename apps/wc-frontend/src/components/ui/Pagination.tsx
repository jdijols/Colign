import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { Button } from "./Button";

interface PaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          leftIcon={<HiChevronLeft className="h-3.5 w-3.5" />}
        >
          Prev
        </Button>
        <span className="px-2 text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
          {page + 1} / {totalPages || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          rightIcon={<HiChevronRight className="h-3.5 w-3.5" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
