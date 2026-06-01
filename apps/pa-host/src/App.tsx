import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

// MF-lazy import. The host has no compile-time dep on colign-frontend;
// remoteEntry.js is fetched at runtime from COLIGN_REMOTE_URL (defaults to
// http://localhost:5174 in dev). See research/03-vite-module-federation.md.
const WeeklyCommitApp = lazy(() => import("colign/WeeklyCommitApp"));

// Local lazy import — the architecture site is bundled into pa-host itself
// (not a Module Federation remote). Onboarding docs don't need their own
// deploy lifecycle.
const ArchitectureSite = lazy(() => import("./architecture/ArchitectureSite"));

/**
 * The host is intentionally chrome-less. Each surface owns its own navigation:
 *   /architecture/*  → ArchitectureSite (owns its own Sidebar)
 *   /*               → WeeklyCommitApp (MF remote; renders its own AppShell —
 *                      identical chrome whether embedded here or standalone on
 *                      :5174, per the brief's "runs standalone" requirement)
 *
 * The app IS the root experience: colign.org/ is the product (login,
 * onboarding, weekly plan, invites), not a separate marketing landing. The
 * remote's routes are relative, so the same bundle serves standalone on :5174
 * and here at the host root. The former HostHome marketing landing is retired
 * from the root — the app's own login page is the logged-out entry point.
 * Re-add HostHome at a dedicated path if a separate marketing surface is
 * needed later.
 *
 * Route ordering: architecture/* is matched ahead of the /* catch-all by
 * react-router's specificity ranking, so the architecture site still resolves.
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

      <Route
        path="/*"
        element={
          <Suspense
            fallback={
              <div style={{ padding: 32, color: "var(--muted)" }}>
                Loading colign…
              </div>
            }
          >
            {/* The remote's Tailwind is scoped with `important: "#colign-root"`.
                Standalone that id is the mount node; embedded here we provide it
                as a wrapper so the remote's utilities resolve. */}
            <div id="colign-root">
              <WeeklyCommitApp />
            </div>
          </Suspense>
        }
      />
    </Routes>
  );
}
