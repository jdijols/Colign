import {
  type HTMLAttributes,
  type TableHTMLAttributes,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export function TableScroller({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-sm border-collapse", className)} {...props} />;
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-neutral-50 dark:bg-neutral-900/70 text-left",
        className
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-neutral-200 dark:divide-neutral-800", className)}
      {...props}
    />
  );
}

interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
}

export function TR({ className, hover = true, ...props }: TRProps) {
  return (
    <tr
      className={cn(
        "bg-white dark:bg-neutral-950 transition-colors",
        hover && "hover:bg-neutral-50 dark:hover:bg-neutral-900",
        className
      )}
      {...props}
    />
  );
}

export function TH({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-[11px] uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle text-neutral-700 dark:text-neutral-300",
        className
      )}
      {...props}
    />
  );
}
