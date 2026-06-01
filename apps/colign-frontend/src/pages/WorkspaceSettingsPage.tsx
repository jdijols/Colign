import { Navigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { useGetTeamQuery } from "@/api/team";
import { InviteForm } from "@/components/InviteForm";
import { MembersSection } from "@/components/workspace/MembersSection";
import { TeamSettingsSection } from "@/components/workspace/TeamSettingsSection";
import { canManageTeam } from "@/lib/permissions";

/**
 * `/settings` — the workspace-management surface. Three stacked sections:
 *   - Team: name + description + avatar URL. Permission-gated.
 *   - Members: all team members, read-only; remove button in PR 3.
 *   - Invitations: the existing <InviteForm> + pending list.
 *
 * Teamless users land here only via direct URL — bounce them up to the
 * parent route ("/") so OnboardingGate can route them to /onboarding.
 * (`Navigate to="onboarding"` would resolve to `/settings/onboarding`,
 * which doesn't exist.)
 */
export function WorkspaceSettingsPage() {
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const teamId = me?.teamId ?? null;
  const { data: team } = useGetTeamQuery({ teamId: teamId ?? 0 }, { skip: teamId == null });

  if (meLoading) return <Loading />;
  if (me && me.teamId == null) return <Navigate to=".." replace />;
  if (!me?.teamId) return null;

  const canManage = canManageTeam(me, team ?? null);

  return (
    <div className="px-4 sm:px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Workspace settings
      </h1>

      <section aria-labelledby="team-heading" className="mt-10">
        <h2 id="team-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4">Team</h2>
        <TeamSettingsSection teamId={me.teamId} canManage={canManage} />
      </section>

      <section aria-labelledby="members-heading" className="mt-12">
        <h2 id="members-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4">Members</h2>
        <MembersSection
          teamId={me.teamId}
          canManage={canManage}
          currentUserId={me.id}
          teamLeadId={team?.leadUserId ?? null}
        />
      </section>

      <section aria-labelledby="invitations-heading" className="mt-12">
        <h2 id="invitations-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4">Invitations</h2>
        <InviteForm teamId={me.teamId} />
      </section>
    </div>
  );
}

function Loading() {
  return (
    <div className="px-4 sm:px-6 py-10">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
    </div>
  );
}
