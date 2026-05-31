---
date: 2026-05-31
branch: main
focus: team onboarding (Option B) — onboarding gate + create team; wc→colign rename; auth fully working
status: in-progress — Steps 1 & 2 shipped + pushed (HEAD 27279b2), Step 3 (invite) next
remotes: origin (github.com/jdijols/Colign) + gauntlet (labs.gauntletai.com/jasondijols/colign), both at 27279b2
companion: context-save at ~/.gstack/projects/jdijols-Colign/checkpoints/20260531-011419-colign-onboarding-create-team.md
---

# Handoff — Colign team onboarding (create → invite → roll-up)

Picks up from the two 2026-05-30 handoffs (architecture site, design system + Auth0).
This session built **team onboarding** as the start of the product's real user
journey, did the full **wc → colign rename**, and got **real Auth0 login working
end to end**.

The product goal (user's words): build **Colign the product**, soft 1-day deadline.
North-star journey to optimize, minimizing user actions at each hop:
**invited → committing weekly → manager roll-up.**

## What shipped this session (all committed + pushed, HEAD `27279b2`)

Run `git log --oneline c5985e4..27279b2` for the list. The meaningful units:

1. **wc → colign full rename** (`ab74dd6`, `a883f77`, `5ee9c43`). Dirs
   `apps/colign-backend` + `apps/colign-frontend`; Java package `com.colign`
   (`ColignApplication`); MF remote name `colign`; identifiers `colignApi`,
   `#colign-root`, `colignStyles`, `colign-compiled.css`, `colignAccent`;
   localStorage `colign_jwt/email/role`; env vars `COLIGN_*`; Maven
   `com.st6.colign`. **PRESERVED on purpose:** DB schema `wc` (opaque, high-churn,
   invisible) and `WeeklyCommit*` feature names (the capability, not the brand).
2. **Auth resilience + profile** (`94c4d8e`, `bef27b9`, plus the UserResolver
   backfill). Auth0 is identity-only; a Post-Login Action copies email/name/picture
   into the access token under `https://colign.org/` namespace; role is DERIVED
   server-side. AuthGate surfaces token-fetch failures instead of hanging.
3. **Step 1 — onboarding gate** (`fe4a8f4`, in the pre-rename checkpoint commit).
   `GET /api/v1/me` JIT-provisions the user, returns `teamId` (null → onboarding)
   and DERIVED role. `OnboardingGate` routes teamless users to `/onboarding`.
4. **Step 2 — create team** (`3f31cd0` then real fix `2db9ce4`). `POST /api/v1/teams`
   creates the team, sets caller as `leadUserId` + attaches `teamId`, returns
   refreshed MeDto (single round-trip → app). Frontend: onboarding screen IS the
   create form — autofocused team-name input, Enter submits, join is an
   invite-link note. `createTeam` mutation upserts the getMe cache so OnboardingGate
   passes without a refetch race.
5. **Single nav shell** (`27279b2`). Removed `HostShell`; host is chrome-less and
   just routes. Each surface owns its nav (landing none, WC AppShell, architecture
   Sidebar). Fixed the double-header.

Verified end-to-end in mock mode via gstack browse: teamless login → focused input
→ type + submit → lands in My Week; `/me` returns the new `teamId`. Real Google
login verified manually by the user ("Welcome, Jason." → onboarding).

## Key architecture decisions (don't re-litigate)

- **Option B** (full onboarding) chosen over submission-safe. Terminology is
  **team** (not organization). Both settled.
- **Role is derived, never stored/claimed.** `UserResolver.derivedRole`: MANAGER if
  `countByManagerId>0`, else IC; ADMIN explicit. You become MANAGER the instant your
  first report joins — no re-login, no Auth0 Roles. The Auth0 Roles page is
  intentionally empty.
- **MF singletons:** react, react-dom, react-router-dom, @reduxjs/toolkit,
  react-redux, AND **@auth0/auth0-react** must all be `shared` singletons in BOTH
  vite configs. The missing auth0 singleton was the root cause of the infinite
  "Signing you in…" hang (remote read a dead context).
- **Onboarding = the create form itself**, not a create/join choice (minimize
  actions). Join is invite-link only.

## Auth0 dashboard state (user-owned, in `dev-xpbf6g232kcce8nc` tenant)

- New **Colign API**, Identifier `https://api.colign.org`. SPA `colign`
  (`S2Knde…`) authorized for User-delegated access. Allow Offline Access ON,
  Allow Skipping User Consent ON.
- Post-Login Action **"Add profile to access token"** in the Login flow — copies
  email/name/picture under `https://colign.org/`. (Verified injecting correctly.)
- Consent screen still appears on **localhost** — that's an Auth0 localhost
  security behavior, not a bug; it won't appear in prod behind a verified
  `colign.org`. Documented in `docs/AUTH0_BRANDING.md`.

## What's next (priority order)

1. **Step 3 — Invite** (the heart of the north-star). `Invitation` entity
   `{email, teamId, invitedBy, relationship: REPORT|PEER, status}` + migration;
   `POST /teams/{id}/invitations`; **Resend** email with invite link;
   accept-on-login attaches invitee with the right relationship → triggers
   role-leveling (inviter → MANAGER on first report join); members screen surfaced
   right after team creation. **Resend API key is in
   `apps/colign-backend/.env.local` (gitignored, never committed).** It was shared
   in chat and this repo is public — **ROTATE it before any real/public use.**
2. **Wire AppShell nav role from `/me`** (currently reads Redux bootstrap) so the
   "Team" link reliably shows for derived managers. Small; do with Step 3.
3. **Step 4 (deferred by user):** strategy/RCDO authoring + outcomes so a fresh
   team can link commits to real Outcomes; richer empty-week state.
4. **WCAG M-tier backlog:** radiogroup keyboard nav (CommitForm/ReconcileRow),
   aria-live on alignment %, Field aria-describedby, sortable `<th>` keyboard.

## Operational gotchas (cost real time this session — read before editing)

- **Run stack:** boot backend with `cd apps/colign-backend && SPRING_PROFILES_ACTIVE=h2
  COLIGN_AUTH_MODE=real COLIGN_AUTH0_ISSUER=… COLIGN_AUTH0_JWKS=… COLIGN_AUTH_AUDIENCE=https://api.colign.org
  JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=… ./mvnw spring-boot:run` — the `cd`
  must be in the SAME command or `./mvnw` → exit 127. Frontend/host:
  `./node_modules/.bin/vite --port 5174` / `--port 4173`. H2 is in-memory — every
  backend restart wipes all teams/users.
- **Write/Edit silently no-op against a file modified-since-read** (HMR/linter
  touches it). After writing any frontend file, `grep -c` a unique marker on disk
  BEFORE committing. Two commits this session claimed work that never landed →
  blank screens.
- **Deleting a frontend file → also delete its import**, or the whole MF remote
  module fails to load (blank screen with nav). Then restart vite with
  `rm -rf node_modules/.vite .mf @mf-types`.
- **tsc passes against stale `tsconfig.tsbuildinfo`** — `rm -f` it before trusting
  the gate.
- **Headless browse can't do real Google login.** To E2E an auth-gated flow: flip
  both `.env.local` + backend to mock, `node scripts/mock-jwt.mjs --email x --role IC`,
  inject under localStorage `colign_jwt/email/role`. RESTORE real mode after.
- Same gotchas live in project memory: `colign-dev-runbook.md`.

## TL;DR for a fresh agent

Auth + onboarding + create-team work and are pushed (`27279b2`, both remotes,
clean tree). Next is **Step 3: invite teammates via Resend with role-leveling** —
the piece that turns a one-person team into a manager-with-reports and unlocks the
roll-up. Rotate the Resend key first. Read `docs/handoffs/` (this + the two
2026-05-30 docs) and the `colign-dev-runbook` memory before booting.
