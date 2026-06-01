import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { HiOutlineCog, HiOutlineLogout } from "react-icons/hi";
import { usePopover } from "@/lib/usePopover";
import { cn } from "@/lib/cn";

interface Props {
  email: string;
  role: "IC" | "MANAGER" | "ADMIN";
  avatarUrl: string | null;
  displayName: string;
  onSignOut: () => void;
  compact?: boolean;
}

const ROLE_LABEL: Record<Props["role"], string> = {
  IC: "IC",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

const MENU_ITEM_CLASS =
  "flex items-center gap-2.5 w-full px-2.5 py-2 text-sm rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50 focus:outline-none focus-visible:bg-neutral-100 dark:focus-visible:bg-neutral-800";

/**
 * User account chip at the bottom of the sidebar.
 *
 * Shares the 36×36 (h-9 w-9) tile geometry with NavRail and WorkspacePill so
 * every visible block in the sidebar is the same size, at rest and on hover.
 * Click opens a Settings + Sign out popover.
 */
export function UserChip({
  email,
  role,
  avatarUrl,
  displayName,
  onSignOut,
  compact = false,
}: Props) {
  const { open, setOpen, triggerRef, panelRef } = usePopover<HTMLButtonElement, HTMLDivElement>();
  const initial = (displayName || email || "?").charAt(0).toUpperCase();
  const name = displayName || email;

  const avatarTile = (
    <span
      aria-hidden
      className="h-9 w-9 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden ring-1 ring-neutral-200 dark:ring-neutral-700"
    >
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );

  if (compact) {
    return (
      <div className="relative border-t border-neutral-200 dark:border-neutral-800 py-1.5 flex items-center justify-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open account menu"
          title={`${name} · ${ROLE_LABEL[role]}`}
          data-cy="sidebar-user-chip"
          className={cn(
            "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
            "hover:opacity-80 transition-opacity",
          )}
        >
          {avatarTile}
        </button>

        {open ? (
          <CollapsedAccountPopover
            panelRef={panelRef}
            triggerRef={triggerRef}
            name={name}
            email={email}
            roleLabel={ROLE_LABEL[role]}
            onClose={() => setOpen(false)}
            onSignOut={onSignOut}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative border-t border-neutral-200 dark:border-neutral-800 p-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        data-cy="sidebar-user-chip"
        className={cn(
          // Padding: pl-1.5 + container p-1 = 10px from rail edge to avatar —
          // matches WorkspacePill and NavRail in expanded mode.
          "w-full flex items-center text-left h-12 pl-1.5 pr-2 gap-2 rounded-md",
          "hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
        )}
      >
        {avatarTile}
        <span className="flex-1 min-w-0 leading-tight">
          <span
            className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate"
            title={email}
          >
            {name}
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
            {ROLE_LABEL[role]}
          </span>
        </span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account"
          className="absolute bottom-full mb-1 left-2 right-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-1 z-40"
        >
          <Link
            to="settings"
            role="menuitem"
            data-cy="sidebar-settings"
            onClick={() => setOpen(false)}
            className={MENU_ITEM_CLASS}
          >
            <HiOutlineCog className="h-5 w-5 shrink-0" aria-hidden />
            <span>Settings</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            data-cy="sidebar-sign-out"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={MENU_ITEM_CLASS}
          >
            <HiOutlineLogout className="h-5 w-5 shrink-0" aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Compact-mode (collapsed sidebar) account popover.
 *
 * Portaled to `document.body` because the parent `<aside>` carries
 * `overflow-hidden` for sidebar containment; a regular `absolute`-positioned
 * panel gets clipped at the rail's right edge regardless of z-index. Anchored
 * via `position: fixed` to the right of the avatar so the popover opens into
 * the main content area (where there's space) rather than upward inside the
 * rail. Bottom-aligned with the avatar so it visually grows out of the chip.
 */
function CollapsedAccountPopover({
  panelRef,
  triggerRef,
  name,
  email,
  roleLabel,
  onClose,
  onSignOut,
}: {
  panelRef: React.RefObject<HTMLDivElement>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  name: string;
  email: string;
  roleLabel: string;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(null);

  // Compute trigger position before paint so the panel never flashes in the
  // wrong spot. useLayoutEffect runs synchronously after DOM mutations but
  // before the browser paints, which is what we want for popover anchoring.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setCoords({
      // 8px gap from the avatar's right edge, into the main content area.
      left: rect.right + 8,
      // Bottom-aligned to the chip's bottom for a "grow out of the avatar" feel.
      bottom: window.innerHeight - rect.bottom,
    });
  }, [triggerRef]);

  if (coords == null) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Account"
      style={{
        position: "fixed",
        left: coords.left,
        bottom: coords.bottom,
        // z-50 is reserved for modal overlays in this codebase; the sidebar
        // popover lives between toasts (z-40) and modals (z-50), so 45 keeps
        // it above the sidebar's stacking context without competing with a
        // future modal.
        zIndex: 45,
      }}
      className="w-56 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-1"
    >
      <div className="px-2.5 pb-2 pt-1.5 border-b border-neutral-200 dark:border-neutral-800 mb-1">
        <div
          className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate"
          title={email}
        >
          {name}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
          {roleLabel}
        </div>
      </div>
      <Link
        to="settings"
        role="menuitem"
        data-cy="sidebar-settings"
        onClick={onClose}
        className={MENU_ITEM_CLASS}
      >
        <HiOutlineCog className="h-5 w-5 shrink-0" aria-hidden />
        <span>Settings</span>
      </Link>
      <button
        type="button"
        role="menuitem"
        data-cy="sidebar-sign-out"
        onClick={() => {
          onClose();
          onSignOut();
        }}
        className={MENU_ITEM_CLASS}
      >
        <HiOutlineLogout className="h-5 w-5 shrink-0" aria-hidden />
        <span>Sign out</span>
      </button>
    </div>,
    document.body,
  );
}
