import { Navigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { InviteForm } from "@/components/InviteForm";

/**
 * `/settings` — the workspace-management surface. Three stacked sections:
 *   - Team (PR 2): name + description + avatar URL. Permission-gated.
 *   - Members (PR 2): all team members, read-only; remove button in PR 3.
 *   - Invitations (PR 1): the existing <InviteForm> + pending list.
 *
 * Teamless users land here only via direct URL — bounce them up to the
 * parent route ("/") so OnboardingGate can route them to /onboarding.
 * (`Navigate to="onboarding"` would resolve to `/settings/onboarding`,
 * which doesn't exist.)
 */
export function WorkspaceSettingsPage() {
  const { data: me, isLoading } = useGetMeQuery();

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-10">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
      </div>
    );
  }
  if (me && me.teamId == null) return <Navigate to=".." replace />;
  if (!me?.teamId) return null;

  return (
    <div className="px-4 sm:px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Workspace settings
      </h1>

      <section aria-labelledby="team-heading" className="mt-10">
        <h2 id="team-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Team</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Team profile lands in the next PR.
        </p>
      </section>

      <section aria-labelledby="members-heading" className="mt-10">
        <h2 id="members-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Members</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Member list lands in the next PR.
        </p>
      </section>

      <section aria-labelledby="invitations-heading" className="mt-10">
        <h2 id="invitations-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Invitations</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Send an invite. Pending invitations appear below.
        </p>
        <div className="mt-6">
          <InviteForm teamId={me.teamId} />
        </div>
      </section>
    </div>
  );
}
