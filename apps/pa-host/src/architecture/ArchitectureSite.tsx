import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import "./styles.css";
import { Sidebar } from "./Sidebar";
import { OverviewPage } from "./pages/OverviewPage";
import { PeoplePage } from "./pages/PeoplePage";
import { DataModelPage } from "./pages/DataModelPage";
import { LifecyclePage } from "./pages/LifecyclePage";
import { RoutesPage } from "./pages/RoutesPage";
import { AuthPage } from "./pages/AuthPage";
import { StackPage } from "./pages/StackPage";
import { GlossaryPage } from "./pages/GlossaryPage";

export default function ArchitectureSite() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="arch-site">
      <div className="arch-shell">
        <Sidebar />
        <main className="arch-content">
          <Routes>
            <Route index element={<OverviewPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="data" element={<DataModelPage />} />
            <Route path="lifecycle" element={<LifecyclePage />} />
            <Route path="routes" element={<RoutesPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="stack" element={<StackPage />} />
            <Route path="glossary" element={<GlossaryPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
