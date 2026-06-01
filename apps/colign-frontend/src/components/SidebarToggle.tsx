import { cn } from "@/lib/cn";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Sidebar-shaped icon (rounded rectangle with a vertical divider near the
 * left), mirroring the chrome users recognise as "the sidebar." Exported so
 * the workspace-pill hover-morph affordance can reuse the same glyph.
 */
export function SidebarIcon({ className }: { className?: string }) {
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
 * Open/close-sidebar toggle. Same visual at both states — only the tooltip
 * (and aria-label) flip. Matches ChatGPT's pattern: a quiet sidebar icon
 * that surfaces its purpose via a hover/focus tooltip.
 */
export function SidebarToggle({ collapsed, onToggle, className }: Props) {
  const label = collapsed ? "Open sidebar" : "Close sidebar";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      data-cy="sidebar-toggle"
      className={cn(
        "group relative inline-flex h-9 w-9 items-center justify-center rounded-md shrink-0",
        "text-neutral-500 dark:text-neutral-400",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50",
        "transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
        className,
      )}
    >
      <SidebarIcon className="h-5 w-5" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-neutral-900 dark:bg-neutral-100 px-2 py-1 text-xs font-medium text-white dark:text-neutral-900 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-10"
      >
        {label}
      </span>
    </button>
  );
}
