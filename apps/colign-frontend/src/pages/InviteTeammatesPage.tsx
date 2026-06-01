import { Navigate, useNavigate } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import { useListInvitationsQuery } from "@/api/invites";
import { InviteForm } from "@/components/InviteForm";
import { ColignBrand } from "@/components/Brand";

/**
 * Onboarding's invite step — page chrome + `<InviteForm>`. The form itself
 * also renders inside the Settings page; this wrapper provides the centered
 * full-screen layout and the Skip/Done secondary action.
 */
export function InviteTeammatesPage() {
  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const teamId = me?.teamId ?? null;
  const { data: invites } = useListInvitationsQuery(
    { teamId: teamId ?? 0 },
    { skip: teamId == null },
  );

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
      </div>
    );
  }
  if (me && me.teamId == null) return <Navigate to=".." replace />;
  if (teamId == null) return null;

  const hasSentAtLeastOne = (invites?.length ?? 0) > 0;
  const skipOrDone = (
    <button
      type="button"
      data-cy={hasSentAtLeastOne ? "done-invites" : "skip-invites"}
      onClick={() => navigate("..", { relative: "path" })}
      className={
        hasSentAtLeastOne
          ? "inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          : "inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors px-2 py-3"
      }
    >
      {hasSentAtLeastOne ? "Done" : "Skip for now"}
      <HiArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          Invite your team
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          Invite teammates to align your week together — or skip and start solo.
        </p>
        <div className="mt-8">
          <InviteForm teamId={teamId} secondaryAction={skipOrDone} />
        </div>
        <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed">
          You'll become a manager automatically once a report joins.
        </p>
      </div>
    </div>
  );
}
