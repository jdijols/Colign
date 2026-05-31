import { Suspense, lazy } from "react";
import { Link, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { HostHome } from "./HostHome";

// MF-lazy import. The host has no compile-time dep on wc-frontend;
// remoteEntry.js is fetched at runtime from VITE_COLIGN_REMOTE_URL (defaults
// to http://localhost:5174 in dev). See research/03-vite-module-federation.md.
const WeeklyCommitApp = lazy(() => import("colign/WeeklyCommitApp"));

// Local lazy import — the architecture site is bundled into pa-host itself
// (not a Module Federation remote). Onboarding docs don't need their own
// deploy lifecycle.
const ArchitectureSite = lazy(() => import("./architecture/ArchitectureSite"));

function ColignMark({ size = 18 }: { size?: number }) {
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
  const { isAuthenticated, logout } = useAuth0();
  // Brand mark routes to wherever "home" means for this user:
  // signed-in users home is the app, signed-out users home is the landing.
  const brandTarget = isAuthenticated ? "/weekly-commit" : "/";

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
          to={brandTarget}
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
        <NavLinkPlain to="/weekly-commit" label="App" />
        <NavLinkPlain to="/architecture" label="Architecture" />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
              }}
            >
              Sign out
            </button>
          )}
        </div>
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
 * Two top-level layouts:
 *   /                   → full-bleed landing (no nav, marketing-shaped)
 *   /weekly-commit/*    → app under HostShell chrome (MF remote)
 *   /architecture/*     → docs under HostShell chrome (local sub-app)
 */
export default function App() {
  return (
    <Routes>
      {/* Landing renders standalone — the marketing page has its own chrome
          (or rather, no chrome at all) and shouldn't inherit the app nav. */}
      <Route index element={<HostHome />} />

      <Route element={<HostShell />}>
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
              {/* The remote's Tailwind is scoped with `important: "#wc-root"`.
                  Standalone, that id is the mount node; here in the host we
                  provide it as a wrapper so the remote's utilities resolve. */}
              <div id="wc-root">
                <WeeklyCommitApp />
              </div>
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
