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
