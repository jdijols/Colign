import { Provider } from "react-redux";
import { Outlet, Route, Routes } from "react-router-dom";
// --- Module Federation CSS crossing ---------------------------------------
// @module-federation/vite (v1.x) does NOT inject a remote's CSS into the host
// document: a plain `import "./index.css"` only styles the remote's own dev
// server (:5174), and `?inline` on the SOURCE returns raw CSS whose @tailwind
// directives never expand. The host is intentionally Tailwind-free, so it can't
// compile WC's classes either.
//
// Fix: precompile Tailwind to a static, fully-expanded stylesheet
// (src/colign-compiled.css — produced by `yarn build:css`, kept fresh in dev by
// `yarn dev:css --watch`), then import THAT with `?inline`. With no @tailwind
// directives left, `?inline` returns the whole expanded string, which we render
// as a <style> tag. It travels with the JS module across the MF boundary and,
// being a rendered element, mounts only while WeeklyCommitApp is on screen — so
// its global preflight never leaks onto the host's landing/architecture routes.
import colignStyles from "./colign-compiled.css?inline";
import { store } from "@/store";
import { Auth0Bridge } from "@/auth/Auth0Bridge";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/auth/AuthGate";
import { OnboardingGate } from "@/auth/OnboardingGate";
import { LoginPage } from "@/pages/LoginPage";
import { OnboardingChoicePage } from "@/pages/OnboardingChoicePage";
import { StrategyRallyCryPage } from "@/pages/StrategyRallyCryPage";
import { StrategyObjectivePage } from "@/pages/StrategyObjectivePage";
import { StrategyOutcomePage } from "@/pages/StrategyOutcomePage";
import { InviteTeammatesPage } from "@/pages/InviteTeammatesPage";
import { InviteAcceptPage } from "@/pages/InviteAcceptPage";
import { WeeklyPlanPage } from "@/pages/WeeklyPlanPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { CommitsPage } from "@/pages/CommitsPage";
import { ReconcilePage } from "@/pages/ReconcilePage";
import { ManagerDashboardPage } from "@/pages/ManagerDashboardPage";
import { WorkspaceSettingsPage } from "@/pages/WorkspaceSettingsPage";

/**
 * The MF-remote entry. Self-contains Redux Provider + Auth0Bridge so the host
 * doesn't need to know about the WC store. The host (or standalone main.tsx)
 * owns the BrowserRouter AND the Auth0ProviderWithRouter — both must live above
 * this component so router context + Auth0 client are available to the bridge.
 *
 * Route tiers:
 *   login                       — unauthenticated
 *   onboarding / create-team    — authenticated, team-agnostic (no team yet)
 *   onboarding/strategy/*       — authenticated + on a team, strategy not yet complete
 *   index / reconcile / manager — authenticated AND on a team AND strategy complete
 *
 * Relative paths throughout so the same Routes match standalone (mounted at "/")
 * and hosted by PA (mounted at "/weekly-commit/*").
 */
export default function WeeklyCommitApp() {
  return (
    <Provider store={store}>
      <style dangerouslySetInnerHTML={{ __html: colignStyles }} />
      <Auth0Bridge>
        <Routes>
          <Route path="login" element={<LoginPage />} />

          {/* Public invitation accept landing. Lives outside AuthGate so the
              recipient can reach it from their email before signing in; the
              page itself triggers loginWithRedirect (real) or routes to /login
              (mock) and auto-accepts once authenticated. */}
          <Route path="invite/:token" element={<InviteAcceptPage />} />

          {/* Authenticated but team-agnostic — reachable with no team yet.
              The onboarding screen IS the create-team form (single focused
              input); there's no separate create-team route. The invite step
              sits one level deeper and bounces teamless users back to
              /onboarding (see InviteTeammatesPage). */}
          <Route
            element={
              <AuthGate>
                <Outlet />
              </AuthGate>
            }
          >
            <Route path="onboarding" element={<OnboardingChoicePage />} />
            {/* Strategy onboarding wizard (Steps 1–3). Requires a team but NOT a
                complete strategy chain — it's how an author completes it — so it
                lives outside OnboardingGate and self-guards per page. */}
            <Route path="onboarding/strategy/rally-cry" element={<StrategyRallyCryPage />} />
            <Route path="onboarding/strategy/objective" element={<StrategyObjectivePage />} />
            <Route path="onboarding/strategy/outcome" element={<StrategyOutcomePage />} />
            {/* Step 4: invite teammates (or continue solo to the first weekly plan). */}
            <Route path="onboarding/invite" element={<InviteTeammatesPage />} />
          </Route>

          {/* Requires a team — OnboardingGate bounces teamless users to onboarding. */}
          <Route
            element={
              <AuthGate>
                <OnboardingGate>
                  <AppShell />
                </OnboardingGate>
              </AuthGate>
            }
          >
            <Route index element={<WeeklyPlanPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="commits" element={<CommitsPage />} />
            <Route path="reconcile" element={<ReconcilePage />} />
            <Route path="manager" element={<ManagerDashboardPage />} />
            <Route path="settings" element={<WorkspaceSettingsPage />} />
          </Route>
        </Routes>
      </Auth0Bridge>
    </Provider>
  );
}
