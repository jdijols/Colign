import { Suspense, lazy } from "react";
import { Link, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { HostHome } from "./HostHome";

// MF-lazy import. The host has no compile-time dep on wc-frontend;
// remoteEntry.js is fetched at runtime from VITE_WC_REMOTE_URL (defaults
// to http://localhost:5174 in dev). See research/03-vite-module-federation.md.
const WeeklyCommitApp = lazy(() => import("wc/WeeklyCommitApp"));

// Local lazy import — the architecture site is bundled into pa-host itself
// (not a Module Federation remote). Onboarding docs don't need their own
// deploy lifecycle.
const ArchitectureSite = lazy(() => import("./architecture/ArchitectureSite"));

function ColignMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="13" height="2" rx="1" />
      <rect x="3" y="17" width="8" height="2" rx="1" />
    </svg>
  );
}

function HostShell() {
  return (
    <div>
      <nav
        style={{
          padding: "0 24px",
          height: 56,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--fg)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: "-0.01em",
          }}
        >
          <ColignMark size={18} />
          colign
        </Link>
        <NavLinkPlain to="/" end label="Home" />
        <NavLinkPlain to="/weekly-commit" label="App" />
        <NavLinkPlain to="/architecture" label="Architecture" />
        <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>
          PA host shell · :4173
        </span>
      </nav>
      <Outlet />
    </div>
  );
}

function NavLinkPlain({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        fontSize: 13,
        color: isActive ? "var(--fg)" : "var(--muted)",
        textDecoration: "none",
        fontWeight: isActive ? 500 : 400,
      })}
    >
      {label}
    </NavLink>
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
                <div style={{ padding: 32, color: "var(--muted)" }}>
                  Loading colign remote from :5174…
                </div>
              }
            >
              <WeeklyCommitApp />
            </Suspense>
          }
        />
        <Route
          path="architecture/*"
          element={
            <Suspense
              fallback={
                <div style={{ padding: 32, color: "var(--muted)" }}>
                  Loading architecture site…
                </div>
              }
            >
              <ArchitectureSite />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
