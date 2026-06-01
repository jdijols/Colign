# Strategy Onboarding + Weekly Plan Submission UX

## Summary

Colign's foundational unit is a **weekly commit**: a prospective deliverable promise
for the current week, not a retrospective status update. An IC writes 3-5 commits,
ranks them by order, links each to a strategic Outcome (or to a pending Outcome
request), then **submits the plan**. Submission freezes the plan-of-record so
Friday reconciliation can compare "what we said we would do" against "what actually
happened."

We will replace user-facing "Lock plan" language with **Submit plan** while keeping
the backend `LOCKED` state as the internal immutable baseline. Manager review will
be async and non-blocking: managers can review submitted plans, comment, and mark
"changes requested" without changing plan state. Submitted plans whose managers
have not reviewed by Friday proceed to reconciliation automatically with an
"unreviewed" annotation; managers receive a daily digest of pending submissions.

The next product slice is **team-scoped strategy onboarding**: before a team creator
starts weekly planning, they must create one complete strategy path:
Rally Cry -> Defining Objective -> Outcome. This removes the current fuzziness where
commits require Outcomes but new teams have no way to define them. ICs whose work
has no valid Outcome can file a request; commits linked to a pending request are
allowed in submitted plans but excluded from strategic-alignment metrics until
approved.

## Key Changes

- Add first-run strategy onboarding after team creation and before invites/weekly planning:
  - Step 1: create Rally Cry.
  - Step 2: create one Defining Objective under it.
  - Step 3: create one measurable Outcome under that Objective.
  - Step 4: invite teammates or continue to first weekly plan.
- Use scoped strategy permissions:
  - Team creator/admin/manager can create official strategy nodes for the team.
  - ICs cannot create official nodes directly.
  - ICs can request a missing Outcome when their work has no valid mapping.
  - V1 authorization on RCDO write endpoints: `requireSameTeam(caller, target.teamId) && role IN (MANAGER, ADMIN)`. "Strategy owner" as a distinct role is deferred to a later slice; until then, MANAGER and ADMIN have strategy authority.
- Update weekly plan language and flow:
  - Rename UI copy/actions from "Lock plan" to **Submit plan** across `WeeklyPlanPage`, `tokens.ts` (`planStateLabel('LOCKED')` → "Submitted"), `ManagerDashboardPage` KpiCard ("Submitted / reconciling"), Cypress e2e selectors and `.feature` step text, and `PlanService` backend error strings.
  - Explain submission as freezing the weekly baseline.
  - Keep backend state machine: `DRAFT -> LOCKED -> RECONCILING -> RECONCILED -> CARRIED_FORWARD`. No new states.
- Add manager "request changes" without state mutation:
  - Manager flagging a submitted plan adds `changes_requested_at`, `changes_requested_by`, and `changes_requested_comment` columns to the `plan` row.
  - The plan stays `LOCKED`; reconciliation continues against the frozen baseline.
  - IC sees a banner with the manager's comment on `WeeklyPlanPage`; they can submit an updated v2 plan that clears the marker on transition.
  - Only the manager of the plan owner (with ADMIN override) can clear the marker; the audit log captures actor, timestamp, and comment.
- Add async review SLA + fallback:
  - Plans submitted but unreviewed by Friday proceed to reconciliation automatically with an "unreviewed" annotation visible on the manager rollup.
  - Managers receive a daily digest of unreviewed submissions for their direct reports.
- Extend chess layer:
  - Add **Positioning** as a fourth move type alongside Offense, Defense, Maintenance (see Deferred / Open Questions — decision pending).
  - Prioritization is two independent ranks: **commit order** represents the IC's weekly intent (drives "what I'll tackle first"), **Outcome priority** is set by strategy owners and reflects org strategic weight (drives the high-priority alignment %). They are never combined into a single score. No new commit priority field.
- Add pending-Outcome commit state:
  - `weekly_commit` gains a nullable `outcome_request_id` FK in addition to `outcome_id` (which becomes nullable when `outcome_request_id` is set; exactly one of the two must be non-null).
  - Commits with `outcome_request_id` set are valid for plan submission but excluded from strategic-alignment metrics until the request is approved.
  - On approval, the commit is auto-linked to the resulting Outcome; on rejection, the IC must pick a different Outcome or refile.
- Preserve the current deployment shape:
  - Frontend remains the Vite Module Federation remote.
  - Host remains the local/prod entrypoint.
  - Backend remains Spring Boot + Flyway + PostgreSQL-compatible schema evolution.

## Implementation Changes

### Backend / API

- Add team-scoped RCDO write endpoints:
  - New controllers: `RallyCryController` (POST/PUT/DELETE), `DefiningObjectiveController` (POST/PUT/DELETE), and POST/PUT additions to `OutcomeController`.
  - New request DTOs: `CreateRallyCryRequest`, `UpdateRallyCryRequest`, `CreateDefiningObjectiveRequest`, `UpdateDefiningObjectiveRequest`, `CreateOutcomeRequest`, `UpdateOutcomeRequest`.
  - Authorization on every write: `requireSameTeam(caller, target.teamId) && role IN (MANAGER, ADMIN)`. Read endpoints filter results by `caller.teamId` unless caller is ADMIN.
- Flyway migrations (separate files for independent rollback):
  - Migration A: add `team_id BIGINT NOT NULL REFERENCES team(id)` to `defining_objective` and `outcome`, with backfill from the FK chain (`defining_objective.team_id` ← `rally_cry.team_id`; `outcome.team_id` ← `defining_objective.team_id`).
  - Migration B: add `POSITIONING` row to `chess_tag` with a `priority_rank` to be assigned in the Deferred decision.
  - Migration C: add `outcome_request` table — `id`, `team_id`, `requested_by_user_id`, `suggested_title VARCHAR(200) NOT NULL`, `suggested_defining_objective_id BIGINT NULL`, `state VARCHAR(16) NOT NULL` (PENDING / APPROVED / REJECTED / CONVERTED), `decided_by_user_id BIGINT NULL`, `decided_at TIMESTAMP NULL`, `resulting_outcome_id BIGINT NULL`, plus standard auditing fields.
  - Migration D: add `outcome_request_id BIGINT NULL REFERENCES outcome_request(id)` to `weekly_commit`; relax `outcome_id` to nullable; add a CHECK constraint requiring exactly one of `outcome_id` or `outcome_request_id` to be non-null.
  - Migration E: add `changes_requested_at TIMESTAMP NULL`, `changes_requested_by BIGINT NULL`, `changes_requested_comment TEXT NULL` to `plan`.
- Add `boolean strategySetupComplete` to `MeDto`:
  - Computed in `UserResolver.toMeDto` as `outcomeRepository.existsByTeamId(teamId)` (or the equivalent denormalized check after migration A).
  - Enforced server-side: `WeeklyCommitController.add` returns 422 when `team.strategySetupComplete == false`; the client-side gate is a routing convenience only.
- Add Outcome request endpoint:
  - POST `/api/v1/outcome-requests` for ICs.
  - Per-IC rate limit: max 5 open (PENDING) requests per IC per week.
  - Field constraints: `suggested_title` ≤ 200 chars (matches Outcome.title).
  - Dedup: reject when the requesting user already has a PENDING request with the same normalized `suggested_title`.
  - GET `/api/v1/outcome-requests` for managers, filtered to the caller's team.
  - PATCH `/api/v1/outcome-requests/{id}` for state transitions (APPROVED / REJECTED / CONVERTED).
- Plan ownership and authority hardening:
  - `PlanService.lock(planId, callerId)` asserts `plan.userId == callerId` (or caller is ADMIN); same predicate on `WeeklyCommitController.add`, `update`, `delete`.
  - `ManagerController.team()` filters by `caller.teamId` unless caller is ADMIN (prevents cross-team report visibility when a manager has assignments on multiple teams).
  - `PlanService.requestChanges(planId, managerId, comment)` adds the marker only when `managerId == plan.owner.managerId` or caller is ADMIN; writes an audit row.
- Chess-tags endpoint: GET `/api/v1/chess-tags` requires authentication (existing Spring Security catch-all). Explicitly document this; any future pre-auth exposure (e.g., for marketing surfaces) requires a security review.
- Keep `weekly_commit.outcome_id` schema integrity via the new CHECK constraint; submitted plans remain structurally aligned.

### Frontend

- Routing:
  - Add routes under `WeeklyCommitApp`: `onboarding/strategy/rally-cry`, `onboarding/strategy/objective`, `onboarding/strategy/outcome`, and reposition `onboarding/invite` as Step 4.
  - `OnboardingChoicePage` post-create navigation changes from `navigate("invite")` to `navigate("strategy/rally-cry")`.
  - `OnboardingGate` gates on `me.teamId == null || !me.strategySetupComplete`. Behavior matrix by `{caller role, strategy state}`:
    - Creator/ADMIN/MANAGER + incomplete → strategy wizard.
    - IC + incomplete → empty-state screen ("Ask your team admin to finish strategy setup") with admin contact link; the wizard is not shown to ICs (they lack write authority).
    - Anyone + complete → weekly plan.
- Strategy onboarding screens (per step: Rally Cry, Defining Objective, Outcome):
  - Each screen specifies headline ("Name your team's [Rally Cry / Defining Objective / Outcome]"), subhead (one-sentence explanation of why this node matters), input label, placeholder example, primary CTA label ("Create Rally Cry" / etc.), success confirmation before advancing.
  - Layout: full-screen centered card, "Step N of 3" indicator visible.
  - Back on step N+1 preserves the node created at step N (it is not destroyed); browser close mid-wizard resumes at the last completed step on next sign-in.
- Replace the current team-create-only onboarding at `apps/colign-frontend/src/pages/OnboardingChoicePage.tsx` with the strategy setup sequence above after team creation.
- Update `apps/colign-frontend/src/components/CommitForm.tsx`:
  - Add "Request missing Outcome" as a secondary link beneath the Outcome select. Clicking opens a drawer with `Outcome title` and optional `Rationale` fields. On submit, the drawer closes, the Outcome field shows a "Pending: <title>" badge, and the form is saveable with `outcomeRequestId` set.
  - Show Positioning as a move type (pending the Deferred decision on whether it ships in this slice).
  - Add `CHESS_TONES` and `CHESS_ACTIVE` entries for POSITIONING.
- Update `apps/colign-frontend/src/pages/WeeklyPlanPage.tsx`:
  - Replace "Lock plan" button copy + helper text with "Submit plan".
  - Update `data-cy="lock-plan"` to `data-cy="submit-plan"`.
  - Update banner ("This week is locked") to "This week's plan has been submitted".
  - Surface pending Outcome request count: "X commit(s) awaiting Outcome approval".
  - Surface manager change-request banner with comment when `changes_requested_at` is set.
- Update `tokens.ts`: `planStateLabel('LOCKED')` returns "Submitted"; `planStateLabel('RECONCILING')` retained ("Reconciling").
- Update `ManagerDashboardPage` KpiCard label: "Submitted / reconciling" (was "Locked / reconciling").
- Update Cypress e2e:
  - `cypress/e2e/weekly-lifecycle/weekly-lifecycle.ts` selectors and regex assertions: `/^Submit plan$/`, `[data-cy="submit-plan"]`.
  - `weekly-lifecycle.feature` step text: "the Submit plan button is disabled until at least one commit exists".
- IC-facing Outcome request feedback:
  - In `CommitForm`, the Outcome field renders the pending state until decision.
  - On approval: the commit auto-links to the resulting Outcome; the badge updates to the normal Outcome chip; the IC is notified inline.
  - On rejection: a banner with manager comment surfaces on `WeeklyPlanPage`; the commit is flagged as "needs a different Outcome"; the IC can pick another or refile.

### Manager UX

- Manager dashboard keeps async review with an SLA: unreviewed submitted plans proceed to reconciliation on Friday with an "unreviewed" annotation.
- Submitted plans appear as ready to review with the submission timestamp.
- Manager "request changes" adds the marker columns on `plan` without state mutation. The plan stays LOCKED; reconciliation continues against the frozen baseline.
- Add manager-visible Outcome requests to the manager/settings area, scoped to the manager's own team. Manager actions: approve (creates official Outcome under chosen Defining Objective and converts request to CONVERTED state, auto-linking the originating commit), reject (with required comment), or convert (link to an existing Outcome).
- Reconciliation review remains post-week and should eventually include approve/comment actions (future slice).
- Audit log entries for: request-changes marker added/cleared, LOCKED-state baseline overrides, Outcome-request decisions.

## Test Plan

### Backend

- Strategy setup completion is false until one Rally Cry, one Objective, and one Outcome exist for the team.
- IC cannot create RCDO nodes (returns 403); MANAGER and ADMIN can.
- Cross-team RCDO read/write returns 403 (verifies `requireSameTeam`).
- Commit creation returns 422 when `team.strategySetupComplete == false` (server-side enforcement).
- IC can create Outcome requests up to 5 open per week; the 6th returns 429.
- Duplicate Outcome request (same normalized `suggested_title` from same IC, still PENDING) is rejected.
- `weekly_commit` CHECK constraint: exactly one of `outcome_id` or `outcome_request_id` is set.
- Pending-outcome commit is included in plan submission (`PlanService.lock` succeeds) but excluded from high-priority alignment % math.
- Submit plan still transitions backend `DRAFT -> LOCKED`.
- `PlanController.lock` returns 403 when caller is not plan owner (and not ADMIN).
- `WeeklyCommitController.add/update/delete` returns 403 when caller is not the plan owner.
- `ManagerController.team()` returns only same-team users for non-ADMIN callers.
- `requestChanges` marker visible on plan; plan stays LOCKED; reconciliation runs against the LOCKED snapshot.
- Only the manager of the plan owner (or ADMIN) can clear the request-changes marker; audit log entry created.
- Plan unreviewed by Friday → reconciliation proceeds; rollup shows "unreviewed" annotation.
- `POSITIONING` chess tag appears in `/api/v1/chess-tags`.

### Frontend

- New team creator routed through strategy setup before weekly planning.
- Existing team with complete strategy bypasses setup.
- Invited IC joining team with **incomplete** strategy lands on the "ask your admin" empty-state, not the wizard.
- "Submit plan" copy appears instead of "Lock plan" across `WeeklyPlanPage`, `tokens.ts`, KpiCard, error banners.
- Cypress e2e (`weekly-lifecycle.ts` + `.feature`) uses Submit-plan vocabulary and `submit-plan` data-cy.
- Strategy onboarding wizard: Back from Step 2 preserves the Rally Cry; browser close mid-wizard resumes correctly.
- Commit form allows ranked deliverable promises, required Outcome selection or pending request, and missing Outcome request flow with pending badge.
- IC sees feedback when an Outcome request is approved (auto-link) or rejected (banner with manager comment).
- Manager dashboard remains usable for direct reports after submission/reconciliation; Outcome requests visible per-team only.
- Manager "request changes" banner renders on the IC's WeeklyPlanPage with the comment.

### Verification commands

- `yarn workspace colign-frontend test`
- `yarn workspace colign-frontend build`
- `yarn workspace pa-host build`
- `cd apps/colign-backend && mvn verify`

## Assumptions

- "CEO" will not become a distinct app role; CEO behavior is represented by scoped capabilities. For v1, "strategy owner" is folded into MANAGER + ADMIN; a distinct strategy-owner role is deferred to a later slice.
- V1 strategy onboarding is team-scoped only; full multi-level org strategy mapping is designed for later using parent Outcome links and ownership.
- User-facing "Submit plan" maps to backend `LOCKED`; `planStateLabel('LOCKED')` returns "Submitted". The token "lock" remains only in backend internal docs.
- Commit prioritization is two independent ranks: ranked commit order = IC weekly intent; Outcome priority = org strategic weight. They are never combined; the high-priority alignment % continues to be computed against Outcome priority only.
- ICs with unmapped work request an Outcome instead of creating unaligned commits. Commits with a pending Outcome request are allowed in submitted plans but excluded from strategic-alignment metrics until approved.
- Pending Outcome requests do not block plan submission; reconciliation tracks them separately.
- `requireSameTeam` is the established tenant-isolation predicate in `TeamPermissions`; new endpoints reuse it rather than inventing a parallel mechanism.

## Deferred / Open Questions

### From 2026-06-01 review

- **Mandatory strategy gate before invites** (Key Changes — strategy onboarding): forcing creators through a complete RC→DO→Outcome chain before inviting teammates inverts the current minimize-actions principle (`OnboardingChoicePage.tsx` is explicitly built around "type a name, press Enter, invite teammates") and may risk creator drop-off during activation. Decide between: (a) keep the mandatory gate as written, (b) make strategy setup a soft gate — creator can dismiss for the first session but cannot submit a weekly plan until a chain exists, (c) gate only at first commit creation rather than before invites. Resolve before committing onboarding routes. _(product-lens, adversarial)_

- **Positioning chess type as 4th move type** (Key Changes — Extend chess layer): adding Positioning alongside Offense / Defense / Maintenance changes the chess-tag mental model, the posture distribution shown in `TeamRollupTable`, and downstream rollup math, with no documented motivating problem or definition that distinguishes it from preparatory Offense. Decide: (a) cut Positioning from this slice and bring it back when there is a documented gap, (b) keep but add a one-paragraph definition + example + `priority_rank` justification + UI tone/color spec for `CHESS_TONES`, (c) reshape as a manager-only tag without ranking implications. The Flyway migration B is gated on this decision. _(product-lens, adversarial)_

- **Five independent shifts bundled into one slice** (Key Changes / Implementation): the plan combines strategy onboarding + submit/lock rename + Positioning + Outcome request flow + manager change-request UX. Bundling increases blast radius — any one piece blocking integration holds the rest hostage, and partial rollback becomes impossible. Consider splitting into: (1) rename + Positioning (low-risk additive), (2) strategy onboarding + Outcome request flow (share new write endpoints + `strategySetupComplete` signal), (3) manager change-request UX. _(scope-guardian)_

- **One-Outcome minimum may force shallow strategy** (Key Changes — strategy onboarding): requiring exactly one Rally Cry + one Defining Objective + one Outcome unlocks weekly planning, but a single Outcome cannot meaningfully describe a whole team's work — the realistic failure mode is creators typing placeholder ("Ship the product") to clear the gate, then every commit mapping to that one Outcome with structurally-100%-informationally-0% alignment. Decide: (a) keep N=1 minimum, (b) raise to N≥2 Outcomes for onboarding completion, (c) keep N=1 but add template prompts + a "≥80% of commits map to the same Outcome" canary alert in the manager rollup as a data-quality signal. _(adversarial)_
