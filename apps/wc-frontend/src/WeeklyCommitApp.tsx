import { Provider } from "react-redux";
import { Route, Routes } from "react-router-dom";
import { store } from "@/store";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/auth/AuthGate";
import { LoginPage } from "@/pages/LoginPage";
import { WeeklyPlanPage } from "@/pages/WeeklyPlanPage";
import { ReconcilePage } from "@/pages/ReconcilePage";
import { ManagerDashboardPage } from "@/pages/ManagerDashboardPage";

/**
 * The MF-remote entry. Self-contains its Redux Provider so the host doesn't
 * need to know about the WC store. The host (or standalone main.tsx) still
 * owns the BrowserRouter — required because both apps must agree on the
 * URL context for nav and back-button behavior.
 */
export default function WeeklyCommitApp() {
  return (
    <Provider store={store}>
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
    </Provider>
  );
}
