import { Provider } from "react-redux";
import { Route, Routes } from "react-router-dom";
import { store } from "@/store";
import { Auth0Bridge } from "@/auth/Auth0Bridge";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/auth/AuthGate";
import { LoginPage } from "@/pages/LoginPage";
import { WeeklyPlanPage } from "@/pages/WeeklyPlanPage";
import { ReconcilePage } from "@/pages/ReconcilePage";
import { ManagerDashboardPage } from "@/pages/ManagerDashboardPage";

/**
 * The MF-remote entry. Self-contains Redux Provider + Auth0Bridge so the host
 * doesn't need to know about the WC store. The host (or standalone main.tsx)
 * owns the BrowserRouter AND the Auth0ProviderWithRouter — both must live above
 * this component so router context + Auth0 client are available to the bridge.
 *
 * In mock mode, Auth0Bridge is a no-op passthrough.
 */
export default function WeeklyCommitApp() {
  return (
    <Provider store={store}>
      <Auth0Bridge>
        {/*
          Relative paths so the same Routes match both standalone (mounted at "/")
          and hosted by PA (mounted at "/weekly-commit/*"). Navigation inside the
          tree also uses relative paths — see LoginPage.tsx and AuthGate.tsx.
        */}
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route
            element={
              <AuthGate>
                <AppShell />
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
