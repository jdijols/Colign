import { type ReactNode, useEffect, useRef } from "react";
import { HiX, HiArrowLeft } from "react-icons/hi";
import { cn } from "@/lib/cn";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
  /**
   * Visual affordance for the close action. `"x"` (default) renders an X icon
   * with `aria-label="Close"`. `"back"` renders a left-pointing arrow with
   * `aria-label="Back to team list"` — used by IcDrillDrawer in its full-screen
   * mode on touch+narrow viewports (spec §5.1).
   */
  closeAffordance?: "x" | "back";
}

const WIDTHS: Record<"md" | "lg" | "xl", string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-anchored slide-over panel. Plain Tailwind (no Flowbite Drawer) so it
 * inherits the design system tokens. Closes on Escape, click-outside, or the
 * X button. Locks body scroll while open.
 *
 * Accessibility:
 *   - Scrim is a non-focusable <div aria-hidden> with click handler (not a
 *     full-viewport <button> that screen readers would announce).
 *   - Focus moves into the panel on open (first focusable, else close button).
 *   - Tab/Shift-Tab cycle is trapped inside the panel while open.
 *   - Focus restores to the previously-focused element on close.
 *   - Close button is 44×44 (meets WCAG 2.5.5 AAA Target Size Enhanced).
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "xl",
  closeAffordance = "x",
}: DrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember what had focus before so we can restore it on close.
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the panel: first focusable child, or fall back to close.
    queueMicrotask(() => {
      const first =
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? closeBtnRef.current)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Focus trap: keep tab order inside the panel.
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Restore focus to what had it before open.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim — non-focusable, click closes. Screen readers ignore it. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity"
      />
      {/* Panel */}
      <aside
        ref={panelRef}
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
                <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {description}
                </p>
              )}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label={closeAffordance === "back" ? "Back to team list" : "Close"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
            >
              {closeAffordance === "back" ? (
                <HiArrowLeft className="h-5 w-5" />
              ) : (
                <HiX className="h-4 w-4" />
              )}
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
