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
  /** When true, render avatar-only (no name + role row) for the thin collapsed rail. */
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
 * Click expands a popover anchored above the chip containing exactly two
 * items: Settings (link to /settings) and Sign out. Theme is NOT here — it
 * lives inside Settings under Appearance.
 *
 * Two render modes:
 *   - default — avatar + name + role badge, full-width row
 *   - compact — avatar only, centered. The popover still opens above.
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

  const avatar = (
    <span
      aria-hidden
      className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-neutral-200 dark:ring-neutral-700"
    >
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );

  return (
    <div className="relative border-t border-neutral-200 dark:border-neutral-800">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        title={compact ? `${name} · ${ROLE_LABEL[role]}` : undefined}
        data-cy="sidebar-user-chip"
        className={cn(
          "w-full flex items-center text-left",
          "hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
          compact ? "justify-center px-2 py-2" : "gap-2.5 px-3 py-2.5",
        )}
      >
        {avatar}
        {compact ? null : (
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
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account"
          className={cn(
            "absolute bottom-full mb-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-1 z-40",
            // In compact mode the panel is wider than the chip; anchor to a
            // sensible width and pin to the left edge with a small margin.
            compact ? "left-2 w-56" : "left-2 right-2",
          )}
        >
          {compact ? (
            <div className="px-2.5 pb-2 pt-1.5 border-b border-neutral-200 dark:border-neutral-800 mb-1">
              <div
                className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate"
                title={email}
              >
                {name}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
                {ROLE_LABEL[role]}
              </div>
            </div>
          ) : null}
          <Link
            to="settings"
            role="menuitem"
            data-cy="sidebar-settings"
            onClick={() => setOpen(false)}
            className={MENU_ITEM_CLASS}
          >
            <HiOutlineCog className="h-4 w-4 shrink-0" aria-hidden />
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
            <HiOutlineLogout className="h-4 w-4 shrink-0" aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
