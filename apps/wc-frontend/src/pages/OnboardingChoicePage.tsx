import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiOutlineUserGroup, HiOutlinePlus } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import { ColignBrand } from "@/components/Brand";

/**
 * The first screen a brand-new user sees after authenticating. They belong to
 * no team yet, so before the weekly-plan app means anything they make one
 * decision: create a team, or join an existing one.
 *
 * v1: only the "create" path is active — joining requires an invite, which
 * presupposes a team exists, so it's built in the next step. "Join" renders
 * disabled with a short explainer rather than being hidden, so the full shape
 * of the decision is visible from day one.
 */
export function OnboardingChoicePage() {
  const navigate = useNavigate();
  const { data: me } = useGetMeQuery();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          {me?.displayName ? `Welcome, ${me.displayName.split(" ")[0]}.` : "Welcome."}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          colign organizes weekly planning around a team. Start one now, or join
          a team you've been invited to.
        </p>

        <div className="mt-8 space-y-3">
          {/* Create — the active path */}
          <button
            type="button"
            onClick={() => navigate("../create-team")}
            data-cy="onboarding-create-team"
            className="group w-full text-left rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-neutral-100 p-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <HiOutlinePlus className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Create a team
                  </h2>
                  <HiArrowRight
                    className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  You'll be the first member. Invite teammates as direct reports
                  or peers once it's set up.
                </p>
              </div>
            </div>
          </button>

          {/* Join — disabled in v1 */}
          <div
            aria-disabled="true"
            className="w-full text-left rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-5 opacity-70"
          >
            <div className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                <HiOutlineUserGroup className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  Join a team
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500 leading-relaxed">
                  When someone invites you by email, the invite link drops you
                  straight onto their team. Nothing to do here yet.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-500">
          You can rename or leave a team later.
        </p>
      </div>
    </div>
  );
}
