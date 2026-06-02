import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Minimal accessible confirm modal. role=dialog, aria-labelledby on title,
 * Escape closes via onCancel. Focus moves to the confirm button on open.
 * Not a true focus trap — swap for Radix Dialog if we ever need scroll-locking
 * or deeply-nested portals. Good enough for v1; spec §11 documents the gap.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onCancel,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* DESIGN.md §6 — modals sit at depth-e3 (the ONE allowed shadow level).
          Body padding uses the lg spacing token; rounded-r-xl matches the
          12px app-shell radius from DESIGN.md §8. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="depth-e3 rounded-r-xl p-lg w-full max-w-md mx-4 dark:bg-neutral-950 dark:border-neutral-800"
      >
        <h2
          id="confirm-title"
          className="font-display text-lg font-medium text-fg dark:text-neutral-50"
        >
          {title}
        </h2>
        <div className="mt-sm text-sm text-fg-soft dark:text-neutral-300">{body}</div>
        <div className="mt-lg flex items-center justify-end gap-xs">
          {/* Cancel = ghost (DESIGN.md §11 — transparent, soft→primary on hover). */}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-r-md px-md py-xs text-sm font-medium text-fg-soft hover:text-fg hover:bg-canvas dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors duration-micro ease-ease"
          >
            {cancelLabel}
          </button>
          {/* Confirm = primary (bg-fg text-canvas) OR semantic destructive.
              destructive button uses --destructive token (not Tailwind rose-*)
              per DESIGN.md §4. */}
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            data-cy="confirm-dialog-confirm"
            data-testid="confirm-dialog-confirm"
            className={
              "rounded-r-md px-md py-xs text-sm font-medium text-white transition-colors duration-micro ease-ease " +
              (destructive
                ? "bg-destructive hover:opacity-90"
                : "bg-fg hover:opacity-90 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
