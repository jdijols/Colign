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

  // If /me fails we let the children render rather than trapping the user in a
  // redirect loop — the underlying API errors will surface in-app.
  if (!isError && me && me.teamId == null) {
    return <Navigate to="onboarding" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
