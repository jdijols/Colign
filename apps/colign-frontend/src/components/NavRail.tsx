import { NavLink } from "react-router-dom";
import { HiOutlineCalendar, HiOutlineCheckCircle, HiOutlineUserGroup } from "react-icons/hi";
import { cn } from "@/lib/cn";

interface Props {
  role: "IC" | "MANAGER" | "ADMIN";
  onNavigate?: () => void;
}

const ITEM_BASE =
  "group/item relative flex items-center gap-2.5 mx-2 px-2.5 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white";

const ITEM_INACTIVE =
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-50";

const ITEM_ACTIVE =
  "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium";

/** A subtle left-edge accent bar for the active route — Linear-style rather than a hard border. */
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
  onNavigate?: () => void;
}

function NavRailItem({ to, icon, label, end, dataCy, onNavigate }: ItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      data-cy={dataCy}
      onClick={onNavigate}
      className={({ isActive }) => cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_INACTIVE)}
    >
      {({ isActive }) => (
        <>
          {isActive ? <ActiveAccent /> : null}
          {icon}
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/**
 * Three flat navigation routes in the sidebar: Plan / Reconcile / Team.
 * Team is hidden for IC. Settings is intentionally NOT here — it lives in
 * the user-chip popover at the bottom of the sidebar, the convention shared
 * by ChatGPT, Notion, Linear, and GitHub.
 */
export function NavRail({ role, onNavigate }: Props) {
  const showTeam = role === "MANAGER" || role === "ADMIN";
  return (
    <nav className="flex flex-col gap-0.5 py-2" aria-label="Primary">
      <NavRailItem
        to="."
        end
        dataCy="sidebar-plan"
        onNavigate={onNavigate}
        icon={<HiOutlineCalendar className="h-4 w-4" aria-hidden />}
        label="Plan"
      />
      <NavRailItem
        to="reconcile"
        dataCy="sidebar-reconcile"
        onNavigate={onNavigate}
        icon={<HiOutlineCheckCircle className="h-4 w-4" aria-hidden />}
        label="Reconcile"
      />
      {showTeam ? (
        <NavRailItem
          to="manager"
          dataCy="sidebar-team"
          onNavigate={onNavigate}
          icon={<HiOutlineUserGroup className="h-4 w-4" aria-hidden />}
          label="Team"
        />
      ) : null}
    </nav>
  );
}
