import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";

/**
 * Sits between AuthGate (you're logged in) and the app (you can plan a week).
 * Reads /me; if the user has no team yet, routes them to the onboarding choice.
 *
 * Runs only on routes that REQUIRE a team — the onboarding screens themselves
 * live outside this gate so a teamless user can actually reach them.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: me, isLoading, isError } = useGetMeQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          Loading your workspace…
        </span>
      </div>
    );
  }

  // Teamless users create a team first. The invite step is *encouraged* but
  // not forced: it's shown once right after team creation (see
  // OnboardingChoicePage's post-create navigation) and is skippable, so a solo
  // user can go straight to planning their own week. We deliberately do NOT
  // gate the app on needsInvite — that would trap a skipper in a redirect loop.
  // (needsInvite still rides along on /me for a future in-app "invite your
  // team" nudge.) If /me fails we let children render rather than loop.
  if (!isError && me && me.teamId == null) {
    return <Navigate to="onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
