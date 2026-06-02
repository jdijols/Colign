# Colign Design Loop

Autonomous overnight loop that refreshes Colign's post-onboarding surfaces.

**Spec:** [docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md](../../docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md)
**Plan:** [docs/superpowers/plans/2026-06-02-overnight-design-loop.md](../../docs/superpowers/plans/2026-06-02-overnight-design-loop.md)

## What it does

1. **Foundation pass** (one worktree, one PR): refreshes Tailwind tokens and 5 shared components per `DESIGN.md`.
2. **Per-surface polish** (one worktree per surface, sequential): for each of 6 post-onboarding surfaces, runs 3–5 critic → designer → verifier cycles. Each surface ends with its own PR (or an "attempted" PR if the failure budget triggers).

You wake up to ~7 PRs to triage. No PR auto-merges.

## Prerequisites

1. `DESIGN.md` exists at `docs/superpowers/design/DESIGN.md` — produced by `/design-consultation`. The loop refuses to start without it.
2. Playwright Chromium installed: `./node_modules/.bin/playwright install chromium`
3. `gh` CLI authenticated: `gh auth status` shows logged in
4. Clean git tree on `main`
5. Cypress responsive specs pass on `main` (the regression baseline)

## Run

From a Claude Code session at the repo root:

```
Workflow({ scriptPath: 'tools/design-loop/workflow.js' })
```

Progress is visible at `/workflows`. Per-surface PRs land with the label `design-polish` (or `design-polish-attempted` on fail-open).

## Resume

If the loop crashes or you stop it (`TaskStop`), resume with the `runId` from the prior invocation:

```
Workflow({ scriptPath: 'tools/design-loop/workflow.js', resumeFromRunId: '<wf_id>' })
```

Completed agents with identical prompts return cached results instantly. Same script + same args → 100% cache hit.

## Abort

Stop the workflow task, then for each active worktree:

```bash
cd ../colign-worktrees/design-<slug> && /path/to/tools/design-loop/teardown-stack.sh
```

To roll back all worktrees:

```bash
for s in foundation weekly-plan dashboard goals commits reconcile manager; do
  git worktree remove ../colign-worktrees/design-$s --force 2>/dev/null
  git branch -D design/$s 2>/dev/null
done
```

## Stack lifecycle

Each worktree runs its own dev stack:

- `boot-stack.sh` — idempotent boot of backend (mock auth) + remote :5174 + host :4173 + Tailwind watcher. Flips `.env.local` files to mock. Records PIDs in `.design-loop-pids`.
- `teardown-stack.sh` — kills recorded PIDs + orphans on our ports, restores `.env.local` from `.bak`.

Per-surface execution is **sequential** to avoid:
- Vite port collisions (5174/4173 are hardcoded; would need MF URL overrides for parallel ports)
- 14 simultaneous vite processes
- 7 simultaneous Tailwind watchers

Tradeoff: ~6–12 hours overnight instead of ~3–6.

## Auth

Persona: `manager@st6.dev` (Sam Manager, role `MANAGER`) — sees the `/manager` rollup of her reports (Ada, Ben, Chris) AND has access to every IC surface.

Caveat: `DemoDataInitializer` seeds plans/commits for Ada/Ben/Chris but not Sam, so IC surfaces like `/`, `/commits`, `/reconcile` show empty states for her. Team-level surfaces (`/goals`, `/dashboard`, `/manager`) are populated. Empty states are real UX surfaces — the loop polishes them too.

Mock JWT minting wraps `scripts/mock-jwt.mjs`. Tokens are injected into `localStorage` keys `colign_jwt` / `colign_email` / `colign_role` via Playwright's `addInitScript`.

## Files

```
tools/design-loop/
├── README.md            (this file)
├── config.json          (surfaces, viewports, persona, budgets — mirrored in workflow.js)
├── workflow.js          (the Workflow script — meta + phases + prompts inline)
├── screenshot.mjs       (Playwright screenshot CLI helper)
├── boot-stack.sh        (idempotent stack boot — backend + remote + host + tailwind)
├── teardown-stack.sh    (stack kill + env restore)
└── state/               (runtime artifacts — gitignored)
```

## Gotchas captured during build

These are baked into `boot-stack.sh` already:

- **Yarn workspace hoisting:** Cypress's reporter loader doesn't walk up from `apps/colign-frontend/` to find `cypress-multi-reporters` hoisted at repo root. Boot script symlinks the 4 reporter packages.
- **`tail -f /dev/null | tailwindcss --watch`:** plain `yarn dev:css` self-exits without a TTY. The trick keeps stdin open so the watcher survives.
- **Mock backend required for Cypress:** `audit-teardown.sh flip` only edits env files. Vite + Spring Boot read env at startup — boot script handles both flips + restart.

## State

`state/` is gitignored and holds per-run artifacts the workflow needs to persist between agents. `.design-loop-pids` per worktree tracks running PIDs.
