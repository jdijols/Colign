import { useEffect, useState, type ReactNode } from "react";
import { HiOutlineMenu } from "react-icons/hi";
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
 * Authenticated app shell with a left-rail sidebar — modelled on ChatGPT's
 * pattern, adapted for Colign.
 *
 * Desktop (≥768px):
 *   Expanded (default, ~256px):
 *     [workspace avatar + team name] [toggle]
 *     [icon] Plan / Reconcile / Team
 *     [user avatar + name + role badge]   ← click → Settings / Sign out popover
 *
 *   Collapsed (thin rail ~56px, state persisted in localStorage):
 *     [workspace avatar]   ← hover-morphs to a sidebar icon + "Open sidebar"
 *                            tooltip; clicking expands the rail. No separate
 *                            toggle button below it.
 *     [Plan icon / Reconcile icon / Team icon]
 *     [user avatar]   ← click → same popover, anchored wider than the chip
 *
 * Mobile (<768px):
 *   The sidebar is hidden by default. A top strip shows a hamburger and the
 *   workspace name; tapping the hamburger slides the sidebar in as a drawer
 *   overlay with a backdrop. Tap-backdrop / Esc / select-route dismisses.
 *   Body scroll is locked while the drawer is open.
 */
export function SidebarShell({ me, onSignOut, children }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

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

  function toggleDesktopCollapse() {
    setCollapsed((c) => !c);
  }

  // The desktop rail keeps its identity + icons visible at both widths. The
  // toggle's `collapsed` reflects desktop state only.
  const desktopRail = (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 overflow-hidden",
        "border-r border-neutral-200 dark:border-neutral-800",
        // No width transition: animating it makes the labels appear to slide
        // in from behind the right rail edge while overflow-hidden clips them.
        // Tiles already sit at the same X position in both states, so an
        // instant toggle reads as "labels show / hide" rather than "tiles
        // slide back into the scene." Matches the user's "fixed, never moving"
        // requirement.
        collapsed ? "w-14" : "w-60",
      )}
      aria-label="Primary navigation"
      data-cy="sidebar"
      data-collapsed={collapsed ? "true" : "false"}
    >
      {/* Top row:
          Expanded — workspace pill on the left, close-sidebar toggle pinned right.
          Collapsed — workspace tile centered in the rail to align with the nav
            tiles below it (which the NavRail's items-center centers) and the
            user-avatar tile (centered via justify-center). Without this center,
            the top tile sits at the rail's left edge while everything else
            centers, producing the horizontal step the user spotted. */}
      <div
        className={cn(
          "flex items-center border-b border-neutral-200 dark:border-neutral-800 py-1.5",
          // No horizontal padding in expanded — WorkspacePill's own mx-1 + pl-1.5
          // lands the avatar at exactly 10px from the rail edge, which is where
          // NavRail items and UserChip put theirs. `pr-1` gives the toggle a
          // 4px inset from the right edge.
          collapsed ? "justify-center" : "gap-1 pr-1",
        )}
      >
        <WorkspacePill
          name={me.teamName ?? ""}
          avatarUrl={me.teamAvatarUrl ?? null}
          compact={collapsed}
          onToggle={collapsed ? toggleDesktopCollapse : undefined}
        />
        {collapsed ? null : <SidebarToggle collapsed={false} onToggle={toggleDesktopCollapse} />}
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavRail role={me.role} collapsed={collapsed} />
      </div>

      <UserChip
        email={me.email ?? ""}
        role={me.role}
        avatarUrl={null}
        displayName={me.displayName ?? me.email ?? ""}
        onSignOut={onSignOut}
        compact={collapsed}
      />
    </aside>
  );

  // Mobile drawer body — always rendered expanded-style (no compact mode).
  const mobileDrawerBody = (
    <>
      <div className="flex items-center py-1 pr-1 border-b border-neutral-200 dark:border-neutral-800">
        <WorkspacePill name={me.teamName ?? ""} avatarUrl={me.teamAvatarUrl ?? null} />
        <SidebarToggle collapsed={false} onToggle={() => setDrawerOpen(false)} />
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
      {/* Mobile-only top strip */}
      <header className="md:hidden sticky top-0 z-30 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          data-cy="sidebar-hamburger"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
        >
          <HiOutlineMenu className="h-5 w-5" aria-hidden />
        </button>
        {me.teamName ? (
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
            {me.teamName}
          </span>
        ) : null}
      </header>

      {desktopRail}

      {drawerOpen ? (
        <>
          <div
            role="presentation"
            data-cy="sidebar-overlay"
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col"
            aria-label="Primary navigation"
            data-cy="sidebar-drawer"
          >
            {mobileDrawerBody}
          </aside>
        </>
      ) : null}

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
