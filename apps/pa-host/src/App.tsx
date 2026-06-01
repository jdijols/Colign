import { Suspense, lazy } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { HostHome } from "./HostHome";
import { isReal } from "./auth/auth0Config";

// MF-lazy import. The host has no compile-time dep on colign-frontend;
// remoteEntry.js is fetched at runtime from COLIGN_REMOTE_URL (defaults to
// http://localhost:5174 in dev). See research/03-vite-module-federation.md.
const WeeklyCommitApp = lazy(() => import("colign/WeeklyCommitApp"));

// Local lazy import — the architecture site is bundled into pa-host itself
// (not a Module Federation remote). Onboarding docs don't need their own
// deploy lifecycle.
const ArchitectureSite = lazy(() => import("./architecture/ArchitectureSite"));

/**
 * Root surface gate. The product lives at the host root (colign.org/*):
 *   - Logged-OUT visitors to the exact root see the HostHome landing, whose
 *     "Get started" CTA runs the Auth0 redirect. (Real/prod auth only; in
 *     mock/dev the app owns its own demo login.)
 *   - Everyone else — authenticated users, and any non-root path — render the
 *     WeeklyCommitApp remote, which owns its own routes, auth gate, and the
 *     create→invite→app onboarding flow.
 *
 * This is what makes colign.org/ the landing while keeping the app at the root
 * for signed-in users, without the old /weekly-commit prefix.
 */
function RootGate() {
  const { isAuthenticated, isLoading } = useAuth0();
  const { pathname } = useLocation();

  if (isReal && pathname === "/" && !isLoading && !isAuthenticated) {
    return <HostHome />;
  }

  return (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--muted)" }}>Loading colign…</div>
      }
    >
      {/* The remote's Tailwind is scoped with `important: "#colign-root"`.
          Standalone that id is the mount node; embedded here we provide it as
          a wrapper so the remote's utilities resolve. */}
      <div id="colign-root">
        <WeeklyCommitApp />
      </div>
    </Suspense>
  );
}

/**
 * The host is intentionally chrome-less. Each surface owns its own navigation:
 *   /architecture/*  → ArchitectureSite (owns its own Sidebar)
 *   /*               → RootGate → HostHome landing (logged-out root) or the
 *                      WeeklyCommitApp remote (everything else)
 *
 * architecture/* is matched ahead of the /* catch-all by react-router's
 * specificity ranking, so the architecture site still resolves.
 */
export default function App() {
  return (
    <Routes>
      <Route
        path="architecture/*"
        element={
          <Suspense
            fallback={
              <div style={{ padding: 32, color: "var(--muted)" }}>
                Loading architecture…
              </div>
            }
          >
            <ArchitectureSite />
          </Suspense>
        }
      />

      <Route path="/*" element={<RootGate />} />
    </Routes>
  );
}
