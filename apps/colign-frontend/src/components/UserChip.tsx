import { ThemeToggle } from "@/components/ui";
import { usePopover } from "@/lib/usePopover";
import { cn } from "@/lib/cn";

interface Props {
  email: string;
  role: "IC" | "MANAGER" | "ADMIN";
  avatarUrl: string | null;
  displayName: string;
  onSignOut: () => void;
}

const ROLE_LABEL: Record<Props["role"], string> = {
  IC: "IC",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

/**
 * User account chip pinned at the bottom of the sidebar. Click expands a
 * popover anchored above the chip containing exactly two items: theme toggle
 * and sign out. Esc / click-outside dismisses; focus returns to the chip on
 * close (via usePopover).
 */
export function UserChip({ email, role, avatarUrl, displayName, onSignOut }: Props) {
  const { open, setOpen, triggerRef, panelRef } = usePopover<HTMLButtonElement, HTMLDivElement>();
  const initial = (displayName || email || "?").charAt(0).toUpperCase();
  const name = displayName || email;

  return (
    <div className="relative border-t border-neutral-200 dark:border-neutral-800">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        data-cy="sidebar-user-chip"
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-3 text-left",
          "hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
        )}
      >
        <span
          aria-hidden
          className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <span
            className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate"
            title={email}
          >
            {name}
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {ROLE_LABEL[role]}
          </span>
        </span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Account"
          className="absolute left-2 right-2 bottom-full mb-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-1 z-40"
        >
          <div
            role="menuitem"
            className="flex items-center justify-between px-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-300"
          >
            <span>Theme</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            role="menuitem"
            data-cy="sidebar-sign-out"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="block w-full text-left rounded-md px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
