import { SidebarIcon } from "@/components/SidebarToggle";

interface Props {
  name: string;
  avatarUrl: string | null;
  /** When true, renders avatar-only for the collapsed thin rail. */
  compact?: boolean;
  /**
   * When provided AND `compact` is true, the avatar IS the open-sidebar
   * affordance: hover/focus morphs avatar → sidebar icon, tooltip "Open sidebar",
   * click expands the rail. ChatGPT-style.
   */
  onToggle?: () => void;
}

/**
 * Workspace identity at the top of the authenticated sidebar.
 *
 * Shares the row geometry documented on `NavRail` so the avatar in compact
 * mode sits at the same X-position as the nav icons below it — no horizontal
 * shift between collapsed and expanded states.
 *
 * Three modes:
 *   - default: avatar + team name in a 44px-tall row.
 *   - compact (no onToggle): avatar-only, same row geometry. Non-interactive.
 *   - compact + onToggle: avatar IS the toggle. Hover-morphs to a sidebar icon
 *     with "Open sidebar" tooltip; clicking expands. Same row geometry.
 */
export function WorkspacePill({ name, avatarUrl, compact = false, onToggle }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();

  const avatarVisual = (
    <span
      aria-hidden
      className="h-7 w-7 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-neutral-200 dark:ring-neutral-700"
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
        className="group relative flex items-center justify-start h-11 mx-1 px-2 w-full rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      >
        {/* Slot — same 28px width as NavRail icon slot. The avatar and the morph
            icon both anchor here, so the focal point is rock-steady. */}
        <span className="relative w-7 h-7 shrink-0 flex items-center justify-center">
          {/* Default: avatar — fades on hover/focus */}
          <span className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
            {avatarVisual}
          </span>
          {/* Hover/focus: sidebar icon */}
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-neutral-700 dark:text-neutral-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
          >
            <SidebarIcon className="h-5 w-5" />
          </span>
        </span>
        {/* Tooltip — anchored to the row's right edge */}
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
      <div className="flex items-center h-11 mx-1 px-2" title={name} data-cy="sidebar-workspace">
        <span className="w-7 h-7 shrink-0 flex items-center justify-center">{avatarVisual}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center h-11 mx-1 px-2 gap-2.5 min-w-0 flex-1"
      title={name}
      data-cy="sidebar-workspace"
    >
      <span className="w-7 h-7 shrink-0 flex items-center justify-center">{avatarVisual}</span>
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
        {name}
      </span>
    </div>
  );
}
