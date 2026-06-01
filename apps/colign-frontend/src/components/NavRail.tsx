import { NavLink } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineUserGroup } from "react-icons/hi";
import { cn } from "@/lib/cn";

interface Props {
  role: "IC" | "MANAGER" | "ADMIN";
  /** When true, render icon-only items (no label). Icon X-position is unchanged. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Sidebar row geometry (shared by NavRail, WorkspacePill, and UserChip):
 *
 *   |←4→|←8→|·····28px slot·····|←gap-2.5→|·label·| → 11 (44px) tall
 *
 * The icon slot is always 28px (w-7 h-7) and always sits at `mx-1 + px-2 = 12px`
 * from the rail edge. Icons (h-5 w-5 / 20px) sit centered inside it; avatars
 * (h-7 w-7 / 28px) fill it exactly. Result: nav icons and avatars share the
 * same X-position across rows AND across collapsed↔expanded — only the label
 * appears or disappears.
 */
const ITEM_BASE =
  "group/item relative flex items-center h-11 mx-1 px-2 gap-2.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white";

const ITEM_INACTIVE =
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-50";

const ITEM_ACTIVE =
  "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium";

/** Linear-style left-edge accent for the active route. */
function ActiveAccent() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-neutral-900 dark:bg-white"
    />
  );
}

interface ItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  dataCy: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavRailItem({ to, icon, label, end, dataCy, collapsed, onNavigate }: ItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      data-cy={dataCy}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_INACTIVE)}
    >
      {({ isActive }) => (
        <>
          {isActive ? <ActiveAccent /> : null}
          <span className="w-7 h-7 shrink-0 flex items-center justify-center">{icon}</span>
          {collapsed ? null : <span className="truncate text-sm">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

/**
 * Sidebar route links. Plan / Reconcile / Team (Team hidden for IC).
 * Settings lives in the user-chip popover, not here.
 */
export function NavRail({ role, collapsed = false, onNavigate }: Props) {
  const showTeam = role === "MANAGER" || role === "ADMIN";
  return (
    <nav className="flex flex-col gap-0.5 py-2" aria-label="Primary">
      <NavRailItem
        to="."
        end
        dataCy="sidebar-plan"
        collapsed={collapsed}
        onNavigate={onNavigate}
        icon={<HiOutlineCalendar className="h-5 w-5" aria-hidden />}
        label="Plan"
      />
      <NavRailItem
        to="reconcile"
        dataCy="sidebar-reconcile"
        collapsed={collapsed}
        onNavigate={onNavigate}
        icon={<HiOutlineCheckCircle className="h-5 w-5" aria-hidden />}
        label="Reconcile"
      />
      {showTeam ? (
        <NavRailItem
          to="manager"
          dataCy="sidebar-team"
          collapsed={collapsed}
          onNavigate={onNavigate}
          icon={<HiOutlineUserGroup className="h-5 w-5" aria-hidden />}
          label="Team"
        />
      ) : null}
    </nav>
  );
}
