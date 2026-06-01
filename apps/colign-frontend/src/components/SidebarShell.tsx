import { useEffect, useState, type ReactNode } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { ColignBrand } from "@/components/Brand";
import { TeamPill } from "@/components/TeamPill";
import { WorkspacePill } from "@/components/WorkspacePill";
import { NavRail } from "@/components/NavRail";
import { UserChip } from "@/components/UserChip";

export interface SidebarMe {
  /** Team name. Null until the user is on a team (OnboardingGate prevents that path from reaching here in practice). */
  teamName?: string | null;
  teamAvatarUrl?: string | null;
  displayName?: string;
  email?: string;
  role: "IC" | "MANAGER" | "ADMIN";
}

interface Props {
  me: SidebarMe;
  onSignOut: () => void;
  children: ReactNode;
}

/**
 * Authenticated app shell with a left-rail sidebar.
 *
 * ≥768px (md and up):
 *   ┌──────────────┬────────────────────────┐
 *   │ WorkspacePill │                        │
 *   │              │                        │
 *   │   NavRail    │   children (page)      │
 *   │              │                        │
 *   │   UserChip   │                        │
 *   └──────────────┴────────────────────────┘
 *
 * <768px:
 *   - Top strip with hamburger + compact workspace identity.
 *   - Tapping the hamburger slides the full sidebar in as an overlay drawer.
 *   - Esc, overlay tap, or selecting any route closes the drawer.
 *   - Body scroll is locked while the drawer is open so iOS doesn't scroll
 *     the underlying page out from under the user.
 */
export function SidebarShell({ me, onSignOut, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const sidebarBody = (
    <>
      <WorkspacePill name={me.teamName ?? ""} avatarUrl={me.teamAvatarUrl ?? null} />
      <div className="flex-1 overflow-y-auto">
        <NavRail role={me.role} onNavigate={() => setDrawerOpen(false)} />
      </div>
      <UserChip
        email={me.email ?? ""}
        role={me.role}
        avatarUrl={null}
        displayName={me.displayName ?? me.email ?? ""}
        onSignOut={onSignOut}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Narrow-viewport top strip — hidden on md+ */}
      <header className="md:hidden sticky top-0 z-30 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          data-cy="sidebar-hamburger"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
        >
          <HiOutlineMenu className="h-4 w-4" aria-hidden />
        </button>
        <div className="text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="sm" />
        </div>
        {me.teamName ? (
          <div className="min-w-0 flex-1">
            <TeamPill name={me.teamName} avatarUrl={me.teamAvatarUrl ?? null} />
          </div>
        ) : null}
      </header>

      <div className="md:flex">
        {/* Desktop rail — hidden below md */}
        <aside
          className="hidden md:flex w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex-col h-screen sticky top-0"
          aria-label="Primary navigation"
          data-cy="sidebar"
        >
          {sidebarBody}
        </aside>

        {/* Narrow-viewport drawer — rendered only when open */}
        {drawerOpen ? (
          <>
            <div
              role="presentation"
              data-cy="sidebar-overlay"
              onClick={() => setDrawerOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40"
            />
            <aside
              className="md:hidden fixed inset-y-0 left-0 z-50 w-60 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col"
              aria-label="Primary navigation"
              data-cy="sidebar-drawer"
            >
              <div className="flex items-center justify-end px-2 py-2 border-b border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                  data-cy="sidebar-drawer-close"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                >
                  <HiOutlineX className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {sidebarBody}
            </aside>
          </>
        ) : null}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
