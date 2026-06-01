---
date: 2026-06-01
branch: main
focus: strategy onboarding (RCDO wizard) + plan-page polish + hiring-event production deploy
status: shipped to production — Slice 2c (Outcome request) + Slice 3 (manager UX, security hardening, async SLA) still queued
remotes: origin (github.com/jdijols/Colign) + gauntlet (labs.gauntletai.com/jasondijols/colign), origin at d857b40
companion: context-save at ~/.gstack/projects/jdijols-Colign/checkpoints/20260601-110641-hiring-event-handoff.md
---

# Handoff — strategy onboarding wizard, plan-page polish, production deploy

Picks up from the 2026-05-31 onboarding/create-team handoff. This session converted
the round-1 `/ce-doc-review` revisions (24 Applied + 4 Deferred decisions on
`docs/product-strategy-onboarding-plan.md`) into shipping code across three slices,
debugged production runtime issues live under deadline pressure, and deployed the
whole thing to colign.org with ~3 hours to spare before the user's hiring event.

## What shipped this session — `c30f085` (Slice 1) → `d857b40` (current main)

Run `git log --oneline 7bc19c6..d857b40` for the merge commits and the
two follow-on sidebar fixes. The meaningful units (in merge order):

1. **Hotfix #14 — onboarding redirect loop.** `InviteTeammatesPage` Skip/Done
   navigated `..` from `onboarding/invite` → landed on the team-create page,
   looked like a redirect loop. Fix: `navigate("/", { replace: true })` plus a
   defensive `Navigate to="/"` guard on `OnboardingChoicePage` when teamId is set.
   Regression tests on both Skip + Done.

2. **Slice 1 (PR #11) — Submit-plan rename + Positioning + plan-lock ownership.**
   - User-facing "Lock plan" → "Submit plan" across WeeklyPlanPage, tokens
     (`planStateLabel('LOCKED')` → "Submitted"), KpiCard, Cypress feature + step
     defs, PlanService backend error strings. Backend state name unchanged.
   - Flyway V6 adds POSITIONING to chess_tag (priority_rank=4, provisional).
     Frontend gets indigo tone entries in `CommitForm` + `chessTagTone` mapping.
   - `F-S3` security finding from the doc review: `PlanService.lock` now takes
     the caller and rejects non-owners with 403 (ADMIN override). Two new
     PlanServiceTest cases.

3. **Slice 2a (PR #12) — backend RCDO foundations** *(landed via autonomous /loop)*.
   - Flyway V7 denormalizes `team_id` onto `defining_objective` + `outcome`,
     backfills from the FK chain, then NOT NULL + FK + index.
   - New `RallyCryController`, `DefiningObjectiveController`, POST/PUT on
     `OutcomeController` → new `StrategyService` + 6 Create/Update DTOs.
   - Authz: `requireSameTeam(caller, target.teamId) && role IN (MANAGER, ADMIN)`
     **plus team-lead/creator override** (the autonomous agent generalized my
     strict MANAGER+ADMIN — necessary so solo creators can author strategy).
   - `MeDto.strategySetupComplete` (computed via `outcomeRepository.existsByTeamId`)
     + 422 gate on `WeeklyCommitController.add`.
   - Closed a cross-tenant read: `OutcomeController.list` now team-scoped.

4. **Slice 2b (PR #13) — strategy onboarding wizard + StrategyAnchor + empty-state
   polish.** Originally landed via the autonomous loop, then extended in the
   foreground with a UX pass after user testing.
   - 3-step wizard (`StrategyWizardShell` + `StrategyRallyCryPage` /
     `StrategyObjectivePage` / `StrategyOutcomePage`): "Step N of 3" indicator,
     single input, Back preserves prior node, browser-close resume via team-keyed
     localStorage.
   - `OnboardingChoicePage` post-create now navigates to `strategy/rally-cry`.
     Invite reposition as Step 4.
   - `OnboardingGate` behavior matrix: teamless → create-team; author + incomplete
     → wizard; plain IC + incomplete → "ask your admin" empty state
     (`StrategySetupPendingPage`); complete → app.
   - **Same Skip/Done fix as the hotfix** also applied here (the 2b branch was
     stacked off 2a, not off main, so it didn't have #14 yet).
   - **`StrategyAnchor` component** — slim "Aiming for · RC → DO → [P0] Outcome"
     header at the top of every plan surface. Renders full chain for the
     post-wizard N=1 case; collapses to "N Objectives · M Outcomes" once the
     team's strategy grows. Reuses `useListOutcomesQuery` (RTK-cached, no extra HTTP).
   - **Empty-plan rewire** — when `commits.length === 0`, the small top-right
     Add commit hides and a centered hero CTA takes over with copy that names
     the Outcome by title ("Pick a deliverable that moves '[Outcome]' forward
     this week"). `CommitForm` now pre-selects the only Outcome on mount when
     N=1 so the user goes straight to typing the deliverable.

5. **Two post-merge fixes on main:**
   - `7aae847` — collapsed-sidebar user popover was clipped at the sidebar's
     right edge (parent `<aside>` carries `overflow-hidden`). Portaled the
     popover with `position: fixed` + computed `getBoundingClientRect()` coords.
   - `d857b40` — that portal target was `document.body` which dropped Tailwind
     utilities (remote's tailwind.config scopes `important: "#colign-root"`).
     Switched portal target to `#colign-root` so utilities apply AND
     `overflow-hidden` is escaped.

## Production deploy (Fly + Vercel + Auth0)

All three surfaces live and verified:

- **Backend (Fly): `api.colign.org`** — `fly deploy --app colign-backend` from
  `apps/colign-backend`. V7 migration ran cleanly on startup. `/actuator/health`
  returns `{"status":"UP"}`. `/api/v1/rally-cries` returns 401 (auth gate working
  + new endpoint live).
- **Remote (Vercel): `colign-frontend.vercel.app`** — required adding 3 env
  vars to the project (`VITE_AUTH_MODE=real`, `VITE_AUTH0_AUDIENCE`,
  `PUBLIC_PATH=/`). They were missing entirely; first deploy rendered the mock
  sign-in screen in production because the build defaulted to mock.
- **Host (Vercel): `colign.org`** — host's env vars were already correctly set.
  `vercel deploy --prod --force` from `apps/pa-host`.

Auth0 tenant `dev-xpbf6g232kcce8nc` is shared dev+prod with `colign.org` and
`app.colign.org` whitelisted as Callback / Logout / Origins.

## Critical runbook updates baked in this session (in `colign-dev-runbook` memory)

- **`/weekly-commit/` URL prefix is gone.** Remote now mounts at the host root
  via `pa-host/src/App.tsx`'s `/*` catch-all. Use `http://localhost:4173/` or
  `/login`, NOT `/weekly-commit/login` (blank page).
- **Auth-mode mismatch = 401 on every API call.** Both frontends' `.env.local`
  carry `VITE_AUTH_MODE=real`; default dev recipe is real-mode backend matching.
  Use mock mode only when also bypassing the UI login and minting via
  `/__dev__/mint` or `scripts/mock-jwt.mjs`.

## Local dev stack (still running at handoff)

| Service | URL | PID |
|---|---|---|
| Host (open this) | `http://localhost:4173` | 64180 |
| Frontend remote | `http://localhost:5174` (don't open directly) | 64163 |
| Backend (real Auth0 mode, H2) | `http://localhost:8080` | 68690 |

Kill with `kill 64180 64163 68690`. Stack is on `feat/slice-2b-strategy-wizard`
branch (pre-merge state) — the two post-merge sidebar fixes (`7aae847`, `d857b40`)
aren't reflected in this working tree but are live in production.

## Project Brief alignment check

Per `Project-Brief.md`: brief requires Weekly Commit CRUD with RCDO linking,
chess layer with prioritization, full state-machine lifecycle, reconciliation,
manager dashboard, MF integration. Brief does **NOT** require RCDO CRUD UI.

This session deliberately scoped OUT building RCDO edit/delete UI despite user
asking; brief frames RCDO authoring as upstream of the weekly cycle and the
wizard already handles bootstrap. The data path (StrategyAnchor renders N DOs
and M Outcomes) is ready when a future iteration adds the +Add Objective /
+Add Outcome surface.

## What's NOT done (next sessions)

1. **Slice 2c — Outcome request flow.** Largest remaining piece. Flyway
   `outcome_request` table + `weekly_commit.outcome_request_id` with CHECK
   constraint relaxing `outcome_id`; OutcomeRequest entity + endpoint with rate
   limits / size caps / dedup; `CommitForm` "Request missing Outcome" drawer +
   pending badge + IC approval/rejection feedback; manager approval queue.
2. **Slice 3a — manager request-changes marker.** Flyway columns on `plan`,
   `PlanService.requestChanges` + authority check, `WeeklyPlanPage` banner.
3. **Slice 3b — security hardening.** `WeeklyCommitController.add/update/delete`
   ownership checks, `ManagerController.team()` team-scope filter, audit log.
4. **Slice 3c — async review SLA + manager daily digest.**
5. **4 Deferred decisions** in the plan doc (mandatory gate strictness,
   Positioning ship/cut, N=1 minimum, bundling) — bundling is implicitly
   resolved by the slice split; the other 3 still need product calls.

## Known pre-existing conditions

- `mvn verify` fails jacoco coverage (0.64 vs 0.80). Pre-existing on main,
  confirmed with stashed-clean run. Use `mvn test`, not `mvn verify`, until
  coverage gets a dedicated cleanup pass.
- Open PRs from prior sessions still present: #6 (auth startup guard) + #7
  (rotate mock JWT keypair). Not touched by this work.
- Working tree has untracked `AGENTS.md` and `docs/Gemini/`. Pre-existing.
