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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h2
          id="confirm-title"
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-50"
        >
          {title}
        </h2>
        <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{body}</div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            data-cy="confirm-dialog-confirm"
            data-testid="confirm-dialog-confirm"
            className={
              "rounded-lg px-4 py-2 text-sm font-medium text-white " +
              (destructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
