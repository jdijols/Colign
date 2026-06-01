import { SidebarIcon } from "@/components/SidebarToggle";

interface Props {
  name: string;
  avatarUrl: string | null;
  /** When true, renders avatar-only for the collapsed thin rail. */
  compact?: boolean;
  /**
   * When provided AND `compact` is true, the avatar itself becomes a toggle:
   * default state shows the team avatar; on hover/focus it morphs to a
   * sidebar icon with an "Open sidebar" tooltip. ChatGPT-style.
   */
  onToggle?: () => void;
}

/**
 * Workspace identity at the top of the authenticated sidebar.
 *
 * Three modes:
 *   - default — avatar + team name row.
 *   - compact (no onToggle) — avatar only, centered. Non-interactive.
 *   - compact + onToggle — avatar IS the open-sidebar affordance; hover
 *     morphs avatar → sidebar icon, tooltip "Open sidebar", click expands.
 *
 * The Colign brand mark is intentionally NOT here when signed in.
 */
export function WorkspacePill({ name, avatarUrl, compact = false, onToggle }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();

  // Shared avatar element — used identically in all three modes.
  const avatarVisual = (
    <span
      aria-hidden
      className="h-8 w-8 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-neutral-200 dark:ring-neutral-700"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );

  if (compact && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Open sidebar"
        aria-expanded={false}
        title={name}
        data-cy="sidebar-workspace"
        data-toggle="open"
        className="group relative flex items-center justify-center px-2 py-2 w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      >
        {/* Avatar — default state, fades out on hover/focus */}
        <span className="transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {avatarVisual}
        </span>
        {/* Sidebar icon — appears on hover/focus, centered over the avatar */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-neutral-700 dark:text-neutral-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
        >
          <SidebarIcon className="h-4 w-4" />
        </span>
        {/* Tooltip — only visible on hover/focus */}
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-neutral-900 dark:bg-neutral-100 px-2 py-1 text-xs font-medium text-white dark:text-neutral-900 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-10"
        >
          Open sidebar
        </span>
      </button>
    );
  }

  if (compact) {
    return (
      <div
        className="flex items-center justify-center px-2 py-2"
        title={name}
        data-cy="sidebar-workspace"
      >
        {avatarVisual}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 min-w-0 flex-1"
      title={name}
      data-cy="sidebar-workspace"
    >
      {avatarVisual}
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
        {name}
      </span>
    </div>
  );
}
