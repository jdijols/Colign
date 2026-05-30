import { type ReactNode, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { cn } from "@/lib/cn";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
}

const WIDTHS: Record<"md" | "lg" | "xl", string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

/**
 * Right-anchored slide-over panel. Plain Tailwind (no Flowbite Drawer) so it
 * inherits the design system tokens. Closes on Escape, click-outside, or the
 * X button. Locks body scroll while open.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "xl",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={typeof title === "string" ? "drawer-title" : undefined}
        className={cn(
          "absolute right-0 top-0 h-full w-full bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-xl",
          WIDTHS[width]
        )}
      >
        {(title || description) && (
          <header className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && (
                <h2
                  id="drawer-title"
                  className="text-base font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight truncate"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <HiX className="h-4 w-4" />
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
