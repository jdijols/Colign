import { HiOutlineRefresh, HiOutlineLightBulb } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import { ColignBrand } from "@/components/Brand";

/**
 * Empty state shown to an IC on a team whose strategy chain isn't set up yet.
 * ICs lack authority to author Rally Cry / Objective / Outcome, so instead of the
 * wizard they get a clear "ask your team admin" message. Routed here by
 * OnboardingGate; once an admin finishes setup, a refresh drops them into the app.
 */
export function StrategySetupPendingPage() {
  const { data: me } = useGetMeQuery();
  const teamName = me?.teamName?.trim();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <div className="mt-10 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <HiOutlineLightBulb className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Strategy setup in progress
        </h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {teamName ? (
            <>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{teamName}</span>{" "}
              doesn&apos;t have its strategy set up yet. Ask your team admin to finish creating your
              team&apos;s Rally Cry, Objective, and first Outcome — then you can start planning your
              week.
            </>
          ) : (
            <>
              Your team doesn&apos;t have its strategy set up yet. Ask your team admin to finish
              creating your team&apos;s Rally Cry, Objective, and first Outcome — then you can start
              planning your week.
            </>
          )}
        </p>

        <button
          type="button"
          data-cy="strategy-pending-refresh"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
        >
          <HiOutlineRefresh className="h-4 w-4" aria-hidden />
          Check again
        </button>
      </div>
    </div>
  );
}
