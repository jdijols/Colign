import { type ReactNode } from "react";
import {
  HiInformationCircle,
  HiCheckCircle,
  HiExclamationCircle,
  HiXCircle,
} from "react-icons/hi";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/tokens";

interface AlertProps {
  tone?: StatusTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const TONES: Record<
  StatusTone,
  { palette: string; Icon: typeof HiInformationCircle }
> = {
  neutral: {
    palette:
      "bg-neutral-50 border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300",
    Icon: HiInformationCircle,
  },
  info: {
    palette:
      "bg-neutral-50 border-neutral-200 text-neutral-700 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300",
    Icon: HiInformationCircle,
  },
  success: {
    palette:
      "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300",
    Icon: HiCheckCircle,
  },
  warning: {
    palette:
      "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300",
    Icon: HiExclamationCircle,
  },
  danger: {
    palette:
      "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300",
    Icon: HiXCircle,
  },
};

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const { palette, Icon } = TONES[tone];
  return (
    <div
      role="alert"
      className={cn("flex gap-2.5 rounded-md border px-3 py-2.5 text-sm", palette, className)}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium leading-tight">{title}</p>}
        {children && (
          <div className={cn(title ? "mt-1 text-xs leading-relaxed" : "")}>{children}</div>
        )}
      </div>
    </div>
  );
}
