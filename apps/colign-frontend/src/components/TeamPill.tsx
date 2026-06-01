interface Props {
  name: string;
  avatarUrl: string | null;
}

/**
 * Workspace identity in the AppShell header. Renders avatar + name; falls
 * back to a generated initial when no avatarUrl is set. Truncates the name
 * at max 200px with title-attribute tooltip.
 */
export function TeamPill({ name, avatarUrl }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1.5 max-w-[200px]"
      title={name}
    >
      <span
        aria-hidden
        className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          : initial}
      </span>
      <span className="text-sm text-neutral-900 dark:text-neutral-50 truncate">{name}</span>
    </span>
  );
}
