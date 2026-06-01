import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import { useCreateTeamMutation } from "@/api/team";
import { ColignBrand } from "@/components/Brand";

/**
 * First screen after a teamless user authenticates. Per the "minimize actions"
 * principle, this is NOT a create/join choice — it's the create form itself,
 * with the team-name field autofocused and ready. Type a name, press Enter,
 * you're in. Joining happens via an invite link (Step 3), so it's only a quiet
 * note here, not a competing action.
 */
export function OnboardingChoicePage() {
  const navigate = useNavigate();
  const { data: me } = useGetMeQuery();
  const [createTeam, { isLoading }] = useCreateTeamMutation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const firstName = me?.displayName?.trim().split(/\s+/)[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isLoading) return;
    setError(null);
    try {
      await createTeam({ name: trimmed }).unwrap();
      // getMe cache already holds the new teamId (see createTeam.onQueryStarted).
      // The creator must establish the team's strategy chain before weekly
      // planning, so the next step is the strategy wizard (Rally Cry → Defining
      // Objective → Outcome); inviting teammates follows as Step 4.
      navigate("strategy/rally-cry", { relative: "path" });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 409
          ? "You're already on a team."
          : "Couldn't create the team. Please try again.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          Name your team to get started. You can invite people and rename it afterwards.
        </p>

        <form onSubmit={submit} className="mt-8" aria-label="Create a team">
          <label htmlFor="team-name" className="sr-only">
            Team name
          </label>
          <input
            id="team-name"
            data-cy="team-name-input"
            type="text"
            // First-input-on-an-onboarding-form pattern — the user reached
            // this page specifically to name their team.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="e.g. Platform Engineering"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:border-transparent transition-shadow"
          />

          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            data-cy="create-team-submit"
            disabled={!name.trim() || isLoading}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          >
            {isLoading ? (
              "Creating…"
            ) : (
              <>
                Create team
                <HiArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed">
          Joining a team instead? Open the invite link from your email — it drops you straight onto
          their team.
        </p>
      </div>
    </div>
  );
}
