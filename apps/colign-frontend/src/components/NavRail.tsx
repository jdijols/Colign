import { NavLink } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineUserGroup } from "react-icons/hi";
import { cn } from "@/lib/cn";

interface Props {
  role: "IC" | "MANAGER" | "ADMIN";
  /** When true, render icon-only buttons centered in a thin rail. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

// Layout: icon (and label when expanded) sit in a relative container so the
// active-accent bar can pin to the absolute left edge.
const ITEM_BASE =
  "group/item relative flex items-center transition-colors rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white";

const ITEM_INACTIVE =
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-50";

const ITEM_ACTIVE =
  "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium";

const EXPANDED_LAYOUT = "gap-2.5 mx-2 px-2.5 py-1.5 text-sm";
const COLLAPSED_LAYOUT = "mx-2 px-2 py-1.5 justify-center";

/** Linear-style left-edge accent for the active route. */
function ActiveAccent() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-neutral-900 dark:bg-white"
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
      className={({ isActive }) =>
        cn(
          ITEM_BASE,
          collapsed ? COLLAPSED_LAYOUT : EXPANDED_LAYOUT,
          isActive ? ITEM_ACTIVE : ITEM_INACTIVE,
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <ActiveAccent /> : null}
          {icon}
          {collapsed ? null : <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}

/**
 * Sidebar route links. Plan / Reconcile / Team (Team hidden for IC).
 * Settings does NOT live here — it lives in the user-chip popover at the
 * bottom of the sidebar (the convention shared by ChatGPT, Notion, Linear).
 *
 * Two render modes:
 *   - default: icon + label, left-aligned
 *   - collapsed: icon only, centered (for the thin rail)
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
        icon={<HiOutlineCalendar className="h-4 w-4 shrink-0" aria-hidden />}
        label="Plan"
      />
      <NavRailItem
        to="reconcile"
        dataCy="sidebar-reconcile"
        collapsed={collapsed}
        onNavigate={onNavigate}
        icon={<HiOutlineCheckCircle className="h-4 w-4 shrink-0" aria-hidden />}
        label="Reconcile"
      />
      {showTeam ? (
        <NavRailItem
          to="manager"
          dataCy="sidebar-team"
          collapsed={collapsed}
          onNavigate={onNavigate}
          icon={<HiOutlineUserGroup className="h-4 w-4 shrink-0" aria-hidden />}
          label="Team"
        />
      ) : null}
    </nav>
  );
}
