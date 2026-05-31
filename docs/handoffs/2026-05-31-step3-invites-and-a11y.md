---
date: 2026-05-31
branch: main
focus: Step 3 team invitations (Resend + REPORT/PEER role-leveling) + WCAG M-tier fixes + first vitest tests
status: shipped — 6 commits, both remotes at HEAD 9d69f8f, tree clean
remotes: origin (github.com/jdijols/Colign) + gauntlet (labs.gauntletai.com/jasondijols/colign), both at 9d69f8f
companion: prior handoff at docs/handoffs/2026-05-31-colign-onboarding-create-team.md (HEAD was 27279b2)
---

# Handoff — Step 3 invites + WCAG + first frontend tests

Picks up from the 2026-05-31 onboarding handoff (`27279b2` → `9d69f8f`).
Step 3 of the north-star journey ("invited → committing weekly → manager
roll-up") is **shipped end-to-end** and verified live in mock mode. WCAG M-tier
backlog from the prior handoff is **closed out**. The repo got its first
vitest tests (17 of them) covering both new pages.

## What shipped this session (6 commits)

Run `git log --oneline 775cf90..9d69f8f` for the full list. In landing order:

1. **`e8aadac` — `feat(invites)`: team invites via Resend with REPORT/PEER role-leveling**
   - Backend: `Invitation` entity (`wc.invitation` table, V4 migration) +
     `InvitationService` + `InvitationController` + `EmailClient` /
     `ResendEmailClient` (RestTemplate POST to `api.resend.com/emails`,
     no-op log-only when `RESEND_API_KEY` is blank).
   - Endpoints: `POST /api/v1/teams/{teamId}/invitations`,
     `GET /api/v1/teams/{teamId}/invitations`,
     `GET /api/v1/invitations/{token}` (**public**, permitted in
     `SecurityConfig`), `POST /api/v1/invitations/{token}/accept`.
   - Frontend: `api/invites.ts` (RTK Query), `InviteTeammatesPage` at
     `/onboarding/invite`, public `InviteAcceptPage` at `/invite/:token`,
     `OnboardingChoicePage` routes to `invite` after createTeam, `AppShell`
     reads role from `/me` (not Redux bootstrap), `MockLogin` honors
     `state.from.pathname` for round-trip from invite accept.
   - **23 backend tests** green: 19 service unit (every invariant), 3
     controller wiring smoke, 1 existing smoke.
   - Verified live via curl in H2 + mock JWT: create team → IC, invite
     REPORT, public preview, invitee accepts, inviter `/me` flips to
     **MANAGER automatically**, re-accept → 410, wrong-email → 403.

2. **`d43fede` — `fix(a11y)`: radiogroup keyboard nav in CommitForm + ReconcileRow**
   - New `lib/radioGroup.ts` with `radioGroupKeyDown` + `radioTabIndex`
     helpers (roving focus, Arrow/Home/End, selection follows focus).
   - Applied to chess-layer pills (CommitForm) and reconcile-status pills
     (ReconcileRow). Adds `aria-label` to the ReconcileRow radiogroup.

3. **`2d02a19` — `fix(a11y)`: aria-live announcement on AlignmentBar updates**
   - Visible bar + text become `aria-hidden`; a sibling `sr-only` span
     with `aria-live="polite" aria-atomic="true"` carries the full sentence
     ("Alignment 75 percent. 6 of 8 commits on P0 or P1 outcomes.") so
     screen readers announce changes regardless of how they handle
     progressbar `aria-valuenow` updates.

4. **`f434467` — `fix(a11y)`: Field wires aria-describedby + aria-invalid into its child**
   - `Field` component (`components/ui/Label.tsx`) now generates stable IDs
     for `helpText` / `error` paragraphs and injects `aria-describedby` into
     a single React-element child via `cloneElement`. Existing
     `aria-describedby` is preserved and prepended.
   - `aria-invalid="true"` is injected when `error` is set (and the child
     hasn't already explicitly set it).

5. **`6801d70` — `fix(a11y)`: sortable TH activates via keyboard in TeamRollupTable**
   - "Direct report" header content moved into a real `<button>`. The TH
     keeps `aria-sort` for table semantics; the button provides native
     Enter/Space activation + focus ring + an `aria-label` announcing the
     current direction.

6. **`9d69f8f` — `test(invites)`: vitest coverage for InviteTeammatesPage + InviteAcceptPage**
   - **17 tests**, first frontend tests in the repo.
   - `InviteTeammatesPage`: disabled-state email validation, Skip↔Done
     swap, REPORT/PEER chip → mutation arg, no-team bounce, pending list
     render.
   - `InviteAcceptPage`: pending preview render, sign-in CTA, auto-accept
     on auth, real-mode `loginWithRedirect` with `appState.returnTo`,
     EXPIRED / ACCEPTED / REVOKED end-states, 403 = email-mismatch
     message + no nav.
   - Test infra: `src/test/render.tsx` (renderWithRouter + mockQuery
     builders). No vitest config change needed — already wired in
     `vite.config.ts`.

## Key decisions worth not re-litigating

- **Invitation token = opaque DB-stored base64url string** (24 random
  bytes), not JWT. Server owns expiry / revoke.
- **Email-match enforcement on accept** is case-insensitive against the
  resolved `User.email`, not raw JWT claim — UserResolver normalizes
  email from namespaced + bare claims, so we trust that.
- **Same-team accept is idempotent** (stamps the invitation accepted,
  returns current MeDto). Different-team accept is 409 — team-swap is a
  v2 flow.
- **Role-leveling is fully automatic**: REPORT accept sets
  `invitee.managerId = inviter.id`; `UserResolver.derivedRole(inviter)`
  returns MANAGER the next time it runs (`countByManagerId > 0`). No
  re-login, no Auth0 Roles, no role-claim mutation. **The "Team" nav
  link reads from `useGetMeQuery()` now (not Redux), so the UI also
  reflects the flip on next /me load.**
- **One invite-per-(email, team)**: re-issuing for the same recipient
  reuses the existing PENDING row and refreshes its expiry, so the
  recipient never has two live links.
- **Resend FROM** = `Colign <onboarding@colign.org>` per `.env.local`.
  **`colign.org` is NOT yet verified in the Resend dashboard** — first
  real send will likely 403. Either verify the domain or temporarily
  flip `RESEND_FROM="Colign <onboarding@resend.dev>"` (sandbox sender)
  in `.env.local`.
- **Invite URL shape** = `${colign.app.base-url}/invite/{token}`. Default
  base-url is `http://localhost:4173/weekly-commit` (pa-host + WC mount
  point). Swap to prod origin when deploying.
- **WCAG radiogroup pattern = "automatic"** (selection follows focus,
  matching native browser radios). Space/Enter fall through to the
  button's onClick so the CommitForm's toggle-on-click chess pills keep
  working.

## What's NOT done (the user can pick up here)

The original `Step 4 — strategy/RCDO authoring + outcomes` was deferred
by the user in the prior handoff. It is still deferred. Beyond that:

1. **Verify a real Resend email send.** Backend is wired up, the key is
   in `.env.local`, but no real send has been tested — the prior session
   ended before the user could trigger one. Likely needs `colign.org`
   verified in Resend first.
2. **Wire the inviter's "Invite teammates" CTA on My Week.** Today the
   invite screen is only reachable on the immediate post-create-team
   path. After that, a returning user has no way to send more invites
   without manually typing `/onboarding/invite`. Add a button in the
   AppShell or empty-state UI.
3. **Add an "Invitations" tab on the manager dashboard** that surfaces
   pending + accepted invites, with a "Revoke" action (the
   `InvitationStatus.REVOKED` state is already defined; the service
   doesn't have a revoke method yet).
4. **Step 4 (still deferred):** strategy/RCDO authoring + outcomes so a
   fresh team can link commits to real Outcomes.
5. **Deploy infra (multi-day):** backend hosting (Fly/Render/etc.),
   pa-host hosting (Vercel), managed Postgres + migration plan from
   H2 dev → Postgres prod, Auth0 callback URLs for the prod origin,
   DNS for `colign.org`, Resend domain verification. None of this
   blocks dev.

## Operational notes for next session

- **Boot recipe (real Auth0 mode, with Resend key sourced from .env.local):**
  ```bash
  cd apps/colign-backend && \
  set -a && source .env.local && set +a && \
  SPRING_PROFILES_ACTIVE=h2 \
  COLIGN_AUTH_MODE=real \
  COLIGN_AUTH0_ISSUER=https://dev-xpbf6g232kcce8nc.us.auth0.com/ \
  COLIGN_AUTH0_JWKS=https://dev-xpbf6g232kcce8nc.us.auth0.com/.well-known/jwks.json \
  COLIGN_AUTH_AUDIENCE=https://api.colign.org \
  JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
  PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH \
  ./mvnw spring-boot:run
  ```
  The `set -a; source .env.local; set +a` block exports `RESEND_API_KEY`
  + `RESEND_FROM` to the JVM env. Spring Boot does NOT auto-load .env
  files — this wrapper is the substitute.
- **The Resend key in `.env.local` is real and active.** User has
  explicitly opted out of rotation despite the public-repo risk. Do not
  re-flag.
- **H2 is in-memory:** every backend restart wipes teams / users /
  invitations. The mock-jwt mint flow re-provisions on next /me.
- **Frontend tests:** `yarn test` (vitest run) or `yarn test:watch`.
  Coverage exists for `InviteTeammatesPage` + `InviteAcceptPage` only;
  other pages still have zero unit tests.
- **The Field component now mutates its child** to inject
  aria-describedby / aria-invalid. If a future Field caller passes a
  fragment or multiple children, the injection silently skips (visible
  text still renders) — handle aria-describedby manually in that case.

## TL;DR for a fresh agent

Step 3 invitations are shipped, pushed (`9d69f8f`, both remotes, tree
clean) and fully tested at the backend layer (23) + frontend layer (17).
WCAG M-tier backlog is closed. Auth + onboarding + create + invite +
role-leveling all work end-to-end in mock mode. Next concrete unknown is
"will a real Resend send go out" — needs `colign.org` verified in the
Resend dashboard before the FROM address works. Read this doc + the two
2026-05-31 prior handoffs + the `colign-dev-runbook` memory before
booting.
