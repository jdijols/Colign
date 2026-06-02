---
date: 2026-06-02
branch: main
focus: week-navigable timeline (Goals/Commits/Dashboard) + effective-dated strategy editing; feature-flagged OFF in prod
status: SHIPPED to prod (backend Fly V9 + frontend Vercel) with the timeline tabs HIDDEN in prod via VITE_FEATURE_TIMELINE (ON in dev). HEAD = 0dceec8 = origin/main
remotes: origin (github.com/jdijols/Colign) pushed @ 0dceec8 · gauntlet (labs.gauntletai.com/jasondijols/colign) NOT pushed this session (behind)
companion: ~/.gstack checkpoint 20260602-011246-timeline-week-views-complete--prod-feature-flag.md
---

# Handoff — Week-navigable timeline + prod feature flag

Built and shipped the "time-keeping" foundation: scrub week to week and see the
strategy and commits as they stood that week. Then hid the new tabs from prod
behind a feature flag so the project reviewer sees the stable pre-timeline app,
while dev keeps the new surfaces and **all backend functionality stays live on
prod**.

## What shipped (this session, in order)

| Commit | What |
|---|---|
| `14b2854` | Team rollup visible to the team lead before they have reports (derived-role gate fix) + empty-state CTA; removed dev-seed name leak |
| `823158c` | docs(deploy): incremental single-service deploy notes in DEPLOY.md |
| `9111e7c` | Add Dashboard / Goals / Commits sidebar tabs; move "Aiming for" anchor from Plan → Dashboard |
| `ea0e380` | Week navigator + strategy tree "as of" the selected week; `createdDate` exposed; `GET /plans/by-week`; Commits-by-week view (slices 1, 2, 4) |
| `3f9c61f` | Effective-dating + editing remainder: add/remove objectives, **Rally-Cry pivot**, soft-cascade deletes, V9; "Carried" badge (slice 3 remainder) |
| `8dc9342` | In-place rename for RC / Objective / Outcome titles |
| `0dceec8` | **Feature flag** — gate Dashboard/Goals/Commits behind `VITE_FEATURE_TIMELINE` (off in prod) |

Prior context: this picks up from `638af6d` (strategy onboarding + hiring-event
deploy) and the 2026-06-01 handoffs.

## The timeline model (effective-dating)

- Each strategy element is live from its `createdDate` until `effectiveTo`
  (soft-delete; null = active). V8 added `effective_to` to `defining_objective`
  + `outcome`; V9 to `rally_cry`. Both ran cleanly on prod Postgres.
- The outcomes list (`GET /outcomes`) defaults to **active-only**, so the
  Dashboard anchor, the commit-form picker, and `strategySetupComplete` all
  ignore retired elements automatically. The Goals timeline passes
  `?includeRetired=true` and filters by each element's effective range per week.
- Mutations are **non-destructive**: `deleteOutcome` / `deleteDefiningObjective`
  / `deleteRallyCry` stamp `effectiveTo` and cascade (replacing the old FK
  `ON DELETE CASCADE` hard-delete). Rename is **in-place** via the existing PUT
  endpoints (versioned rename was rejected — it needs subtree re-parenting).
- **Pivot Rally Cry** = soft-delete the RC subtree → `strategySetupComplete`
  flips false → routes to the onboarding strategy wizard for the new RC. Past
  weeks keep the old one.
- **Commits-by-week** reuses the existing reconciliation carry-forward
  (`carriedFromCommitId`); the view adds a "Carried" badge. New read-only
  `GET /plans/by-week?date=YYYY-MM-DD` (no auto-create; 204 when none).
- Editing is **current-week-only** (`editable` prop, set when `week === currentWeek()`).

## Prod vs dev (the feature flag)

`apps/colign-frontend/src/lib/featureFlags.ts`:
`TIMELINE_TABS_ENABLED = import.meta.env.VITE_FEATURE_TIMELINE === "true"` (default OFF).

- **Prod (colign.org):** Vercel `colign-frontend` env has NO `VITE_FEATURE_TIMELINE`
  → tabs hidden in the sidebar AND the `dashboard`/`goals`/`commits` routes
  redirect to Plan (`WeeklyCommitApp.tsx`). When off, the "Aiming for" anchor
  renders on the Plan page (`WeeklyPlanPage.tsx`) so prod looks like before.
- **Dev (localhost:4173):** `apps/colign-frontend/.env.local` has
  `VITE_FEATURE_TIMELINE=true` → all tabs + editing. `.env.local` is gitignored,
  so a fresh clone must re-add it to see the tabs in dev.
- Wiring: `lib/featureFlags.ts` → `AppShell` → `SidebarShell` → `NavRail`
  (`showTimelineTabs` prop, defaults true for callers/tests); routes in
  `WeeklyCommitApp.tsx`; anchor in `WeeklyPlanPage.tsx`.

**To reveal the timeline in prod later (one step, no code change):** add
`VITE_FEATURE_TIMELINE=true` to the **colign-frontend** Vercel project
(Production scope) and redeploy the remote (`cd apps/colign-frontend &&
vercel deploy --prod`).

## State

- **HEAD = origin/main = `0dceec8`** (clean working tree; `AGENTS.md` +
  `docs/Gemini/` untracked are pre-existing, not this session).
- **Prod:** backend Fly @ V9 (`api.colign.org` UP), frontend remote on Vercel
  (flag off), host `colign.org`/`app.colign.org` 200.
- **Dev:** host :4173, remote :5174 (restarted to load the flag), backend :8080
  (real-Auth0, H2 — wiped on restart, re-onboard to test).
- **Tests:** frontend 166 (vitest), backend 76 (`mvn test` — NOT `mvn verify`;
  jacoco 0.80 gate fails pre-existing), tsc + `eslint --max-warnings=0` clean.

## Remaining / backlog

1. **User prod smoke test (auth'd):** confirm colign.org shows only Plan/
   Reconcile/Team + anchor-on-Plan; `/goals` redirects.
2. **Reveal-in-prod** when ready (flip the Vercel env var, above).
3. **gauntlet remote is behind** — only `origin` was pushed this session. Push
   `gauntlet main` if you keep it mirrored.
4. **Polish:** align week conventions (`PlanService.currentWeekStart()` uses
   next-or-same Monday; FE navigator uses previous-or-same — agree on Mondays,
   drift midweek). Versioned rename if ever wanted. A real strategy-tree
   endpoint would let "add objective" create an empty objective (today it
   creates the objective WITH a first outcome, since the tree is outcome-derived).

## Rollback

- Frontend: `vercel rollback` (or promote a prior deployment).
- Backend: `fly releases` → redeploy a prior image. Migrations V8/V9 are additive
  (nullable columns), so an app-only rollback is safe.

## Gotchas logged to the dev runbook this session

- **#7** New Tailwind classes render unstyled until `colign-compiled.css` is
  rebuilt (run `yarn dev:css` watcher; one-shot `yarn build:css`).
- **#8** Blank `:4173` (host) usually means the `:5174` remote dev server died —
  restart it (`cd apps/colign-frontend && ./node_modules/.bin/vite --port 5174`),
  then refresh. tsc/tests pass because it's a dead process, not bad code.
