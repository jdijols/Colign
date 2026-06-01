import { NavLink } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineUserGroup } from "react-icons/hi";
import { cn } from "@/lib/cn";

interface Props {
  role: "IC" | "MANAGER" | "ADMIN";
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Shared tile geometry — every visible block in the sidebar (workspace avatar,
 * nav icon, hover state, user avatar) is the SAME 36×36 (h-9 w-9) rectangle.
 * This eliminates size shift between rest and hover and across collapsed↔
 * expanded toggles. Icons (20px) sit centered inside the tile; avatars
 * (filling 36×36) sit at exactly the same X-position.
 */
const ITEM_BASE_COLLAPSED =
  "relative flex items-center justify-center h-9 w-9 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white";

const ITEM_BASE_EXPANDED =
  "relative flex items-center h-9 mx-1 pl-1.5 pr-2 gap-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white";

const ITEM_INACTIVE =
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-50";

const ITEM_ACTIVE =
  "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium";

/** Linear-style left-edge accent for the active route. */
function ActiveAccent() {
  return (
    <span
      aria-hidden
      className="absolute -left-0.5 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-neutral-900 dark:bg-white"
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
          collapsed ? ITEM_BASE_COLLAPSED : ITEM_BASE_EXPANDED,
          isActive ? ITEM_ACTIVE : ITEM_INACTIVE,
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <ActiveAccent /> : null}
          {/* Icon slot — h-9 w-9 in collapsed, h-9 w-9 in expanded as well so
              the icon's X position is identical across states. */}
          <span className="w-9 h-9 shrink-0 flex items-center justify-center">{icon}</span>
          {collapsed ? null : <span className="text-sm truncate">{label}</span>}
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
    <nav
      className={cn("flex flex-col gap-0.5 py-2", collapsed ? "items-center" : "items-stretch")}
      aria-label="Primary"
    >
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
