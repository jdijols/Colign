import { Suspense, lazy } from "react";
import { Link, Outlet, Route, Routes } from "react-router-dom";
import { HostHome } from "./HostHome";

// MF-lazy import. The host has no compile-time dep on wc-frontend;
// remoteEntry.js is fetched at runtime from VITE_WC_REMOTE_URL (defaults
// to http://localhost:5174 in dev). See research/03-vite-module-federation.md.
const WeeklyCommitApp = lazy(() => import("wc/WeeklyCommitApp"));

function HostShell() {
  return (
    <div>
      <nav
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid rgba(0,0,0,.08)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "rgba(255,255,255,.6)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>PA HOST</span>
        <Link to="/" style={{ fontSize: 14, color: "inherit", textDecoration: "none" }}>
          Home
        </Link>
        <Link
          to="/weekly-commit"
          style={{ fontSize: 14, color: "inherit", textDecoration: "none" }}
        >
          Weekly Commit (remote)
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}

/**
 * Demonstrates structural alignment: PA owns the chrome + a Home route, and
 * mounts the entire WC remote under /weekly-commit/* via React.lazy + Suspense.
 * The remote runs unchanged — same code that boots standalone on :5174.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<HostShell />}>
        <Route index element={<HostHome />} />
        <Route
          path="weekly-commit/*"
          element={
            <Suspense
              fallback={
                <div style={{ padding: 32, color: "#6b7280" }}>
                  Loading Weekly Commit remote from :5174…
                </div>
              }
            >
              <WeeklyCommitApp />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
