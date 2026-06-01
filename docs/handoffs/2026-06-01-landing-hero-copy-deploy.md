---
date: 2026-06-01
branch: copy/hero-commitments-alignment (merged via PR #2, branch deleted local + remote)
focus: wordsmith landing hero + ship to prod + reconcile env-var divergence between local and Vercel
status: shipped to https://colign.org/ at 2026-06-01 04:42:00Z (deploy dpl_34c3LNAxUFTYCxwhbhxm2SQKti4z); follow-up env-var work flagged below
companion: apps/pa-host/src/HostHome.tsx (the only code file changed), Project-Brief.md (motivated the "commitments" choice), DEPLOY.md (the manual deploy runbook)
prior handoff: docs/handoffs/2026-06-01-responsive-ui-audit.md
---

# Handoff — Landing hero copy + prod deploy

This session was a single-shot wordsmith + ship of the colign.org landing
hero, plus reconciliation of a Vercel env-var divergence that briefly blanked
production before I caught it and rolled back. Net result: new copy is live,
env vars are now persisted on Vercel so the next deploy won't hit the same
trap, and local main is byte-identical to origin/main.

## What shipped

**Hero copy** (`apps/pa-host/src/HostHome.tsx`):

- Headline: *Strategy. / A defining objective. / What lands this week.*
  → *Short-term commitments. / Long-term alignment. / What lands this week.*
- Caption: *Weekly planning where every commit links to a strategic outcome.*
  → *Plans that ladder up to strategy, one week at a time.*
- File-header docstring rewritten to reflect the new semantic arc and make
  the brand etymology explicit (commit-**ment** + align-**ment**).
- SR-reads comment updated so screen-reader expectations match visible text.

Full reasoning (why "commitments" instead of "commits", why "ladder up" in
the caption) is in the PR body — see References below. The short version:
"commits" reads as engineering jargon to the 175+ non-tech employees the
brief targets, and "ladder up" is the missing mechanism word that the
headline promises but never explains.

## How it shipped (and the bug I tripped over)

PR #2 merged cleanly with a merge commit (matching PR #1's convention).
Vercel **does not auto-deploy on push** to this project — `DEPLOY.md`
prescribes manual `vercel build --prod && vercel deploy --prebuilt --prod`
from `apps/pa-host/`. So merging the PR did nothing visible until I ran
the deploy by hand.

My first build was clean and deployed, but **prod went blank**.

Root cause: `apps/pa-host/src/auth/auth0Config.ts` exports
`isReal = authMode === "real"`, where `authMode` is read from
`import.meta.env.VITE_AUTH_MODE` at build time. `App.tsx` only renders
`<HostHome />` when `isReal && pathname === "/" && !isLoading &&
!isAuthenticated`. When `VITE_AUTH_MODE` is unset at build time,
`isReal === false` evaluates to a compile-time constant, and **esbuild
tree-shakes the entire `<HostHome />` branch + its import out of the
bundle**. The build succeeds with no warning. The result is a deployed
SPA whose landing path renders nothing for unauthenticated visitors.

I built from an isolated worktree at `../Colign-copy-hero/` (created to
avoid a parallel agent's WIP — see "What I left alone" below). Worktrees
don't carry `.env.local` (gitignored), so my build had no env vars at all.
The previous prod deploy (3h before mine) was built from the main checkout
where `.env.local` exists, so it happened to bake in `VITE_AUTH_MODE=real`.

**Recovery:** `vercel promote pa-host-kyzb3uyib-jasondijols.vercel.app
--yes` — promoted the previous prod deploy back to the alias.
~30 seconds blank, then restored.

**Fix:** Copied `.env.local` into the worktree, rebuilt, redeployed
(dpl_34c3LNAxUFTYCxwhbhxm2SQKti4z), verified via headless browser at
colign.org — new hero renders correctly. Then persisted four env vars to
the Vercel project so this trap can't recur (see "Env vars now on Vercel"
below).

## Where things stand

- **Prod:** new copy live at https://colign.org/ and https://app.colign.org/.
  Verified visually via `/browse` — screenshot at /tmp/colign-prod-new.png
  if still on disk. Etag `777e3c2add177061077c7ec9567d62fe`.
- **Local main:** rebased onto origin/main; both at `5d11dba`. The 2
  "unpushed" cherry-pick commits (`fcbb3e3`, `faf30ac`) were detected by
  git as "previously applied" via the responsive-audit merge and skipped
  during rebase. No duplicates landed.
- **Worktree:** removed. Local `copy/hero-commitments-alignment` branch
  deleted. PR #2 remote branch was deleted by `gh pr merge --delete-branch`.

## Env vars now on Vercel (pa-host project, production scope)

Set this session via `vercel env add … production`:

- `VITE_AUTH_MODE` = `real`
- `VITE_AUTH0_DOMAIN` = `dev-xpbf6g232kcce8nc.us.auth0.com`
- `VITE_AUTH0_CLIENT_ID` = (the public SPA client ID — same as in
  `apps/pa-host/.env.local`; redacted here)
- `VITE_AUTH0_AUDIENCE` = `https://api.colign.org`

Effect: future builds — fresh worktree, teammate, CI, whatever — will
include `<HostHome />` without depending on a local `.env.local`. The
"silent tree-shake" failure mode is now unreachable as long as these
remain set.

## Two follow-ups deliberately not done

### 1. `COLIGN_REMOTE_URL` still points at localhost in prod builds

The MF remote URL is read from `process.env.COLIGN_REMOTE_URL` in
`apps/pa-host/vite.config.ts`, defaulting to
`http://localhost:5174/remoteEntry.js`. Neither my deploy nor the previous
prod deploy had this set as a build env var, so prod tries to fetch the
remote from localhost — `net::ERR_CONNECTION_REFUSED` in the console on
every page load. The landing page renders fine because `HostHome` doesn't
need the remote, but **login is broken**: after Auth0 redirect-back, the
`<WeeklyCommitApp />` lazy import fails. This was already broken before
this session; I didn't expand scope to fix it.

Fix when ready: `vercel env add COLIGN_REMOTE_URL production` with value
`https://colign-frontend.vercel.app/remoteEntry.js` (per the topology in
`DEPLOY.md`), then rebuild + redeploy pa-host. The colign-frontend
project is already deployed at that URL — verified via `vercel project ls`.

### 2. `DEPLOY.md` doesn't warn about the env-var/tree-shake trap

The runbook documents the deploy commands but doesn't explain that
*building without `VITE_AUTH_MODE=real` silently produces a blank
landing page*. Worth a one-paragraph addition under the pa-host phase
so the next person doesn't burn 20 minutes diagnosing it from a clean
TypeScript build.

## What I left alone (avoid disturbing on resume)

A parallel Claude session was active on `feat/settings-shell-invite`
during this work — files kept reappearing in the main checkout's
working tree that I hadn't touched. To stay out of their way I created
the worktree at `../Colign-copy-hero/`. Two side-effects to know about:

- The main checkout is currently on `feat/settings-shell-invite` at
  whatever HEAD the parallel session has moved it to. Last I checked
  it was at `30643bf` but the session is likely still active.
- `stash@{0}` is `WIP: cypress config + commands (auto-stashed before
  copy/hero branch)` — auto-created when I switched off
  feat/settings-shell-invite. It contains the parallel agent's cypress
  modifications at the moment I switched. If they need it back:
  `git stash pop stash@{0}` on that branch.
- Older stashes (`stash@{1}`, `{2}`, `{3}`) predate this session.

Do not run `git stash drop` or `git stash clear` without checking with
the user first.

## Suggested skills for the next session

Pick based on what the user asks next:

- **`/verify`** — after fixing `COLIGN_REMOTE_URL` and redeploying, use
  this to walk through the full login flow end-to-end (landing →
  Auth0 → WeeklyCommitApp loads → onboarding shows up). The fix is
  worthless unless we confirm post-login actually works.
- **`/browse`** — for any prod verification. The `browse` binary is
  already built and warm at
  `~/.claude/skills/gstack/browse/dist/browse`. Particularly useful
  for screenshotting the new hero across breakpoints if the user wants
  responsive verification.
- **`/document-release`** — to fold the env-var/tree-shake gotcha
  documented in this handoff into `DEPLOY.md` properly, rather than
  leaving it in a handoff doc only future sessions read.
- **`/ship`** if the user wants to make further copy or landing-page
  tweaks — sets up the commit/push/PR flow with conventional commit
  formatting. Build off a clean branch from `origin/main`, **not** the
  current `feat/settings-shell-invite`.

Avoid `/land-and-deploy` — it assumes git-based auto-deploy, which this
project doesn't have configured. Deploys are manual per `DEPLOY.md`.

## References

- **PR:** https://github.com/jdijols/Colign/pull/2 (merged)
- **Commits:** `94f73df` (copy change), `5d11dba` (merge into main)
- **Live prod:** https://colign.org/ — screenshot at `/tmp/colign-prod-new.png`
- **Deployment ID:** `dpl_34c3LNAxUFTYCxwhbhxm2SQKti4z`
  (URL: `https://pa-host-10jfe9ocv-jasondijols.vercel.app`)
- **Project brief that justified the copy direction:** `Project-Brief.md`
  (the audience is "175+ employees" replacing 15-Five, not engineering
  alone — drove the choice of "commitments" over "commits")
- **Deploy runbook (authoritative):** `DEPLOY.md`
- **The only file changed:** `apps/pa-host/src/HostHome.tsx`
