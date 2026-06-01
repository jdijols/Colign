import { SidebarIcon } from "@/components/SidebarToggle";

interface Props {
  name: string;
  avatarUrl: string | null;
  compact?: boolean;
  onToggle?: () => void;
}

/**
 * Workspace identity at the top of the authenticated sidebar.
 *
 * Shared 36×36 (h-9 w-9) tile geometry — same as nav icons, hover bg, and
 * user avatar. No visual size shift between rest and hover, and the focal
 * point holds steady across collapsed↔expanded toggles.
 *
 * Three modes:
 *   - default: 36×36 avatar + team name in an h-9 row.
 *   - compact (no onToggle): 36×36 avatar centered in the rail. Non-interactive.
 *   - compact + onToggle: 36×36 button whose content morphs avatar → sidebar
 *     icon on hover/focus, with "Open sidebar" tooltip. Same exact dimensions
 *     at rest and on hover.
 */
export function WorkspacePill({ name, avatarUrl, compact = false, onToggle }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();

  // The avatar visual is the tile — same 36×36 dimensions as every other
  // visible block in the sidebar. Filled bg so the rectangle is present at
  // rest (matches the hover-state bg color on nav items: same tile, same hue).
  const avatarTile = (
    <span
      aria-hidden
      className="h-9 w-9 shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-800 text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden ring-1 ring-neutral-200 dark:ring-neutral-700"
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
        className="group relative h-9 w-9 rounded-md bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
      >
        {/* Resting state: the initial. Fades on hover/focus. */}
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover rounded-md" />
          ) : (
            initial
          )}
        </span>
        {/* Hover/focus state: the sidebar icon — same 36×36 button, no size shift. */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
        >
          <SidebarIcon className="h-5 w-5" />
        </span>
        {/* Tooltip — appears on hover/focus, anchored to the right of the tile. */}
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
      <div className="flex items-center justify-center" data-cy="sidebar-workspace" title={name}>
        {avatarTile}
      </div>
    );
  }

  return (
    <div
      className="flex items-center h-9 mx-1 pl-1.5 pr-2 gap-2 min-w-0 flex-1"
      title={name}
      data-cy="sidebar-workspace"
    >
      {avatarTile}
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
        {name}
      </span>
    </div>
  );
}
