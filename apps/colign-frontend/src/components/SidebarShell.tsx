import type { ReactNode } from "react";
import { WorkspacePill } from "@/components/WorkspacePill";
import { NavRail } from "@/components/NavRail";
import { UserChip } from "@/components/UserChip";

export interface SidebarMe {
  teamName?: string;
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
 * Layout (≥768px):
 *
 *   ┌──────────────┬────────────────────────┐
 *   │ WorkspacePill │                        │
 *   │  + brand     │                        │
 *   │              │   children (page)      │
 *   │   NavRail    │                        │
 *   │              │                        │
 *   │   UserChip   │                        │
 *   └──────────────┴────────────────────────┘
 *
 * Narrow-viewport drawer collapse (<768px) is added in U3.
 */
export function SidebarShell({ me, onSignOut, children }: Props) {
  return (
    <div className="min-h-screen flex bg-white dark:bg-neutral-950">
      <aside
        className="w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-screen sticky top-0"
        aria-label="Primary navigation"
        data-cy="sidebar"
      >
        <WorkspacePill name={me.teamName ?? ""} avatarUrl={me.teamAvatarUrl ?? null} />
        <div className="flex-1 overflow-y-auto">
          <NavRail role={me.role} />
        </div>
        <UserChip
          email={me.email ?? ""}
          role={me.role}
          avatarUrl={null}
          displayName={me.displayName ?? me.email ?? ""}
          onSignOut={onSignOut}
        />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
