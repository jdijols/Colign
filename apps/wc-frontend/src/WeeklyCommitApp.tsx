import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/auth/AuthGate";
import { LoginPage } from "@/pages/LoginPage";
import { WeeklyPlanPage } from "@/pages/WeeklyPlanPage";
import { ReconcilePage } from "@/pages/ReconcilePage";
import { ManagerDashboardPage } from "@/pages/ManagerDashboardPage";

/**
 * Single MF-remote entry. Host (or standalone main.tsx) wraps with
 * <Provider> + <BrowserRouter>. No shell or nav imports allowed above
 * this component when consumed by the host.
 */
export default function WeeklyCommitApp() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
  );
}
