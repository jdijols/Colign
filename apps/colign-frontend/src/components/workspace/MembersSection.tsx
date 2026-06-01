import { useGetTeamMembersQuery } from "@/api/team";

interface Props {
  teamId: number;
  canManage: boolean;
  currentUserId: number;
  teamLeadId: number | null;
}

/**
 * Workspace member roster. Read-only in PR 2; PR 3 adds the per-row remove
 * button (rendered only when canManage and the row isn't self or lead).
 */
export function MembersSection({ teamId, canManage, currentUserId, teamLeadId }: Props) {
  const { data, isLoading } = useGetTeamMembersQuery({ teamId });

  if (isLoading) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading members…</p>;
  }
  if (!data || data.content.length === 0) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">No members yet.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      {data.content.map((m) => {
        const isSelf = m.userId === currentUserId;
        const isLead = teamLeadId != null && m.userId === teamLeadId;
        return (
          <li key={m.userId} className="flex items-center gap-3 p-3">
            <div
              aria-hidden
              className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden"
            >
              {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : (m.displayName?.[0] ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                {m.displayName}
                {isSelf && <span className="ml-2 text-xs text-neutral-500">(you)</span>}
                {isLead && <span className="ml-2 text-xs text-neutral-500">(lead)</span>}
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{m.email}</div>
            </div>
            <span
              data-cy={`member-${m.userId}-role`}
              className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
            >
              {m.role}
            </span>
            {/* Remove button lands in PR 3, gated on canManage && !isSelf && !isLead */}
            {canManage && !isSelf && !isLead && (
              <span data-cy={`member-${m.userId}-actions`} aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}
