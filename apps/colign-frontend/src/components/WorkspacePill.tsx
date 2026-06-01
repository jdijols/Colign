interface Props {
  name: string;
  avatarUrl: string | null;
}

/**
 * Workspace identity row at the top of the authenticated sidebar. Renders
 * just the team avatar + name — the Colign brand mark is intentionally NOT
 * here when signed in (the brand is the unauthenticated landing's job; the
 * authenticated chrome should foreground the workspace, not the product).
 *
 * Non-interactive in this iteration; a clickable workspace switcher is
 * deferred until the multi-workspace data model exists.
 */
export function WorkspacePill({ name, avatarUrl }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5" title={name} data-cy="sidebar-workspace">
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
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
        {name}
      </span>
    </div>
  );
}
