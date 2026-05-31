import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/tokens";

interface BadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  size?: "xs" | "sm";
  variant?: "soft" | "solid" | "outline";
  className?: string;
}

const SOFT: Record<StatusTone, string> = {
  neutral:
    "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  info:
    "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-50 dark:text-neutral-900 dark:border-neutral-50",
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  warning:
    "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  danger:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

const OUTLINE: Record<StatusTone, string> = {
  neutral: "border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300",
  info: "border-neutral-900 text-neutral-900 dark:border-neutral-50 dark:text-neutral-50",
  success: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
  warning: "border-amber-400 text-amber-800 dark:border-amber-800 dark:text-amber-400",
  danger: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400",
};

const SOLID: Record<StatusTone, string> = {
  neutral: "bg-neutral-700 text-white border-neutral-700 dark:bg-neutral-300 dark:text-neutral-900 dark:border-neutral-300",
  info: "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white",
  success: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
  warning: "bg-amber-500 text-neutral-900 border-amber-600",
  danger: "bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:border-rose-500",
};

const SIZES: Record<"xs" | "sm", string> = {
  xs: "text-[10px] leading-none px-1.5 py-0.5 rounded",
  sm: "text-xs leading-none px-2 py-1 rounded-md",
};

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  variant = "soft",
  className,
}: BadgeProps) {
  const palette =
    variant === "solid" ? SOLID[tone] : variant === "outline" ? OUTLINE[tone] : SOFT[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium border whitespace-nowrap tracking-tight",
        SIZES[size],
        palette,
        className
      )}
    >
      {children}
    </span>
  );
}
