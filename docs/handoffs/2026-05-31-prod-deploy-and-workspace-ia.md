---
date: 2026-05-31
branch: main
focus: full production deploy (Fly + Vercel + Resend + Auth0, app live at colign.org) + root-domain/onboarding rework; PAUSED mid-brainstorm on workspace-management IA
status: prod LIVE — 12 commits, both remotes at HEAD 5daf3fe, tree clean; brainstorm in-progress (superpowers:brainstorming active)
remotes: origin (github.com/jdijols/Colign) + gauntlet (labs.gauntletai.com/jasondijols/colign), both at 5daf3fe
companion: gstack checkpoint ~/.gstack/projects/jdijols-Colign/checkpoints/20260531-205603-workspace-management-ia-brainstorm-prod-deploy.md (restore with /context-restore); prior handoff docs/handoffs/2026-05-31-step3-invites-and-a11y.md (HEAD was 9d69f8f)
---

# Handoff — Colign is LIVE in prod; resume the workspace-management IA brainstorm

Picks up from `docs/handoffs/2026-05-31-step3-invites-and-a11y.md` (`9d69f8f` →
`5daf3fe`). This session took Colign from "works locally" to **live in
production at https://colign.org**, reworked the app to serve from the root
domain with the HostHome landing, made onboarding's invite step skippable, and
then **paused mid-brainstorm** on the information architecture for
team/workspace management. Read `DEPLOY.md` (repo root) for the full runbook;
this doc is the narrative + the resume point.

## Production is live (all deployed + verified this session)

| Surface | URL | Platform |
|---|---|---|
| App (MF host) | **https://colign.org** (+ app.colign.org) | Vercel project `pa-host` |
| App (MF remote) | colign-frontend.vercel.app | Vercel project `colign-frontend` |
| API | **https://api.colign.org** | Fly app `colign-backend` |
| Database | — | Fly Postgres `colign-db` (iad, 1gb, no autostop, restart=always) |
| Email | from `onboarding@colign.org` | Resend (colign.org verified) |
| Auth | tenant `dev-xpbf6g232kcce8nc` | Auth0 + the user's **own Google OAuth keys** |

Deploy mechanics, env vars per service, secrets, rollback, and the known
GoDaddy/Vercel/MF gotchas are all in **`DEPLOY.md`** — don't re-derive them.

## What shipped (run `git log --oneline 9d69f8f..5daf3fe`)

- **Prod groundwork** (`0a6dd8e`): Dockerfile, fly.toml, prod Spring profile,
  env-driven CORS, two `vercel.json`, DEPLOY.md.
- **Backend → Fly** + Postgres + `api.colign.org` cert; first real H2→Postgres
  Flyway run succeeded.
- **Frontends → Vercel** (remote + host) with `/api` rewrite → Fly.
- **App at the ROOT domain** (`ddd407e`, `ae86bdd`): mounted the WC app at
  `colign.org/*` (no `/weekly-commit`); `pa-host` `RootGate` shows the HostHome
  landing when logged out and the app when logged in; the old ST6 `LoginPage` is
  retired in real mode.
- **Staged onboarding** then **made the invite step optional** (`5daf3fe`):
  landing → Auth0 → create team → (encouraged, skippable) invite → app. Backend
  `MeDto.needsInvite` exists for a future nudge but no longer gates (solo users
  are first-class).
- Reconciled an out-of-band **duplicate invitation implementation** that had
  leaked into the tree (duplicate `V4` migration, dead `colign.resend` config,
  orphaned `api/invitations.ts`) — all removed; the live impl is
  `V4__invitations.sql` / `colign.email` / `api/invites.ts`.

Tests stayed green throughout: backend 23 (JUnit), remote 18 (vitest), builds clean.

## RESUME HERE — workspace-management IA brainstorm (paused)

`superpowers:brainstorming` is **active**. The user accepted the **visual
companion** and asked to **see side-by-side screen-layout options in a browser**.

**Topic:** IA for Colign's team/workspace-management surfaces and how they fit
the broader product (weekly commits → strategic alignment → manager roll-up).
Concrete needs:
- An in-app way to **send more invites** (today invites live only in onboarding).
- A **"manage workspace"** surface: **remove members, rename team, team avatar/image**.
- The bigger question: how all the product surfaces are organized so a user reaches value.

**Next steps (per the skill):** visual companion (`/browse`) for side-by-side
layouts → clarifying questions one at a time → 2-3 IA approaches → sectioned
design (approval per section) → spec at
`docs/superpowers/specs/2026-05-31-workspace-management-ia-design.md` →
user review → `writing-plans`. **HARD GATE: no code until the design is approved.**
Downstream (after a plan exists) the user wants the gstack four-framework
reviews: `/autoplan` or the individual `/plan-ceo-review` / `/plan-eng-review` /
`/plan-design-review` / `/plan-devex-review`.

Grounding files for the IA: `apps/colign-frontend/src/components/AppShell.tsx`
(nav: My week / Reconcile / Team), `apps/colign-frontend/src/WeeklyCommitApp.tsx`
(routes), `apps/colign-frontend/src/pages/InviteTeammatesPage.tsx` (reuse its
form + `createInvitation` for the in-app invite entry).

## Suggested skills (next session)

1. `/context-restore` — loads the gstack checkpoint companion above.
2. `superpowers:brainstorming` — resume the paused brainstorm (the active job).
3. `/browse` — visual companion for the side-by-side layout mockups.
4. Later: `superpowers:writing-plans` (after spec approval), then `/autoplan`.

## Deferred follow-ups (track, not this session's focus)

1. **In-app invite entry for skippers** — subsumed by the workspace-management brainstorm.
2. **Auth0 custom domain** `login.colign.org` (removes the Auth0 badge + brands the
   login URL) — needs a **paid Auth0 plan** + DNS + `VITE_AUTH0_DOMAIN` swap + the
   Google redirect URI. Not a blocker.
3. **`www.colign.org`** → add to the pa-host Vercel project to redirect to apex.
4. **Full real-Google prod smoke test** on colign.org (login → create team →
   invite a real email → email arrives → accept on a 2nd account → MANAGER roll-up).
5. **Step 4 (still deferred):** strategy/RCDO authoring + outcomes.

## Gotchas

- **GoDaddy WebsiteBuilder hijacks the apex:** the colign.org A record kept
  reverting to the builder until the Website Builder site was disconnected. If it
  ever shows "Launching Soon" again, the builder got re-published.
- `/browse` Chromium uses the **system DNS resolver** (lagged the apex flip) —
  test on app.colign.org or `curl --resolve …:76.76.21.21` when the apex is mid-change.
- `mvn clean` before trusting backend tests if Flyway reports duplicate migration
  versions (stale `target/classes` copy).
- No secrets here by design — Resend key + DB creds in Fly secrets / gitignored
  `.env.local`; Auth0/Google client secrets in their dashboards.
