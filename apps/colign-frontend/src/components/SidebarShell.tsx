import { useEffect, useState, type ReactNode } from "react";
import { WorkspacePill } from "@/components/WorkspacePill";
import { NavRail } from "@/components/NavRail";
import { UserChip } from "@/components/UserChip";
import { SidebarToggle } from "@/components/SidebarToggle";
import { cn } from "@/lib/cn";

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

const COLLAPSED_STORAGE_KEY = "colign_sidebar_collapsed";

/**
 * Authenticated app shell with a left-rail sidebar.
 *
 * Desktop (≥768px):
 *   - Expanded (default): sidebar visible at 240px; toggle at top-left inside
 *     the rail's top padding shows the sidebar-close icon.
 *   - Collapsed: sidebar width animates to 0; the floating toggle remains at
 *     top-left, showing the Colign logomark by default and morphing to a
 *     sidebar-open icon on hover with an "Open sidebar" tooltip.
 *   - Collapse state persists in localStorage so the user's preference sticks
 *     across reloads.
 *
 * Mobile (<768px):
 *   - The toggle lives in the same top-left position. Tapping it opens the
 *     sidebar as a drawer overlay with a backdrop; tapping the backdrop, Esc,
 *     or selecting any nav link dismisses it. Body scroll is locked while
 *     the drawer is open so iOS doesn't scroll content out from under.
 *
 * The toggle is a single fixed element — it never moves. Users always know
 * exactly where to find the sidebar control.
 */
export function SidebarShell({ me, onSignOut, children }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Persist desktop collapse preference.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Drawer side-effects: body scroll lock + Esc to close.
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

  // The toggle does different things based on viewport: collapse on desktop,
  // drawer on mobile. Resolved at click time so a resize doesn't need a
  // re-render to behave correctly.
  function handleToggle() {
    const isDesktop =
      typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) {
      setCollapsed((c) => !c);
    } else {
      setDrawerOpen((o) => !o);
    }
  }

  // For the toggle's visual state: "hidden" means the user can't currently
  // see the sidebar contents (desktop-collapsed OR mobile-drawer-closed).
  // We render the toggle twice — once per viewport — so each can read its
  // own correct state without JS viewport detection at render time.

  const sidebarBody = (
    <>
      <div className="pt-12">
        <WorkspacePill name={me.teamName ?? ""} avatarUrl={me.teamAvatarUrl ?? null} />
      </div>
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
    <div className="min-h-screen flex bg-white dark:bg-neutral-950">
      {/* Desktop toggle — pinned top-left, state reflects `collapsed` */}
      <SidebarToggle
        hidden={collapsed}
        onToggle={handleToggle}
        className="hidden md:inline-flex fixed top-3 left-3 z-50"
      />
      {/* Mobile toggle — pinned top-left, state reflects drawer-closed */}
      <SidebarToggle
        hidden={!drawerOpen}
        onToggle={handleToggle}
        className="md:hidden fixed top-3 left-3 z-50"
      />

      {/* Desktop sidebar — width animates between 0 and 240px */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 overflow-hidden",
          "border-r border-neutral-200 dark:border-neutral-800",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-0 border-r-0" : "w-60",
        )}
        aria-label="Primary navigation"
        aria-hidden={collapsed}
        data-cy="sidebar"
      >
        {/* Inner wrapper holds the fixed-width content so the outer animates cleanly */}
        <div className="w-60 flex flex-col h-full">{sidebarBody}</div>
      </aside>

      {/* Mobile drawer — rendered only when open, overlays content */}
      {drawerOpen ? (
        <>
          <div
            role="presentation"
            data-cy="sidebar-overlay"
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-40 w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col"
            aria-label="Primary navigation"
            data-cy="sidebar-drawer"
          >
            <div className="w-full flex flex-col h-full">{sidebarBody}</div>
          </aside>
        </>
      ) : null}

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
