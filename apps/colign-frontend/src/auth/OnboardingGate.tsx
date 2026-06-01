import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { useGetTeamQuery } from "@/api/team";
import { canManageTeam } from "@/lib/permissions";
import { StrategySetupPendingPage } from "@/pages/StrategySetupPendingPage";

/**
 * Sits between AuthGate (you're logged in) and the app (you can plan a week).
 * Reads /me and routes by {team, strategy} state:
 *
 *   - no team yet                         → onboarding (create a team)
 *   - team, strategy incomplete, author   → strategy wizard (RC → DO → Outcome)
 *   - team, strategy incomplete, plain IC → "ask your admin" empty state
 *   - team, strategy complete             → the app
 *
 * "Author" = MANAGER/ADMIN or the team lead (the creator), mirroring the backend
 * write authority — ICs can't author strategy, so they wait rather than seeing a
 * wizard they'd only get 403s from. Runs only on routes that REQUIRE a team; the
 * onboarding + wizard screens live outside this gate so they remain reachable.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: me, isLoading, isError } = useGetMeQuery();
  const teamId = me?.teamId ?? null;
  const { data: team, isLoading: teamLoading } = useGetTeamQuery(
    { teamId: teamId ?? 0 },
    { skip: teamId == null },
  );

  if (isLoading) return <GateLoading />;

  // Teamless users create a team first. (needsInvite is intentionally NOT gated
  // on — a solo user who skips invites must still reach the app.)
  if (!isError && me && me.teamId == null) {
    return <Navigate to="onboarding" replace state={{ from: location }} />;
  }

  // On a team but strategy isn't set up yet: authors finish setup in the wizard;
  // ICs see a wait-for-admin empty state. If /me errored we fail open to the app.
  if (!isError && me && me.teamId != null && !me.strategySetupComplete) {
    if (teamLoading) return <GateLoading />;
    if (canManageTeam(me, team ?? null)) {
      return <Navigate to="onboarding/strategy/rally-cry" replace state={{ from: location }} />;
    }
    return <StrategySetupPendingPage />;
  }

  return <>{children}</>;
}

function GateLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        Loading your workspace…
      </span>
    </div>
  );
}
