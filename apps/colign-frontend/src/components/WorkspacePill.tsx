import { ColignBrand } from "@/components/Brand";
import { TeamPill } from "@/components/TeamPill";

interface Props {
  name: string;
  avatarUrl: string | null;
}

/**
 * Workspace identity area at the top of the sidebar. Integrates the Colign
 * brand mark with the team identity (rendered by {@link TeamPill}) into a
 * single rail header — replaces the old header-mode brand-plus-TeamPill pair
 * but reuses the same identity primitive so the visual treatment stays
 * consistent. Non-interactive in this iteration; a clickable variant for
 * multi-workspace switching is deferred.
 */
export function WorkspacePill({ name, avatarUrl }: Props) {
  return (
    <div
      className="px-3 pt-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2.5"
      data-cy="sidebar-workspace"
    >
      <div className="text-neutral-900 dark:text-neutral-50">
        <ColignBrand size="sm" />
      </div>
      <TeamPill name={name} avatarUrl={avatarUrl} />
    </div>
  );
}
