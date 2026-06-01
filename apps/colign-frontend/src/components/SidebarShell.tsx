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
 *     [workspace avatar]
 *     [toggle]
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
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-14" : "w-60",
      )}
      aria-label="Primary navigation"
      data-cy="sidebar"
      data-collapsed={collapsed ? "true" : "false"}
    >
      {/* Top row:
          Expanded — workspace pill left, separate close-sidebar toggle pinned right.
          Collapsed — workspace avatar IS the open-sidebar affordance (hover-morph),
            no separate toggle button below it. */}
      <div
        className={cn(
          "flex items-center border-b border-neutral-200 dark:border-neutral-800",
          collapsed ? "py-1" : "gap-1 px-2 py-2",
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
      <div className="flex items-center gap-1 px-2 py-2 border-b border-neutral-200 dark:border-neutral-800">
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
          <HiOutlineMenu className="h-4 w-4" aria-hidden />
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
