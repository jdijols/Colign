// apps/colign-frontend/src/components/workspace/MembersSection.tsx
import { useState } from "react";
import { useGetTeamMembersQuery, useRemoveTeamMemberMutation } from "@/api/team";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { TeamMemberDto } from "@/api/types";

interface Props {
  teamId: number;
  canManage: boolean;
  currentUserId: number;
  teamLeadId: number | null;
}

export function MembersSection({ teamId, canManage, currentUserId, teamLeadId }: Props) {
  const { data, isLoading } = useGetTeamMembersQuery({ teamId });
  const [removeMember, { isLoading: removing }] = useRemoveTeamMemberMutation();
  const [target, setTarget] = useState<TeamMemberDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading members…</p>;
  if (!data || data.content.length === 0) return <p className="text-sm text-neutral-600 dark:text-neutral-400">No members yet.</p>;

  async function confirm() {
    if (!target) return;
    setError(null);
    try {
      await removeMember({ teamId, userId: target.userId }).unwrap();
      setTarget(null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 400
        ? "Couldn't remove this member (likely the team lead)."
        : status === 403 ? "You don't have permission."
        : "Could not remove the member.");
    }
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        {data.content.map((m) => {
          const isSelf = m.userId === currentUserId;
          const isLead = teamLeadId != null && m.userId === teamLeadId;
          const showRemove = canManage && !isSelf && !isLead;
          return (
            <li key={m.userId} className="flex items-center gap-3 p-3">
              <div aria-hidden className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden">
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
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{m.role}</span>
              {showRemove && (
                <button
                  type="button"
                  onClick={() => setTarget(m)}
                  aria-label={`Remove ${m.displayName}`}
                  data-cy={`remove-member-${m.userId}`}
                  className="text-xs text-rose-700 dark:text-rose-400 hover:underline px-2"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={target != null}
        title={target ? `Remove ${target.displayName}?` : ""}
        body={
          <div className="space-y-2">
            <p>{target?.email} will lose access to this workspace immediately.</p>
            <p className="text-xs text-neutral-500">
              Anyone reporting to this person will be left without a manager
              and can be re-attached via re-invitation later.
            </p>
          </div>
        }
        confirmLabel={removing ? "Removing…" : "Remove member"}
        destructive
        onCancel={() => setTarget(null)}
        onConfirm={confirm}
      />
    </>
  );
}
