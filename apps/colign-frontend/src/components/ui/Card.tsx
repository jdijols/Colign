import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  variant?: "default" | "muted";
}

export function Card({ children, className, as: Tag = "div", variant = "default", ...props }: CardProps & { children: ReactNode }) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-neutral-200 dark:border-neutral-800",
        variant === "default" ? "bg-white dark:bg-neutral-900" : "bg-neutral-50 dark:bg-neutral-900/50",
        className
      )}
      {...(props as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  children,
  className,
  divider = true,
}: {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-5 py-3.5 flex items-center justify-between gap-3",
        divider && "border-b border-neutral-200 dark:border-neutral-800",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-sm font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight", className)}>
      {children}
    </h2>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
