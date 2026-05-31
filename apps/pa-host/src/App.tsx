import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { HostHome } from "./HostHome";

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
 *   /                 → HostHome (full-bleed marketing landing, no nav)
 *   /weekly-commit/*  → WeeklyCommitApp (MF remote; renders its own AppShell —
 *                       identical chrome whether embedded here or standalone on
 *                       :5174, per the brief's "runs standalone" requirement)
 *   /architecture/*   → ArchitectureSite (owns its own Sidebar)
 *
 * Previously a HostShell wrapped the app + architecture routes with a second
 * nav bar, which stacked on top of each child's own chrome (duplicate brand +
 * Sign out). Removed — the remote/sub-app are the single source of chrome.
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<HostHome />} />

      <Route
        path="weekly-commit/*"
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
    </Routes>
  );
}
