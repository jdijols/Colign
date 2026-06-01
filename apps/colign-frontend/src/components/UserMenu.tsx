import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface Props {
  email: string;
  role: "IC" | "MANAGER" | "ADMIN";
  avatarUrl: string | null;
  displayName: string;
  onSignOut: () => void;
}

/**
 * Avatar-initial button in the AppShell top-right. Click → popover menu
 * with email/role header + Workspace settings + Sign out. Keyboard
 * accessible: Enter/Space opens, Escape closes, focus returns to trigger.
 * Click-outside closes. No menu library — `aria-haspopup="menu"` +
 * `role="menu"` + `role="menuitem"` are enough for AT.
 */
export function UserMenu({ email, role, avatarUrl, displayName, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
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

  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full overflow-hidden",
          "border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900",
          "text-sm font-medium text-neutral-700 dark:text-neutral-300",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
        )}
        data-cy="user-menu-trigger"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="absolute right-0 mt-2 w-60 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-1 z-40"
        >
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate" title={email}>
              {email}
            </div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
              {role}
            </div>
          </div>
          <Link
            to="settings"
            role="menuitem"
            data-cy="user-menu-settings"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Workspace settings
          </Link>
          <button
            type="button"
            role="menuitem"
            data-cy="user-menu-sign-out"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="block w-full text-left rounded-md px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
