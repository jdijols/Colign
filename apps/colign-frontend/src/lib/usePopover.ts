import { useEffect, useRef, useState } from "react";

/**
 * Reusable popover / menu behavior: `open` state plus Esc-to-close,
 * mousedown-outside-to-close, and focus return to the trigger on close.
 *
 * Pattern extracted from the original UserMenu so the new sidebar's
 * UserChip (and any future popover in this app) shares the same a11y
 * baseline without duplicating the keyboard + focus handling.
 *
 * Usage:
 *   const { open, setOpen, triggerRef, panelRef } = usePopover();
 *   <button ref={triggerRef} onClick={() => setOpen(o => !o)}>…</button>
 *   {open && <div ref={panelRef} role="menu">…</div>}
 */
export function usePopover<
  T extends HTMLElement = HTMLButtonElement,
  P extends HTMLElement = HTMLDivElement,
>() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<P>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return { open, setOpen, triggerRef, panelRef };
}
