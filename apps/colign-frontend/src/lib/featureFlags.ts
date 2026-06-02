/**
 * Frontend feature flags (Vite env, inlined at build time).
 *
 * TIMELINE_TABS_ENABLED gates the in-progress timeline surfaces — the Dashboard,
 * Goals, and Commits tabs and their routes. Default OFF: production (Vercel, var
 * unset) hides them in the sidebar AND redirects their routes; dev turns them on
 * via `VITE_FEATURE_TIMELINE=true` in apps/colign-frontend/.env.local. Backend
 * functionality is unaffected — only the UI entry points are gated.
 *
 * To reveal in production later: add `VITE_FEATURE_TIMELINE=true` to the
 * colign-frontend Vercel project's env and redeploy. No code change.
 */
export const TIMELINE_TABS_ENABLED = import.meta.env.VITE_FEATURE_TIMELINE === "true";
