import { ColignMark } from "@/components/Brand";
import { cn } from "@/lib/cn";

interface Props {
  /** Whether the sidebar is currently hidden (collapsed on desktop, drawer-closed on mobile). */
  hidden: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Sidebar-shaped icon: a rounded rectangle with a vertical divider, matching
 * the chrome we want users to recognise as "the sidebar."
 */
function SidebarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

/**
 * Sidebar toggle in the ChatGPT pattern.
 *
 * - When the sidebar is hidden: the toggle shows the Colign logomark by
 *   default; on hover/focus it morphs into a sidebar icon and reveals a
 *   "Open sidebar" tooltip.
 * - When the sidebar is visible: the toggle always shows the sidebar icon
 *   with a "Close sidebar" tooltip on hover/focus.
 *
 * The toggle is always at the same screen position (top-3 left-3) so users
 * never have to hunt for it across state transitions.
 */
export function SidebarToggle({ hidden, onToggle, className }: Props) {
  const label = hidden ? "Open sidebar" : "Close sidebar";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!hidden}
      data-cy="sidebar-toggle"
      className={cn(
        "group relative inline-flex h-9 w-9 items-center justify-center rounded-md",
        "text-neutral-700 dark:text-neutral-300",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
        className,
      )}
    >
      {hidden ? (
        <>
          <ColignMark className="h-4 w-4 group-hover:hidden group-focus-visible:hidden" />
          <SidebarIcon className="h-4 w-4 hidden group-hover:block group-focus-visible:block" />
        </>
      ) : (
        <SidebarIcon className="h-4 w-4" />
      )}

      {/* Hover/focus tooltip — positioned to the right of the toggle */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-neutral-900 dark:bg-neutral-100 px-2 py-1 text-xs font-medium text-white dark:text-neutral-900 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
      >
        {label}
      </span>
    </button>
  );
}
