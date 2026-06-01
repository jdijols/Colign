interface Props {
  name: string;
  avatarUrl: string | null;
  /** When true, renders avatar-only (no name) for the collapsed thin rail. */
  compact?: boolean;
}

/**
 * Workspace identity at the top of the authenticated sidebar.
 *
 * Two modes:
 *   - default — avatar + team name, full-width row
 *   - compact — avatar only, centered (collapsed-rail layout)
 *
 * The Colign brand mark is intentionally NOT here when signed in: the brand
 * is the unauthenticated landing's job; authenticated chrome foregrounds
 * the workspace, not the product. Non-interactive in this iteration; a
 * clickable workspace switcher is deferred until the multi-workspace data
 * model exists.
 */
export function WorkspacePill({ name, avatarUrl, compact = false }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();

  const avatar = (
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

  if (compact) {
    return (
      <div
        className="flex items-center justify-center px-2 py-2"
        title={name}
        data-cy="sidebar-workspace"
      >
        {avatar}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 min-w-0 flex-1"
      title={name}
      data-cy="sidebar-workspace"
    >
      {avatar}
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
        {name}
      </span>
    </div>
  );
}
