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
// (src/wc-compiled.css — produced by `yarn build:css`, kept fresh in dev by
// `yarn dev:css --watch`), then import THAT with `?inline`. With no @tailwind
// directives left, `?inline` returns the whole expanded string, which we render
// as a <style> tag. It travels with the JS module across the MF boundary and,
// being a rendered element, mounts only while WeeklyCommitApp is on screen — so
// its global preflight never leaks onto the host's landing/architecture routes.
import wcStyles from "./wc-compiled.css?inline";
import { store } from "@/store";
import { Auth0Bridge } from "@/auth/Auth0Bridge";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/auth/AuthGate";
import { OnboardingGate } from "@/auth/OnboardingGate";
import { LoginPage } from "@/pages/LoginPage";
import { OnboardingChoicePage } from "@/pages/OnboardingChoicePage";
import { CreateTeamPage } from "@/pages/CreateTeamPage";
import { WeeklyPlanPage } from "@/pages/WeeklyPlanPage";
import { ReconcilePage } from "@/pages/ReconcilePage";
import { ManagerDashboardPage } from "@/pages/ManagerDashboardPage";

/**
 * The MF-remote entry. Self-contains Redux Provider + Auth0Bridge so the host
 * doesn't need to know about the WC store. The host (or standalone main.tsx)
 * owns the BrowserRouter AND the Auth0ProviderWithRouter — both must live above
 * this component so router context + Auth0 client are available to the bridge.
 *
 * Route tiers:
 *   login                     — unauthenticated
 *   onboarding / create-team  — authenticated, team-agnostic (no team yet)
 *   index / reconcile / manager — authenticated AND on a team (OnboardingGate)
 *
 * Relative paths throughout so the same Routes match standalone (mounted at "/")
 * and hosted by PA (mounted at "/weekly-commit/*").
 */
export default function WeeklyCommitApp() {
  return (
    <Provider store={store}>
      <style dangerouslySetInnerHTML={{ __html: wcStyles }} />
      <Auth0Bridge>
        <Routes>
          <Route path="login" element={<LoginPage />} />

          {/* Authenticated but team-agnostic — reachable with no team yet. */}
          <Route
            element={
              <AuthGate>
                <Outlet />
              </AuthGate>
            }
          >
            <Route path="onboarding" element={<OnboardingChoicePage />} />
            <Route path="create-team" element={<CreateTeamPage />} />
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
            <Route path="reconcile" element={<ReconcilePage />} />
            <Route path="manager" element={<ManagerDashboardPage />} />
          </Route>
        </Routes>
      </Auth0Bridge>
    </Provider>
  );
}
