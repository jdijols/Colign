---
date: 2026-05-31
status: draft
branch: main
related:
  - docs/handoffs/2026-05-31-prod-deploy-and-workspace-ia.md
  - Project-Brief.md
  - DEPLOY.md
authors: jasondijols + Claude (brainstorming skill)
---

# Workspace-Management IA — Design Spec

## 1 · Goal & frame

Today, Colign has no in-app surface for managing the team you onboarded into.
Invitations live only on the onboarding screen; a typo in a team name is
permanent; there's no way to remove a member who left; no team identity beyond
the literal string passed to `POST /api/v1/teams`. The Project Brief assumes
managers can roll up their team's commits at scale ("up to 2000 records") but
gives no shape to the day-to-day administration that keeps the team
membership clean for that roll-up to be meaningful.

**This spec adds that admin layer** — a `/settings` route reachable from the
app header — as a focused, additive change. No nav overhaul. No fake
features. Every UI element ships against a real endpoint, and the work is
staged into 4 small PRs that can each ship to prod without breaking
anything that's working.

Scope is sized for the brief's 1-week clock: bias toward simplest endpoint
shape that satisfies the journey, defer storage/upload niceties.

## 2 · User journeys

Four concrete journeys this spec is responsible for. Each one ends at a
working surface that satisfies a real user need.

### J1 · Solo lead invites a teammate after onboarding
Jason creates "Acme Co," skips the onboarding invite step, lands in
*My week*. A day later he wants to invite Alice. Today: dead end.
**After:** clicks avatar in header → *Workspace settings* → *Invitations*
section → enters Alice's email + REPORT → invite sent. Same form he saw
during onboarding, same Resend email, same accept link. Re-entry is fine —
he can send more later.

### J2 · Lead corrects a typo in the team name
Jason fat-fingered "Acme C" at onboarding. Today: stuck with it forever.
**After:** Settings → *Team* section → edits the name → Save. The new name
appears wherever team identity is shown (header pill, manager dashboard,
invite emails going forward).

### J3 · Manager removes a teammate who left
Alice is a manager; her direct report Ben quit. She needs Ben out of the
roll-up so it stops counting him.
**After:** Settings → *Members* → finds Ben → *Remove* → confirms in dialog
that explains what happens to anyone reporting *to* Ben. Ben loses team
access on next request; his reports (if any) become unmanaged (orphaned
`manager_id`) so the team lead can manually reassign — explicit decision,
no silent reassignment.

### J4 · Lead sets the team's visual identity
Jason wants a team avatar so the workspace feels owned, not generic.
**After:** Settings → *Team* → pastes an image URL (v1) — saved, the
avatar appears next to the team name in the AppShell header. File-upload
ergonomics deferred to v2; URL field is the minimal-storage call (no
new infra).

## 3 · In scope (full, holistic)

| # | Feature | Surface | Backend |
|---|---------|---------|---------|
| F1 | In-app invite entry (J1) | `/settings` *Invitations* section reusing `InviteTeammatesPage` | None (existing endpoints) |
| F2 | View team members | `/settings` *Members* section, read-only list | New `GET /api/v1/teams/{id}/members` |
| F3 | Rename team (J2) | `/settings` *Team* section, name + description inputs | New `PATCH /api/v1/teams/{id}` |
| F4 | Remove member (J3) | Per-row action in *Members* with confirm dialog | New `DELETE /api/v1/teams/{id}/members/{userId}` |
| F5 | Team avatar (J4) | URL input in *Team* section; display in AppShell + invite emails | V5 migration: `team.avatar_url`; PATCH endpoint extended |
| F6 | Entry point | Avatar-initial button in AppShell top-right → menu with email/role header + two actions (*Workspace settings* · *Sign out*) | None |

## 4 · Out of scope (explicit parking lot)

Recorded so the next session doesn't accidentally drag them back in.

- **Left-sidebar navigation rewrite.** Stays as the existing top nav. The
  sidebar shift is its own design pass, post-v1.
- **Workspace switcher / multi-workspace / "+ New workspace."** No
  multi-tenant story in the data model; would be misleading UI.
- **Account dropdown with multiple accounts.** Same reason.
- **Manager-of-managers tree in the sidebar.** Out of scope; the existing
  `/manager/team` endpoint covers single-level roll-up per the brief.
- **Commits-as-atomic-unit restructure of the main views.** Future IA pass.
- **Real file upload for team avatar.** Defer; URL field is the v1 storage
  story. File upload deserves its own decision (S3 vs Fly volume vs CDN).
- **Transfer team lead.** No need yet; lead is the team creator and the
  permissions model below special-cases them. Build when a real user is
  blocked.
- **Per-member role editing in the Members list** (promote / demote).
  Role is derived from `manager_id`, so "promoting" is implicit when
  someone gets a report. No editor needed.
- **Billing surface in Settings.** No plans / billing exist yet.
- **Workspace popover** (Notion-style top-left pill). The avatar/name
  *display* in the header is a precursor; the popover with switcher comes
  with multi-workspace work.

## 5 · Information architecture

### Entry point
AppShell header (existing, ~125 LOC) gains one element on the right:

```
[Colign brand] [Team avatar + name?]            [Theme] [Avatar button ▾]
```

- Team avatar + name appear once F5 ships (PR 4). Until then, the header
  is unchanged on the left.
- The right side replaces today's `email · ROLE · Theme · Sign-out` strip
  with `Theme · Avatar button`. The avatar opens a popover menu:
  - Header (non-interactive): `email · ROLE` text — same content as today,
    just relocated from the always-on strip.
  - *Workspace settings* → navigates to `/settings`
  - *Sign out* → existing flow (Redux `signOut` + Auth0 `logout`)
- Avatar content: user's existing `app_user.avatar_url` if present, else
  initial of `displayName`. No new dependency.

### `/settings` route
Mounted under `AppShell` via Router `Outlet` (same pattern as
`WeeklyPlanPage`, `ReconcilePage`, `ManagerDashboardPage`). Single
column, max-w-2xl, three stacked sections:

1. **Team** — name + description inputs, avatar URL input. Save button.
   Editable for users who can update the team per §7 (managers, admins,
   team lead); read-only for everyone else, with a "Only managers can
   edit team details" explainer.
2. **Members** — table-style list. Columns: avatar/name, email, role, joined.
   Per-row *Remove* button for managers/admins (hidden for self and for
   team lead). Pagination only if member count > 50 (defer).
3. **Invitations** — embeds `<InviteTeammatesPage>` form + pending list,
   minus its full-screen layout chrome. Refactor `InviteTeammatesPage`
   into a reusable `<InviteForm>` component + the page wrapper that
   centers it for the onboarding flow.

No tabs. No left rail. One column, three `<section>` headings. Anchors
(`/settings#members`) so the avatar menu can deep-link to the right
section in v2.

### What does NOT change
- Top nav: *My week · Reconcile · Team* — untouched.
- Existing routes — untouched.
- `OnboardingGate`, `AuthGate`, `Auth0Bridge` — untouched.
- The `/onboarding/invite` page continues to exist (just internally
  rendered via the new `<InviteForm>` component).

## 6 · Backend changes

All additions, no breaking changes to existing endpoints. All entities
keep `AbstractAuditingEntity` per the brief. Spring Data JPA, Lombok
`@Builder`/`@Getter`/`@Setter`, no `@Data`.

### 6.1 · `GET /api/v1/teams/{teamId}/members` (F2)
Returns every `app_user` with `team_id = :teamId`. Caller must be a member
of that team (any role). Pagination via Spring Data `Pageable`, default
size 50, max 2000 (matches brief). Response is a `Page<TeamMemberDto>` —
same DTO already used by `ManagerController.team()`, so the FE only
learns one row shape.

Why not just extend `ManagerController.team()`? That endpoint is scoped
to direct reports of the caller. Workspace members are scoped to the
team. Different domain. New endpoint, shared DTO.

### 6.2 · `PATCH /api/v1/teams/{teamId}` (F3, F5)
Body: `UpdateTeamRequest { name?, description?, avatarUrl? }` — every
field optional, only non-null fields applied. Validation: `name`
trim-non-empty, ≤120 chars (matches column); `description` ≤2000;
`avatarUrl` is a valid http(s) URL ≤500 chars (matches `app_user.avatar_url`).
Returns the updated `TeamDto` (new DTO; minimal: `id`, `name`,
`description`, `avatarUrl`, `leadUserId`).

Auth: see §7.

### 6.3 · `DELETE /api/v1/teams/{teamId}/members/{userId}` (F4)
Removes the membership: sets the target's `team_id` to `NULL` and
`manager_id` to `NULL`. Returns 204.

Cascading effect — explicit, not silent:
- Anyone whose `manager_id` was the removed user: `manager_id` set to
  `NULL` (orphan). Their `derivedRole` recomputes — likely IC. They
  remain on the team; the lead can re-establish manager relationships
  via re-invitation flow in a future iteration (manual SQL acceptable
  short-term given the rare event).
- The removed user's own plans, weekly_commits, reconciliations are
  preserved (audit trail). They become reachable via direct user query
  only; team-scoped queries skip them naturally.
- Removed user, on next `/me` call, will have `teamId=null` and get
  bounced through `OnboardingGate` to `/onboarding`. They can create
  or accept a new team.

Auth: see §7.

### 6.4 · V5 migration — `team.avatar_url` (F5)
```sql
ALTER TABLE wc.team ADD COLUMN avatar_url VARCHAR(500);
```
Backwards-compatible. Existing rows have `NULL` avatar; AppShell falls
back to a generated initial. No backfill needed.

### 6.5 · Invite email enrichment (F5, soft)
Once teams have avatars, the invite email template should render the
team avatar in the header to give the recipient context. This is a
~5-line template change that ships in PR 4 alongside the avatar feature.

## 7 · Permissions model

Mostly derived from existing `UserResolver.derivedRole`:
- `ADMIN` — DB-flagged (instance operator)
- `MANAGER` — anyone with ≥1 direct report
- `IC` — otherwise

For workspace settings actions:

| Action | IC | Manager | Admin | Team lead (special) |
|--------|----|---------|--|-----|
| View Settings page | ✅ | ✅ | ✅ | ✅ |
| Invite (existing) | ✅ | ✅ | ✅ | ✅ |
| View Members list | ✅ | ✅ | ✅ | ✅ |
| Rename team / set avatar | ❌ | ✅ | ✅ | ✅ |
| Remove member (other) | ❌ | ✅ | ✅ | ✅ |
| Remove self | ✅ | ✅ | ✅ | ❌ |
| Remove team lead | ❌ | ❌ | ✅ | n/a |

**Team-lead special case:** the user whose `id == team.lead_user_id` is
always allowed manager-equivalent actions on that team, even if they
have no reports yet (i.e., a solo lead can rename their own team). This
avoids the soft bug where a solo user can't manage what they own.

**"Remove self"** = leave team. Lead cannot leave (no transfer-lead in
v1). Anyone else can; UX confirms with explicit copy.

Backend enforces all four conditions in the service layer (not the
controller), with `@Transactional` + `403 Forbidden` for denials. Frontend
hides actions the user can't take but never relies on FE gating alone.

## 8 · Edge cases & decisions

| Case | Decision |
|------|----------|
| Removing a manager who has reports | Orphan reports (`manager_id = NULL`). Manual reassignment by lead. UX warns in the confirm dialog. |
| Renaming team to empty / whitespace | Validation error, FE + BE. Trim before validate. |
| Setting avatar URL that 404s or is non-image | Save as-is; FE attempts to render with fallback to initial on `<img onerror>`. No server-side URL validation beyond format. |
| Member list with 0 members other than self | Renders just the lead, no empty state. |
| Settings page hit by a teamless user (somehow bypassing the gate) | Same bounce as `/onboarding/invite` today: `Navigate to=".."` |
| Concurrent rename: two managers save at once | Optimistic concurrency via `version` column on `team` (already on `AbstractAuditingEntity`). Second save gets 409, FE refetches + retries. |
| Invite emails sent before avatar was set, then avatar set | No retroactive update. New invites get new template; old emails are immutable. |
| Removed user holds outstanding invitations they issued | Invitations stay valid — they're scoped to the team, not the inviter. Acceptance still works. |
| Team with no lead (`lead_user_id` somehow `NULL`) | Manager-or-admin gate falls back cleanly (no lead-special branch). Defensive; doesn't happen in v1's flow. |

## 9 · Staged shipping plan (4 PRs)

Each PR is independently shippable, independently verifiable in
`dev/prod`, and leaves the app in a working state.

### PR 1 · Settings shell + in-app invite entry (F1, F6) — FE only
- Refactor `InviteTeammatesPage` into `<InviteForm>` component + thin page wrapper.
- Add avatar-initial button + menu to `AppShell` header.
- Add `/settings` route under `AppShell` with three section placeholders;
  only *Invitations* renders content (the `<InviteForm>`).
- Existing `email · ROLE` text moves into the menu as a header item.
- Cypress: `workspace-settings.feature` — log in, click avatar, click
  Settings, send invite, see pending row.
- Vitest: `<InviteForm>` renders form, dispatches mutation, shows
  pending invites.
- **Risk:** None. No backend changes. Existing onboarding invite flow
  unchanged (uses the same component now).
- **Verify in dev:** open `colign.org` (or `app.colign.org`), click
  avatar, send a test invite to a real address.

### PR 2 · Members list (read-only) + rename team (F2, F3)
- Backend: add `GET /api/v1/teams/{id}/members` + `PATCH /api/v1/teams/{id}`.
- RTK Query slice `teams.ts` with `useGetTeamMembersQuery` +
  `useUpdateTeamMutation`. Cache invalidation on update.
- *Members* section renders the list; *Team* section becomes editable
  for managers/lead, disabled for ICs with a tooltip.
- New DTOs: `TeamDto`, reuse `TeamMemberDto`.
- Cypress: extend `workspace-settings.feature` — rename team, verify name
  appears in `/me` response and (once PR 4 ships) header.
- JaCoCo: cover `TeamService.updateTeam` + `TeamService.listMembers`.
- **Verify in dev:** rename your team, see it persist across refresh;
  see all members listed.

### PR 3 · Remove member (F4)
- Backend: `DELETE /api/v1/teams/{id}/members/{userId}` with the
  cascading-orphan logic from §6.3.
- FE: per-row *Remove* button (gated by permissions), confirm dialog
  with explicit "X reports will become unmanaged" copy.
- Cypress: scenario that seeds a manager + 2 reports, removes the
  manager, asserts reports' `managerId` is null.
- JaCoCo: cover orphan logic, lead-block, self-leave allowed/blocked.
- **Verify in dev:** remove a test user, confirm they get bounced to
  `/onboarding` on next request.

### PR 4 · Team avatar (F5)
- V5 Flyway migration: `team.avatar_url`.
- Backend: extend `PATCH /api/v1/teams/{id}` to accept `avatarUrl`.
- FE: URL input in *Team* section; preview render with onerror fallback.
- AppShell: add `<TeamPill>` element showing team avatar + name to the
  left of the nav (or after the Colign brand). Read from `useGetMeQuery`
  (extend `/me` to include team name + avatar, or add `useGetTeamQuery`).
- Invite email template: add team avatar header.
- Cypress: set avatar URL, verify it renders in header + settings.
- **Verify in dev:** paste any image URL, see it in the header.

PR 1 ships the user-visible win (in-app invites) and is genuinely
zero-risk. PRs 2–4 land at the cadence we can verify each in dev. No PR
breaks anything that previously worked.

## 10 · Testing plan

Per brief (JaCoCo ≥ 80% backend, Vitest FE units, Cypress + Cucumber BDD).

### Backend (JUnit + JaCoCo)
- `TeamServiceTest` — create/rename/update-avatar/list-members/remove-member,
  including permission denials and the cascading-orphan path.
- `TeamControllerTest` — `@WebMvcTest` slice testing 200/403/404/409 paths.
- `InvitationServiceTest` — unchanged, but verify removed-user-with-invites
  scenario.
- Coverage target: keep TeamController-related classes ≥ 80%.

### Frontend (Vitest)
- `<InviteForm>` — form validation, mutation dispatch, error rendering.
- `<MembersList>` — renders members, gates remove button by role.
- `<TeamSettingsForm>` — disabled for ICs, enabled for managers/lead,
  validation errors render.
- `<AppShell>` — avatar button opens menu; menu items navigate / dispatch.
- RTK Query `teams` slice — cache invalidation flips list/team queries
  after mutations.

### E2E (Cypress + Cucumber)
- `features/workspace-settings.feature`:
  - Scenario: Solo lead sends an invite after onboarding.
  - Scenario: Manager renames team and refresh persists.
  - Scenario: Manager removes a teammate who is themselves a manager;
    the orphaned reports show no manager.
  - Scenario: IC visits Settings — Team fields disabled, Members readable.
  - Scenario: Team lead sets avatar URL; AppShell renders it.

### Accessibility
- Settings page sections use `<section aria-labelledby>`.
- Avatar button is `<button>` with `aria-label="Open account menu"` +
  `aria-expanded` + Escape-to-close, matching the existing mobile-menu
  pattern in `AppShell`.
- Remove-member confirm uses role=dialog + focus trap.
- All inputs have explicit `<label>`.

## 11 · Risks

| Risk | Mitigation |
|------|------------|
| Orphan-reports logic creates dangling roll-ups | Explicit UX warning in confirm dialog; backend test covers the cascade; manual reassignment via re-invitation is the v1 escape hatch. |
| Avatar URL field is a security hole (CSRF-like image-load triggers) | URL is rendered as `<img src>` only — no fetch on the server. Browser does the request with the user's session, which is no different from any user-pasted URL in chat or comments. CSP could restrict `img-src` later if needed. |
| `derivedRole` is recomputed per-request; orphan reports get a stale role until next refresh | Acceptable. Roll-up queries derive from `manager_id` directly, not the DTO field. |
| Spec creep during implementation ("while we're here, let's also…") | The §4 parking lot is the explicit no. Any expansion needs a new spec. |
| PR 4 avatar display in header touches AppShell — high-traffic file | Keep change additive; existing markup unchanged. Cypress regression on existing flows in PR 4. |

## 12 · Open questions for `writing-plans`

(Things the implementation plan should resolve, not the spec.)

- **DTO for `TeamDto`** — share with `MeDto`'s embedded team fields, or
  keep separate? Today `/me` returns `teamId` only; if we extend it to
  return `teamName` + `teamAvatarUrl`, AppShell needs one fewer query.
  Plan should pick one and stay consistent.
- **`/settings` vs `/workspace`** — route name. `/settings` is more
  conventional; `/workspace` reads truer to the IA. Plan should call it.
- **Per-section anchors vs single scroll** — sections are stacked; do we
  add an in-page nav (sticky left "Team / Members / Invitations") or
  pure scroll? Defer; pure scroll for v1.
- **Re-invitation of a removed orphan's manager** — manual via the
  existing invite flow, or build a UI to reattach reports to a new
  manager? Plan should park unless it gets blocked.
- **Header layout when team name is long** — truncate vs ellipsize vs
  hide on small screens. Design call, not architectural; plan picks a
  default.

## 13 · Definition of done (whole feature, post-PR 4)

- All four journeys (J1–J4) work end-to-end in `colign.org` prod with a
  real Google account.
- All five features (F1–F5) shipped, each behind a green Cypress
  scenario.
- Backend coverage ≥ 80% on changed classes; no SpotBugs regressions.
- `docs/handoffs/YYYY-MM-DD-workspace-management-shipped.md` written
  per the project handoff convention.
- A user can: sign up, create team, invite a teammate from inside the
  app, see all members, rename their team, set an avatar, and remove a
  member who left — without ever leaving the SPA except for the OAuth
  redirect.
