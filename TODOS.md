# Colign · Parking Lot

Long-running items deferred from active work. Each entry: what + why + when to revisit.

## Strategic — Manager-dashboard depth vs brief's grading rubric

**Surfaced:** 2026-05-31 by `/autoplan` CEO + DX review of the workspace-management plan.
**Status:** Parked — workspace-management plan is shipping first per explicit user direction.

The CEO subagent's review flagged that the **Project Brief**'s explicit functional requirements grade on:
- Weekly commit CRUD with RCDO hierarchy linking
- Chess layer for categorization and prioritization
- Full weekly lifecycle state machine
- Reconciliation view (planned vs actual)
- **Manager dashboard with team roll-up**
- Module Federation integration
- Performance benchmarks (sub-200ms, up to 2000 records)

Workspace management (in-app invites, rename team, remove members, team avatar) is **not** in the brief. The current `ManagerDashboardPage` is a thin list view (just direct reports + each report's latest plan, via `ManagerController.team()` / `useGetManagerTeamQuery`). The CEO subagent's view: a reviewer grading the assessment will spend 60s on settings and 30min on the roll-up, so additional polish on the roll-up moves the score more than workspace settings.

Specifically suggested improvements to the manager dashboard once workspace mgmt ships:
- **Alignment-coverage % per team member** — how many of their commits are linked to a high-priority Outcome (we have `AlignmentSummary.alignmentPct` in the DTO; surface it in the table).
- **RCDO drill-down** — clicking a row reveals which Rally Cry / Defining Objective / Outcome each commit maps to (and which are unmapped).
- **Reconciliation gap visualization** — last-week planned vs actual side-by-side, with a delta indicator per commit.
- **Chess-layer breakdown** — count of OFFENSE / DEFENSE / MAINTENANCE commits per report this week (catches teams over-indexing on maintenance).
- **Lifecycle status at-a-glance** — which reports are still in DRAFT vs LOCKED vs RECONCILED for the current week.

**When to revisit:** After PR 1 ships and is verified in prod. Or sooner if user-research signals the dashboard is the bigger pain.

---

## Workspace Management — items parked from the spec / plan

- **Left-sidebar navigation rewrite** — explored in brainstorming; deferred until v1 ships and we have feedback.
- **Workspace switcher / multi-workspace** — no data model for it. Defer until multi-tenant is a real ask.
- **Manager-of-managers tree in sidebar** — wider IA decision; not a workspace-mgmt scope.
- **Real file upload for team avatar** — V1 ships URL field. Real upload needs storage decision (Fly volume vs S3 vs CDN). Defer.
- **Transfer team lead** — no need yet; lead-special permission case covers solo leads. Build when blocked.
- **Per-member role editing** — derived from `manager_id`; no editor needed. Promote-via-reassign happens through invitation flow.
- **Billing surface** — no plans exist.
- **Notion-style workspace popover** with switcher and account list — requires multi-workspace and multi-account auth; out of scope until those exist.
- **Member-list virtualization** — current `<MembersSection>` renders all rows up to 2000 (per brief cap). Add `react-window` when first team crosses ~200 members in practice.
- **Members-list search/filter** — defer until first team complains about scroll.
- **Permissions contract test** — automated check that FE `canManageTeam` and BE `TeamPermissions.canManage` stay in sync.
- **Re-attach orphaned reports** — current flow is "manual via re-invitation later." Build a UI when first ops ticket arrives.
- **`MeDto` cache for repeated /me hits** — Phase 4 added a `teams.findById` to every /me. Profile if it shows up in p95.
- **Invite-email avatar rendering** — V5 plan removed this from PR 4 (`ResendEmailClient` renders HTML inline, not via Thymeleaf; needs `InvitationEmail` extension + threading). Pick up as its own small PR.

---

## Post-submission redirect — brief-core depth first

**Surfaced:** 2026-06-01 by the 8-item audit ([docs/15-five-framework-research.md](docs/15-five-framework-research.md), [docs/rcdo-hierarchy-blueprint.md](docs/rcdo-hierarchy-blueprint.md)) and the resulting execution plan ([~/.claude/plans/okay-go-ahead-and-parsed-hejlsberg.md](~/.claude/plans/okay-go-ahead-and-parsed-hejlsberg.md)).
**Status:** Active sequencing — brief-core depth shipping ahead of further workspace-mgmt polish.

### What just shipped under this redirect (already merged to main)

- **Lock-time outcome guard.** `PlanService.lock()` now throws 409 if any commit in the plan is missing its `outcome_id`, with a focused `PlanServiceTest`. Closes the gap between the brief's structural-alignment thesis and the actual code path.
- **"High-priority alignment" rename.** UI label is honest about measuring P0/P1-linked commits. Variable names / DTO fields unchanged.
- **Spotless + SpotBugs + FindSecBugs** wired into `mvn verify`. Code Quality Expectations row goes from declared-but-skipped to gated.
- **ESLint 9 flat config + husky + lint-staged.** `yarn lint` exits 0; pre-commit gate runs ESLint+Prettier on staged frontend files.
- **Vitest expansions** on CommitForm, AlignmentBar, PlanStatePill + backend ReconciliationServiceTest. Coverage climbed from ~50% → ~56% with the new branches; gap closure to 80% is the next test push.
- **Manager dashboard depth:** RCDO drill-down (Defining Objective grouping + Rally Cry section headers) in `IcDrillDrawer`, Posture badges (O/D/M chips) and Δ Last week column on `TeamRollupTable`. Two new DTO fields (`rallyCryTitle`, `definingObjectiveTitle`) populated server-side.
- **Cypress weekly-lifecycle feature** covering empty-plan lock guard, IC reconciliation flow, manager rollup visibility. mochawesome + junit reporters wired.

### Active next sprint (post-grading)

- **Close the JaCoCo 80% gap.** Targeted service tests on `PlanService.toDto` (currently grew coverage but full RCDO path branch is partial), `ReconciliationService.reconcileCommit`, and the controllers without wiring tests (Plan, Reconciliation, WeeklyCommit, Outcome, ChessTag, Manager, Me).
- **Tighten SpotBugs threshold** from High → Medium after a triage pass — the temporary High threshold is documented in `pom.xml`.
- **Manager dashboard a11y pass** on the new Posture chips + Δ column (currently `aria-label="Posture distribution"` is the only signal; consider scoped descriptions).
- **TeamRollupTable Vitest** — render-level test for the new columns given mock `TeamMemberDto[]`. Skipped in PR 6 because the lifecycle Cypress covers the integration; useful for fast unit feedback.

### Items parked (pause polish until brief-core depth lands)

- **Member-roles editor** — derived from `manager_id` today; promote-via-reassign covers the cases.
- **Workspace switcher / multi-workspace** — no data model; defer to a real multi-tenant ask.
- **Notion-style workspace popover** — needs multi-workspace + multi-account auth.
- **Real file upload for team avatar** — V1 ships URL field; real upload needs storage decision.
- **Transfer team lead** — lead-special permission case is fine until first ops ticket arrives.

**When to revisit:** After the submission grading window closes, or sooner if user-research signals one of the parked items is a real blocker.
