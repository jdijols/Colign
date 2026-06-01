import { NavLink } from "react-router-dom";
import {
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineUserGroup,
  HiOutlineCog,
} from "react-icons/hi";
import { cn } from "@/lib/cn";

interface Props {
  role: "IC" | "MANAGER" | "ADMIN";
}

const ITEM_BASE =
  "flex items-center gap-2.5 px-3 py-2 text-sm border-l-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white";

const ITEM_INACTIVE =
  "border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-50";

const ITEM_ACTIVE =
  "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium";

interface NavRailItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  dataCy: string;
  onNavigate?: () => void;
}

function NavRailItem({ to, icon, label, end, dataCy, onNavigate }: NavRailItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      data-cy={dataCy}
      onClick={onNavigate}
      className={({ isActive }) => cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_INACTIVE)}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/**
 * The four flat sidebar route links. Team is hidden for IC. Each link shows a
 * leading icon + label; active state communicated by a left-edge accent + bg
 * shift (not bold text alone), via NavLink's `isActive` className callback.
 *
 * `onNavigate` fires on any link click and is used by SidebarShell to close
 * the narrow-viewport drawer when a route is picked from inside it.
 */
interface NavRailProps extends Props {
  onNavigate?: () => void;
}

export function NavRail({ role, onNavigate }: NavRailProps) {
  const showTeam = role === "MANAGER" || role === "ADMIN";
  return (
    <nav className="flex flex-col py-2" aria-label="Primary">
      <NavRailItem
        to="."
        end
        dataCy="sidebar-plan"
        onNavigate={onNavigate}
        icon={<HiOutlineCalendar className="h-4 w-4 shrink-0" aria-hidden />}
        label="Plan"
      />
      <NavRailItem
        to="reconcile"
        dataCy="sidebar-reconcile"
        onNavigate={onNavigate}
        icon={<HiOutlineCheckCircle className="h-4 w-4 shrink-0" aria-hidden />}
        label="Reconcile"
      />
      {showTeam ? (
        <NavRailItem
          to="manager"
          dataCy="sidebar-team"
          onNavigate={onNavigate}
          icon={<HiOutlineUserGroup className="h-4 w-4 shrink-0" aria-hidden />}
          label="Team"
        />
      ) : null}
      <NavRailItem
        to="settings"
        dataCy="sidebar-settings"
        onNavigate={onNavigate}
        icon={<HiOutlineCog className="h-4 w-4 shrink-0" aria-hidden />}
        label="Settings"
      />
    </nav>
  );
}
