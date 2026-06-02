# Colign Overnight Design Loop — Design Spec

**Date:** 2026-06-02
**Status:** Awaiting user review — pre-implementation
**Owner:** Jason Dijols
**Scope:** Post-onboarding surfaces of `apps/colign-frontend` reached via `apps/pa-host` at `:4173`

---

## 1. Goal

Run a multi-agent autonomous loop overnight that takes Colign's post-onboarding tabbed views from "boring, flat, uninteresting" to **dynamic, high-quality, and visually cohesive** — from design tokens up through full-surface polish. Each surface lands as its own PR with before/after screenshots; user wakes up to a triage queue of ~7 PRs, not a tangled main branch.

The loop is structured as a critic + designer + verifier cycle per surface, run in parallel across isolated git worktrees, anchored to a `DESIGN.md` produced interactively before the loop kicks off.

## 2. Non-goals

- **Onboarding pages.** Out of scope per user direction — focus is post-onboarding tabbed app shell.
- **Backend / API changes.** Frontend-only. No `apps/colign-backend` edits.
- **`pa-host` architecture documentation site** (`pa-host/src/architecture/*`). Engineering reference, not user-facing.
- **Dark-mode visual polish.** Per [[colign-responsive-contract]], dark-mode polish is its own future scope. Dark-mode layout bugs that surface during the loop ARE in scope.
- **Performance / Core Web Vitals work.** Use `/benchmark` separately.
- **Net-new features or workflow changes.** This is a visual/UX polish pass, not a product redesign. The loop must not invent new screens, remove existing functionality, or rename existing concepts.
- **Auto-merging.** No PR auto-merges to main. Human triage gate is non-negotiable.

## 3. Decisions locked

| Decision | Choice | Rationale |
|---|---|---|
| Design anchor | DESIGN.md + 3-5 reference apps | Without a written taste anchor, the loop drifts and per-surface output diverges. Reference apps make taste concrete; DESIGN.md makes it codified. |
| Scope | Foundation pass + all 6 post-onboarding surfaces | Foundation-first prevents per-surface token drift. All 6 surfaces gives complete coverage of the tabbed experience. |
| Branch flow | 1 worktree + 1 PR per surface, no auto-merge | Worktree isolation prevents cross-surface conflicts. Human triage gate catches subjective quality misses Cypress can't. |
| Model tier | Opus 4.7 everywhere | User accepts ~$80-150 budget for max design taste. |
| Failure mode | Fail-open with "attempted" PR label | Maximizes overnight coverage; user triages failures alongside successes in morning. |
| Pre-loop work | `/design-consultation` runs interactively tonight | Loop cannot start until `DESIGN.md` is committed. |

## 4. Architecture

### 4.1 Three-phase shape

```
PHASE 0 — Interactive (user + Claude, ~45-60 min)
  /design-consultation
    Inputs:  3-5 reference apps user picks, aesthetic vocabulary,
             Colign's current state, responsive contract constraints
    Outputs: docs/superpowers/design/DESIGN.md
             docs/superpowers/design/references/ (screenshots)
             Proposed tailwind.config.js token diff

PHASE 1 — Foundation (autonomous, single worktree, ~1-2 hrs)
  Worktree: design/foundation (branched from main)
    Actions:
      1. Apply token diff to apps/colign-frontend/tailwind.config.js
      2. Update apps/colign-frontend/src/responsive.css with new
         motion + depth primitives
      3. Refactor 5 shared components:
         - Button, Card, Drawer, Tabs, AppShell navigation
      4. Run Cypress responsive specs — MUST PASS (hard gate)
      5. Open PR #1: "Design foundation — tokens + shared components"
         with before/after screenshot grid

PHASE 2 — Per-surface polish (autonomous, parallel, ~3-6 hrs total)
  6 worktrees, each branched from design/foundation:
    design/weekly-plan   ← / (the landing — first impression)
    design/dashboard     ← /dashboard
    design/goals         ← /goals
    design/commits       ← /commits
    design/reconcile     ← /reconcile
    design/manager       ← /manager

  Per-surface inner loop (3-5 cycles, runs until verifier says "done"
  or budget cap or N=5):
    ┌──────────────────────────────────────────────────────────┐
    │  CRITIC (Opus, read-only sub-agent — no commit access)   │
    │    1. /browse to <surface> URL                           │
    │       - mock auth as Ada (PM persona)                    │
    │       - dev server already booted by harness             │
    │    2. Screenshot at 375×667 (mobile) + 1440×900 (desktop)│
    │    3. Compare screenshots to DESIGN.md principles        │
    │    4. Emit structured issue list:                        │
    │       [{severity: 1-5, area: 'type'|'color'|...,         │
    │         file_hint: 'path.tsx', issue: '...',             │
    │         suggested_direction: '...'}]                     │
    └──────────────────┬───────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────────────────────────────────┐
    │  DESIGNER (Opus, write access)                           │
    │    1. Pick top 2-3 issues (highest severity)             │
    │    2. Propose specific code changes                      │
    │    3. Edit TSX/CSS (only files within surface scope +    │
    │       shared components if absolutely necessary)         │
    │    4. Commit: "design(<surface>): cycle N — <summary>"   │
    └──────────────────┬───────────────────────────────────────┘
                       ↓
    ┌──────────────────────────────────────────────────────────┐
    │  VERIFIER (Opus)                                         │
    │    1. Re-take screenshots                                │
    │    2. Compare to prior cycle's screenshots               │
    │    3. Run Cypress responsive specs                       │
    │    4. Self-judge: did this cycle improve the surface     │
    │       against DESIGN.md?                                 │
    │    5. Emit: 'keep + continue' | 'keep + done' |          │
    │       'revert + retry' | 'revert + skip surface'         │
    └──────────────────────────────────────────────────────────┘

  Surface terminates when:
    - Verifier says 'keep + done', OR
    - 5 cycles completed, OR
    - 2 consecutive 'revert + retry' (fail-open: opens attempted PR)

  Each surface opens a PR with:
    - Before/after screenshot grid (mobile + desktop)
    - Cycle log (what changed each iteration + why)
    - Change summary
    - Label: 'design-polish' OR 'design-polish-attempted' on fail

PHASE 3 — Morning triage (user, ~30-60 min)
  Review ~7 PRs (1 foundation + 6 surfaces):
    - Merge wins
    - Kill misses (close PR + delete branch)
    - Request iteration on near-misses (comment, leave open)
```

### 4.2 Orchestration choice

The phase 2 fan-out + critic/designer/verifier nesting is best expressed with the built-in `Workflow` tool — deterministic JS orchestration with `pipeline()` for the per-surface stages and `parallel()` for the cross-surface fan-out. The script captures meta + phases so progress is visible in `/workflows`.

Phase 0 is plain interactive use of `/design-consultation`. Phase 1 + Phase 2 share one Workflow script invoked from a single `/loop` (dynamic mode) call so the user can monitor or interrupt from one entry point.

### 4.3 Critic / Designer / Verifier separation rationale

The user's "two agents on the same branch" intuition maps to **role separation, not parallel commit contention**. The Critic is genuinely valuable as an *outside perspective*: it doesn't see the Designer's reasoning or the iteration history, only the rendered result. That blindness is the feature — it mirrors how a fresh designer reviews a teammate's work.

Putting the Critic and Designer on the *same* branch but with role separation gets us the "outside perspective" benefit without merge conflicts. The Verifier is a separate role because "did this improve?" is a judgment best made by an agent that didn't author the change.

## 5. Safety mechanisms

**Code-level gates (the loop cannot bypass these):**

- **Cypress responsive specs** as a hard gate. Foundation PR cannot open if specs fail. Per-surface cycles that break specs auto-revert.
- **Worktree isolation.** Each surface in its own worktree on its own branch. One blowup can't poison the others.
- **Scope guardrails per surface.** Designer can only edit files in the surface's page tree + shared components (latter requires verifier sign-off). Configured via the workflow script's per-stage prompts.
- **No commits to `main`.** Loop only operates on `design/*` branches. PRs land on `main` only via explicit user merge.

**Run-level gates:**

- **Critic is read-only.** No tool access for git mutations or file writes. Only browse + screenshot + emit feedback.
- **Per-surface failure budget.** 2 consecutive revert+retry → fail-open: open "attempted" PR with the most recent passable state + log.
- **Token budget heartbeat.** Workflow logs spend each cycle. If single-surface spend > $30, fail-open and move on.
- **Dev server health check.** Before each cycle, verify host (`:4173`) responds. If not, restart via known script before continuing. After 2 restart failures: pause loop, notify.

**Process-level gates:**

- **No auto-merge.** Hard rule. User triages every PR.
- **Frontmatter on every PR description** so PRs are scannable: `surface`, `cycles`, `final_status`, `cypress_status`, `tokens_spent`.
- **Handoff doc committed at end** to `docs/handoffs/2026-06-03-overnight-design-loop.md` per project convention.

## 6. Authentication + persona

Mock auth via `CYPRESS_VITE_AUTH_MODE=mock`. Loop authenticates as **Ada** (PM persona) for all surface visits. Reasoning: Ada has more visible data in the seed (Goals + Commits populated), so screenshots will be visually richer and the critic has more to react to than empty states.

Empty-state polish is a follow-up scope — handled by a second pass after this one, or by manually clearing Ada's data in a future run.

## 7. Open questions (resolved by `/design-consultation`)

- Which 3-5 reference apps anchor the aesthetic? (User picks live)
- Aesthetic vocabulary: calm vs energetic, minimal vs rich, geometric vs organic, etc.
- Existing brand colors / type to preserve, if any
- Motion philosophy: subtle vs expressive, instant vs eased
- Depth philosophy: flat / soft / layered shadow
- Density preference per surface (manager dashboard probably denser than landing)

## 8. Success criteria

Morning of 2026-06-03, user can:

1. **Read 7 PR descriptions** in <10 min total and form an opinion on each (before/after grids + cycle logs make this fast)
2. **Merge at least the foundation PR**, with reasonable confidence the token + component changes are a clear quality lift over current main
3. **Merge at least 3 of 6 surface PRs** based on visual judgment
4. **DESIGN.md committed and useful** as a reference for all future Colign frontend work — not throwaway artifact
5. **No regressions to the responsive contract** ([[colign-responsive-contract]]). All merged PRs pass Cypress responsive specs.

Stretch:
- All 6 surface PRs are mergeable
- The whole app *visibly* feels more cohesive after merging the foundation PR alone

## 9. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Loop generates plausible-looking slop ("AI design language") | Reference apps in DESIGN.md ground the critic in a specific visual target, not generic principles. |
| Surface-level changes drift from foundation | Per-surface worktrees branched from `design/foundation` (not `main`). |
| Designer over-edits shared components from a surface worktree | Designer prompt explicitly disallows shared-component edits in phase 2 without verifier sign-off. |
| Cypress specs flake overnight | Specs have been stable since 2026-06-01 ship; if they flake during the loop, fail-open + log. Real regression check happens during user triage. |
| Dev server dies mid-loop | Health check + restart in safety mechanisms above. |
| Budget runaway | Per-surface $30 cap; loop fails open before catastrophic spend. |
| User wakes to too many PRs to triage | 7 PRs is intentionally bounded. Each PR description optimized for fast scanning. |
| Foundation PR introduces token names that conflict with existing Tailwind extensions | Foundation phase reads `tailwind.config.js` first and produces a diff that *extends* rather than *replaces*. Existing tokens stay valid until explicitly migrated. |

## 10. What I'm explicitly NOT doing

- Not building net-new features
- Not editing backend
- Not touching onboarding flow
- Not auto-merging anything to main
- Not running this without `DESIGN.md` committed first
- Not running concurrent agents that share write access to the same branch
- Not skipping the human triage gate

## 11. Next steps after spec approval

1. User approves this spec
2. Invoke `superpowers:writing-plans` to produce the implementation plan (Workflow script + harness commands + handoff doc template)
3. Run `/design-consultation` interactively to produce `DESIGN.md`
4. Kick off the loop via `/loop` (dynamic mode) wrapping the Workflow script
5. User sleeps
6. User triages PRs in morning
7. Commit handoff doc to `docs/handoffs/2026-06-03-overnight-design-loop.md`
