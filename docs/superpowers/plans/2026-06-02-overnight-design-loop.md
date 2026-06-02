# Colign Overnight Design Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a sequential overnight design loop that runs `Foundation → 6 surfaces × N critic-designer-verifier cycles`, opens one PR per surface, fails open on stuck surfaces, and writes a morning handoff.

**Architecture:** One `Workflow` script orchestrates everything. Per-surface execution is **sequential** (one worktree at a time) to avoid Vite port collisions and Module Federation URL conflicts. Inner loop is critic (read-only sub-agent) → designer (write access, surface-scoped) → verifier (judge + revert on regression). Playwright drives screenshots; mock-auth JWT minting reuses the existing `scripts/mock-jwt.mjs`. Cypress responsive specs are the hard regression gate.

**Tech Stack:** Workflow tool (built-in JS orchestrator), Playwright (new — for screenshots), existing Cypress + responsive specs, existing `scripts/mock-jwt.mjs`, Tailwind config + `responsive.css` (the foundation-phase edit targets), git worktrees.

**Spec:** [docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md](../specs/2026-06-02-overnight-design-loop-design.md)

---

## File structure

```
tools/design-loop/                         # NEW — harness root
├── README.md                              # How to run + resume + abort
├── config.json                            # Surfaces, viewports, persona, budgets
├── workflow.js                            # The full Workflow script (all prompts inlined)
├── screenshot.mjs                         # Playwright screenshot helper (CLI)
├── auth-helper.mjs                        # Mock JWT + Playwright localStorage injection
├── boot-stack.sh                          # Boot backend + remote + host + dev:css in a worktree
├── teardown-stack.sh                      # Kill all stack processes
└── state/                                 # Runtime state (gitignored)
    └── .gitkeep

docs/superpowers/design/                   # NEW — design system home
└── DESIGN.md                              # Produced by /design-consultation (Task 6)

docs/handoffs/                             # EXISTING — written in Task 11
└── 2026-06-03-overnight-design-loop.md    # Morning handoff

apps/colign-frontend/                      # EXISTING — edited by the loop
├── tailwind.config.js                     # Foundation phase: token diff
├── src/responsive.css                     # Foundation phase: motion + depth primitives
└── src/components/                        # Foundation phase: 5 shared components

.gitignore                                 # MODIFY — exclude tools/design-loop/state/
```

---

## Task 1: Pre-flight verification

**Files:** none (verification only)

**Why first:** every other task depends on the existing stack working. If `dev:css` watcher dies, mock-auth fails, or Cypress responsive specs flake on `main`, the overnight loop will burn money producing nothing.

- [ ] **Step 1: Verify the existing responsive Cypress baseline passes on `main`**

Run from repo root:

```bash
git -C /Users/jasondijols/Documents/Code-Projects/Colign status
# Expected: clean tree on main, or only the AGENTS.md + docs/Gemini/ untracked files
```

Then boot the stack in real mode and run Cypress in mock mode (per [[colign-responsive-contract]]):

```bash
# In one terminal — backend, real mode (so non-Cypress sanity browsing still works)
cd /Users/jasondijols/Documents/Code-Projects/Colign/apps/colign-backend && set -a && source .env.local && set +a && SPRING_PROFILES_ACTIVE=h2 COLIGN_AUTH_MODE=real COLIGN_AUTH0_ISSUER=https://dev-xpbf6g232kcce8nc.us.auth0.com/ COLIGN_AUTH0_JWKS=https://dev-xpbf6g232kcce8nc.us.auth0.com/.well-known/jwks.json COLIGN_AUTH_AUDIENCE=https://api.colign.org JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw spring-boot:run

# In another — frontend remote
cd /Users/jasondijols/Documents/Code-Projects/Colign/apps/colign-frontend && ./node_modules/.bin/vite --port 5174

# In another — pa-host
cd /Users/jasondijols/Documents/Code-Projects/Colign/apps/pa-host && ./node_modules/.bin/vite --port 4173

# In another — dev:css watcher (the survives-without-TTY trick)
cd /Users/jasondijols/Documents/Code-Projects/Colign/apps/colign-frontend && tail -f /dev/null | ./node_modules/.bin/tailwindcss -i src/index.css -o src/colign-compiled.css --watch
```

Then in a fresh terminal, run Cypress responsive specs (flip auth to mock for Cypress, restore after — per the audit-teardown script):

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && scripts/audit-teardown.sh flip && trap 'scripts/audit-teardown.sh restore' EXIT INT TERM && cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 ./node_modules/.bin/cypress run --browser chrome --e2e --spec 'cypress/e2e/responsive-*.cy.ts'
```

Expected: both `responsive-narrow.cy.ts` and `responsive-wide.cy.ts` pass.

If they fail on `main`, STOP. The loop assumes a clean baseline. File an issue + fix before continuing.

- [ ] **Step 2: Verify mock JWT minting works for Ada**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && node scripts/mock-jwt.mjs --email ada@st6.dev --role MANAGER
```

Expected: outputs a JWT string starting with `eyJ`. (MANAGER role chosen so `/manager` surface has data.)

- [ ] **Step 3: Verify dev:css watcher pattern persists**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign/apps/colign-frontend && tail -f /dev/null | ./node_modules/.bin/tailwindcss -i src/index.css -o src/colign-compiled.css --watch &
sleep 5
ps -p $! && echo "watcher alive"
kill $!
```

Expected: `watcher alive` printed (confirms the `tail -f /dev/null` trick from runbook gotcha #7 still works).

- [ ] **Step 4: Verify gh CLI is authenticated**

```bash
gh auth status
```

Expected: "Logged in to github.com" — the loop will use `gh pr create`. If not authenticated, run `gh auth login` interactively before continuing.

- [ ] **Step 5: Confirm baseline + record in plan**

Edit this section adding: "Pre-flight verified `<DATE>`: Cypress green, JWT minted, dev:css trick works, gh authenticated."

No commit yet — Task 7 commits everything together.

---

## Task 2: Install Playwright + screenshot helper

**Files:**
- Create: `tools/design-loop/screenshot.mjs`
- Modify: `package.json` (root — add Playwright as a workspace devDep)

- [ ] **Step 1: Install Playwright at the workspace root**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && yarn add -D -W playwright
```

Expected: `playwright` appears in `package.json` `devDependencies`. (Yarn workspaces will resolve it from root.)

- [ ] **Step 2: Install the Chromium browser**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && ./node_modules/.bin/playwright install chromium
```

Expected: Chromium downloads under `~/Library/Caches/ms-playwright/`.

- [ ] **Step 3: Create the harness directory**

```bash
mkdir -p /Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/state && touch /Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/state/.gitkeep
```

- [ ] **Step 4: Write the screenshot helper**

Create `tools/design-loop/screenshot.mjs`:

```javascript
#!/usr/bin/env node
// =====================================================================
// tools/design-loop/screenshot.mjs
//
// CLI: node tools/design-loop/screenshot.mjs \
//        --url http://localhost:4173/dashboard \
//        --width 1440 --height 900 \
//        --out tmp/design-loop/dashboard/cycle-1/desktop.png \
//        --persona ada@st6.dev --role MANAGER
//
// Boots a Playwright Chromium, injects the mock JWT into localStorage
// under the keys the frontend expects (colign_jwt / colign_email /
// colign_role), navigates, waits for network idle, takes a full-page
// screenshot at the given viewport, and exits.
// =====================================================================

import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, _, i, arr) => {
    if (arr[i].startsWith('--') && i + 1 < arr.length) acc.push([arr[i].slice(2), arr[i + 1]])
    return acc
  }, [])
)

const url = args.url || (() => { throw new Error('--url required') })()
const width = parseInt(args.width || '1440', 10)
const height = parseInt(args.height || '900', 10)
const out = resolve(args.out || (() => { throw new Error('--out required') })())
const persona = args.persona || 'ada@st6.dev'
const role = args.role || 'MANAGER'

mkdirSync(dirname(out), { recursive: true })

// Mint mock JWT via the existing project script
const jwt = execSync(
  `node ${resolve(import.meta.dirname, '../../scripts/mock-jwt.mjs')} --email ${persona} --role ${role}`,
  { encoding: 'utf8' }
).trim()

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width, height } })

// Inject auth into localStorage before any page script runs
await context.addInitScript(
  ({ jwt, persona, role }) => {
    localStorage.setItem('colign_jwt', jwt)
    localStorage.setItem('colign_email', persona)
    localStorage.setItem('colign_role', role)
  },
  { jwt, persona, role }
)

const page = await context.newPage()

// Also flip auth-mode for the frontend at runtime by visiting a sentinel page first.
// (The frontend reads VITE_AUTH_MODE at build time; for runtime override we depend on
// localStorage being populated BEFORE the first auth check. The init script above handles that.)

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
} catch (e) {
  console.error(`Navigation failed: ${e.message}`)
  await browser.close()
  process.exit(2)
}

// Give any client-side animations a beat to settle
await page.waitForTimeout(500)

await page.screenshot({ path: out, fullPage: true })
await browser.close()

console.log(`Screenshot saved: ${out}`)
```

- [ ] **Step 5: Smoke-test the helper against a non-localhost URL**

Skip auth injection for a non-localhost test by aiming at example.com first:

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && node tools/design-loop/screenshot.mjs --url https://example.com --width 1440 --height 900 --out tmp/design-loop/smoke/example.png
```

Expected: `Screenshot saved: ...` and the PNG exists.

```bash
ls -l /Users/jasondijols/Documents/Code-Projects/Colign/tmp/design-loop/smoke/example.png
```

Expected: file exists, non-zero size.

- [ ] **Step 6: Smoke-test against localhost (requires Task 1 stack still running)**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && node tools/design-loop/screenshot.mjs --url http://localhost:4173/dashboard --width 1440 --height 900 --out tmp/design-loop/smoke/dashboard.png --persona ada@st6.dev --role MANAGER
```

Expected: screenshot is the actual Dashboard, not the login page. (If it's login, the localStorage injection isn't taking effect — debug before continuing. Likely culprit: the frontend `.env.local` has `VITE_AUTH_MODE=real`, which means the AuthGate goes through Auth0 regardless of localStorage. See Task 8 for the env-flip in worktrees.)

- [ ] **Step 7: No commit yet**

Task 7 commits.

---

## Task 3: Stack boot helper

**Files:**
- Create: `tools/design-loop/boot-stack.sh`
- Create: `tools/design-loop/teardown-stack.sh`

- [ ] **Step 1: Write boot-stack.sh**

Create `tools/design-loop/boot-stack.sh`:

```bash
#!/usr/bin/env bash
# =====================================================================
# tools/design-loop/boot-stack.sh
#
# Boots backend (mock auth) + frontend remote + pa-host + Tailwind
# watcher inside a worktree. Designed to be re-runnable: if any
# service is already up, leaves it alone.
#
# Usage: tools/design-loop/boot-stack.sh
#   Must be run from the worktree root.
#
# Writes PIDs to .design-loop-pids in the worktree for teardown.
# =====================================================================

set -euo pipefail

WORKTREE_ROOT="$(pwd)"
PID_FILE="${WORKTREE_ROOT}/.design-loop-pids"
LOG_DIR="${WORKTREE_ROOT}/tmp/design-loop-logs"
mkdir -p "$LOG_DIR"

# Helper: check if a port is responding
is_up() { curl -s -o /dev/null -w '%{http_code}' "http://localhost:$1" 2>/dev/null | grep -qE '^(200|404)$'; }

# Backend (port 8080) — mock auth mode for the loop
if is_up 8080; then
  echo "[boot] backend already up on :8080"
else
  echo "[boot] starting backend (mock auth)"
  (cd "${WORKTREE_ROOT}/apps/colign-backend" && \
    SPRING_PROFILES_ACTIVE=h2 COLIGN_AUTH_MODE=mock \
    JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
    PATH="$JAVA_HOME/bin:/opt/homebrew/bin:$PATH" \
    ./mvnw spring-boot:run > "${LOG_DIR}/backend.log" 2>&1 &)
  BACKEND_PID=$!
  echo "backend=$BACKEND_PID" >> "$PID_FILE"
  # Wait up to 60s for backend
  for i in {1..60}; do
    if is_up 8080; then echo "[boot] backend up"; break; fi
    sleep 1
  done
  is_up 8080 || { echo "[boot] backend failed to start; see $LOG_DIR/backend.log"; exit 1; }
fi

# Frontend remote (port 5174)
if is_up 5174; then
  echo "[boot] remote already up on :5174"
else
  echo "[boot] starting frontend remote"
  (cd "${WORKTREE_ROOT}/apps/colign-frontend" && \
    ./node_modules/.bin/vite --port 5174 > "${LOG_DIR}/remote.log" 2>&1 &)
  REMOTE_PID=$!
  echo "remote=$REMOTE_PID" >> "$PID_FILE"
  for i in {1..30}; do
    if curl -s -o /dev/null -w '%{http_code}' http://localhost:5174/remoteEntry.js 2>/dev/null | grep -q 200; then
      echo "[boot] remote up"
      break
    fi
    sleep 1
  done
fi

# pa-host (port 4173)
if is_up 4173; then
  echo "[boot] host already up on :4173"
else
  echo "[boot] starting pa-host"
  (cd "${WORKTREE_ROOT}/apps/pa-host" && \
    ./node_modules/.bin/vite --port 4173 > "${LOG_DIR}/host.log" 2>&1 &)
  HOST_PID=$!
  echo "host=$HOST_PID" >> "$PID_FILE"
  for i in {1..30}; do
    if is_up 4173; then echo "[boot] host up"; break; fi
    sleep 1
  done
fi

# Tailwind watcher (no port; check by PID file)
if grep -q "^css=" "$PID_FILE" 2>/dev/null && kill -0 "$(grep '^css=' "$PID_FILE" | cut -d= -f2)" 2>/dev/null; then
  echo "[boot] css watcher already running"
else
  echo "[boot] starting css watcher"
  (cd "${WORKTREE_ROOT}/apps/colign-frontend" && \
    tail -f /dev/null | ./node_modules/.bin/tailwindcss -i src/index.css -o src/colign-compiled.css --watch > "${LOG_DIR}/css.log" 2>&1 &)
  CSS_PID=$!
  echo "css=$CSS_PID" >> "$PID_FILE"
  sleep 2
fi

# Flip both .env.local files to mock mode (we restore in teardown)
for env_file in "${WORKTREE_ROOT}/apps/colign-frontend/.env.local" "${WORKTREE_ROOT}/apps/pa-host/.env.local"; do
  if [ -f "$env_file" ] && grep -q 'VITE_AUTH_MODE=real' "$env_file"; then
    cp "$env_file" "${env_file}.bak"
    sed -i.tmp 's/VITE_AUTH_MODE=real/VITE_AUTH_MODE=mock/' "$env_file" && rm "${env_file}.tmp"
    echo "[boot] flipped $env_file → mock"
  fi
done

echo "[boot] stack ready"
```

- [ ] **Step 2: Write teardown-stack.sh**

Create `tools/design-loop/teardown-stack.sh`:

```bash
#!/usr/bin/env bash
# =====================================================================
# tools/design-loop/teardown-stack.sh
#
# Kills processes whose PIDs are recorded in .design-loop-pids and
# restores .env.local files from .bak.
# =====================================================================

set -uo pipefail

WORKTREE_ROOT="$(pwd)"
PID_FILE="${WORKTREE_ROOT}/.design-loop-pids"

if [ -f "$PID_FILE" ]; then
  while IFS='=' read -r name pid; do
    if kill -0 "$pid" 2>/dev/null; then
      echo "[teardown] killing $name (pid=$pid)"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Restore env files
for env_file in "${WORKTREE_ROOT}/apps/colign-frontend/.env.local" "${WORKTREE_ROOT}/apps/pa-host/.env.local"; do
  if [ -f "${env_file}.bak" ]; then
    mv "${env_file}.bak" "$env_file"
    echo "[teardown] restored $env_file"
  fi
done

echo "[teardown] stack torn down"
```

- [ ] **Step 3: Make both scripts executable**

```bash
chmod +x /Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/boot-stack.sh /Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/teardown-stack.sh
```

- [ ] **Step 4: No commit yet (Task 7)**

---

## Task 4: Harness config + README

**Files:**
- Create: `tools/design-loop/config.json`
- Create: `tools/design-loop/README.md`

- [ ] **Step 1: Write the config**

Create `tools/design-loop/config.json`:

```json
{
  "surfaces": [
    { "slug": "weekly-plan",  "route": "/",           "page_file": "apps/colign-frontend/src/pages/WeeklyPlanPage.tsx",        "label": "Weekly plan (landing)" },
    { "slug": "dashboard",    "route": "/dashboard",  "page_file": "apps/colign-frontend/src/pages/DashboardPage.tsx",          "label": "Dashboard" },
    { "slug": "goals",        "route": "/goals",      "page_file": "apps/colign-frontend/src/pages/GoalsPage.tsx",              "label": "Goals" },
    { "slug": "commits",      "route": "/commits",    "page_file": "apps/colign-frontend/src/pages/CommitsPage.tsx",            "label": "Commits" },
    { "slug": "reconcile",    "route": "/reconcile",  "page_file": "apps/colign-frontend/src/pages/ReconcilePage.tsx",          "label": "Reconcile" },
    { "slug": "manager",      "route": "/manager",    "page_file": "apps/colign-frontend/src/pages/ManagerDashboardPage.tsx",   "label": "Manager dashboard" }
  ],
  "viewports": [
    { "name": "mobile",  "width": 375,  "height": 667 },
    { "name": "desktop", "width": 1440, "height": 900 }
  ],
  "persona":  { "email": "ada@st6.dev", "role": "MANAGER" },
  "max_cycles_per_surface": 5,
  "failure_budget": 2,
  "host_base_url": "http://localhost:4173",
  "design_md_path": "docs/superpowers/design/DESIGN.md",
  "worktree_root": "../colign-worktrees"
}
```

- [ ] **Step 2: Write the README**

Create `tools/design-loop/README.md`:

```markdown
# Colign Design Loop

Autonomous overnight loop that refreshes Colign's post-onboarding surfaces.
See [the spec](../../docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md)
for design rationale and decisions.

## Prerequisites

1. `DESIGN.md` exists at `docs/superpowers/design/DESIGN.md` (produced by
   `/design-consultation`). The loop refuses to start without it.
2. Playwright Chromium installed: `yarn playwright install chromium`
3. `gh` CLI authenticated: `gh auth status`
4. Clean git tree on `main`
5. Cypress responsive specs pass on `main` (the regression baseline)

## Run

From repo root:

```
# The loop is invoked via the Workflow tool. From a Claude Code session:
Workflow({ scriptPath: 'tools/design-loop/workflow.js' })
```

Progress is visible at `/workflows`. Per-surface PRs appear under
`gh pr list --label design-polish`.

## Resume

If the loop crashes or you stop it (TaskStop), resume with the runId
from the prior invocation:

```
Workflow({ scriptPath: 'tools/design-loop/workflow.js', resumeFromRunId: '<wf_id>' })
```

Completed agents with identical prompts return cached results instantly.

## Abort

Stop the workflow task, then:

```
tools/design-loop/teardown-stack.sh   # run inside each active worktree
```

To roll back worktrees:

```
for s in foundation weekly-plan dashboard goals commits reconcile manager; do
  git worktree remove ../colign-worktrees/design-$s --force 2>/dev/null
  git branch -D design/$s 2>/dev/null
done
```

## State

`tools/design-loop/state/` is gitignored and holds per-run state.
```

- [ ] **Step 3: Update root .gitignore**

Read current `.gitignore`, then add at the bottom:

```
# design-loop harness state (gitignored)
tools/design-loop/state/*
!tools/design-loop/state/.gitkeep
.design-loop-pids
tmp/design-loop/
```

- [ ] **Step 4: No commit yet**

---

## Task 5: Workflow script — skeleton

**Files:**
- Create: `tools/design-loop/workflow.js`

> Note: this task creates the skeleton with meta block, config loader, and the foundation phase. Per-surface phase is added in Task 6.

- [ ] **Step 1: Write workflow.js with meta + foundation phase**

Create `tools/design-loop/workflow.js`:

```javascript
// =====================================================================
// tools/design-loop/workflow.js
//
// Workflow script for the Colign overnight design loop.
// See ../../docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md
//
// IMPORTANT: workflow scripts cannot use fs/process — config is inlined
// here as a literal. Edits to config.json must be mirrored here.
// =====================================================================

export const meta = {
  name: 'colign-design-loop',
  description: 'Foundation token+component pass + sequential per-surface polish via critic/designer/verifier cycles',
  phases: [
    { title: 'Pre-flight' },
    { title: 'Foundation' },
    { title: 'Per-surface polish' },
    { title: 'Wrap-up' },
  ],
}

// === Config (mirror of tools/design-loop/config.json) =================

const SURFACES = [
  { slug: 'weekly-plan', route: '/',          page_file: 'apps/colign-frontend/src/pages/WeeklyPlanPage.tsx',     label: 'Weekly plan (landing)' },
  { slug: 'dashboard',   route: '/dashboard', page_file: 'apps/colign-frontend/src/pages/DashboardPage.tsx',       label: 'Dashboard' },
  { slug: 'goals',       route: '/goals',     page_file: 'apps/colign-frontend/src/pages/GoalsPage.tsx',           label: 'Goals' },
  { slug: 'commits',     route: '/commits',   page_file: 'apps/colign-frontend/src/pages/CommitsPage.tsx',         label: 'Commits' },
  { slug: 'reconcile',   route: '/reconcile', page_file: 'apps/colign-frontend/src/pages/ReconcilePage.tsx',       label: 'Reconcile' },
  { slug: 'manager',     route: '/manager',   page_file: 'apps/colign-frontend/src/pages/ManagerDashboardPage.tsx', label: 'Manager dashboard' },
]
const PERSONA = { email: 'ada@st6.dev', role: 'MANAGER' }
const MAX_CYCLES = 5
const FAILURE_BUDGET = 2
const HOST_BASE = 'http://localhost:4173'
const WORKTREE_ROOT = '../colign-worktrees'

// === Schemas for agent outputs ========================================

const CRITIQUE_SCHEMA = {
  type: 'object',
  required: ['issues', 'overall_assessment'],
  properties: {
    overall_assessment: { type: 'string', description: 'One paragraph holistic read of the surface' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'area', 'issue', 'suggested_direction'],
        properties: {
          severity: { type: 'integer', minimum: 1, maximum: 5 },
          area:     { type: 'string', enum: ['type', 'color', 'spacing', 'depth', 'motion', 'hierarchy', 'microcopy', 'polish'] },
          file_hint: { type: 'string', description: 'Best-guess file to edit; may be empty' },
          issue:     { type: 'string', description: 'Concrete description of what is wrong' },
          suggested_direction: { type: 'string', description: 'Direction (NOT code) — e.g. "tighten line-height to match DESIGN.md type ramp"' },
        },
      },
    },
  },
}

const DESIGNER_SCHEMA = {
  type: 'object',
  required: ['addressed_issues', 'files_changed', 'commit_sha'],
  properties: {
    addressed_issues: { type: 'array', items: { type: 'integer' }, description: 'Indices into the critic issue list' },
    files_changed: { type: 'array', items: { type: 'string' } },
    commit_sha: { type: 'string' },
    summary: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['action', 'reasoning', 'cypress_passed'],
  properties: {
    action: { type: 'string', enum: ['keep_continue', 'keep_done', 'revert'] },
    cypress_passed: { type: 'boolean' },
    reasoning: { type: 'string' },
    visual_delta: { type: 'string', description: 'What changed visually, observed from screenshot comparison' },
  },
}

const FOUNDATION_SCHEMA = {
  type: 'object',
  required: ['pr_url', 'files_changed', 'token_summary', 'cypress_passed'],
  properties: {
    pr_url: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    token_summary: { type: 'string' },
    components_refactored: { type: 'array', items: { type: 'string' } },
    cypress_passed: { type: 'boolean' },
  },
}

// === Pre-flight =======================================================

phase('Pre-flight')

const designMd = await agent(
  `Read the file at \`docs/superpowers/design/DESIGN.md\` relative to the repo root \`/Users/jasondijols/Documents/Code-Projects/Colign\`. Return its FULL contents verbatim. If the file does not exist, return exactly the string "MISSING_DESIGN_MD".`,
  { label: 'load-design-md' }
)

if (!designMd || designMd.trim() === 'MISSING_DESIGN_MD') {
  throw new Error('DESIGN.md must exist at docs/superpowers/design/DESIGN.md before running this loop. Run /design-consultation first.')
}

log(`DESIGN.md loaded (${designMd.length} chars)`)

// === Foundation phase =================================================

phase('Foundation')

const foundationResult = await agent(
  buildFoundationPrompt(designMd),
  { label: 'foundation', schema: FOUNDATION_SCHEMA }
)

if (!foundationResult.cypress_passed) {
  throw new Error(`Foundation phase failed Cypress. PR: ${foundationResult.pr_url || 'not opened'}`)
}

log(`Foundation PR: ${foundationResult.pr_url}`)
log(`Components refactored: ${foundationResult.components_refactored?.join(', ') || '(none reported)'}`)

// === Per-surface polish ===============================================
// (added in Task 6)

phase('Per-surface polish')
log('TODO: surface loop wired in Task 6')

// === Wrap-up ==========================================================

phase('Wrap-up')
log('Loop complete. Triage PRs labeled `design-polish` and `design-polish-attempted`.')

// =====================================================================
// PROMPT BUILDERS
// =====================================================================

function buildFoundationPrompt(designMd) {
  return [
    '# Foundation Phase — Tokens + Shared Components',
    '',
    '## Your role',
    'You are the foundation agent for the Colign design loop. Your job is to translate DESIGN.md into concrete Tailwind tokens and refactor 5 shared components, then open a PR.',
    '',
    '## Environment',
    `- Worktree: \`${WORKTREE_ROOT}/design-foundation\` (already created)`,
    '- Branch: `design/foundation` (already checked out in the worktree)',
    '- Stack must be booted via `tools/design-loop/boot-stack.sh` from inside the worktree',
    '- Mock auth as `ada@st6.dev` MANAGER',
    '- Tailwind watcher running (boot script handles this)',
    '',
    '## DESIGN.md (the taste anchor)',
    '```markdown',
    designMd,
    '```',
    '',
    '## What you must do',
    '',
    '1. `cd` into the foundation worktree and run `tools/design-loop/boot-stack.sh` if the stack is not already up (idempotent).',
    '2. Read the current `apps/colign-frontend/tailwind.config.js` so you understand existing tokens.',
    '3. Read `apps/colign-frontend/src/responsive.css` so you understand the existing motion/depth/responsive primitives.',
    '4. Propose a Tailwind token diff that **extends, never replaces** existing tokens. Cover:',
    '   - Color palette (semantic names: surface, fg, accent, muted, etc.)',
    '   - Type ramp (fluid type scale already exists — refine if DESIGN.md calls for it)',
    '   - Spacing scale (additions)',
    '   - Shadows / depth primitives (DESIGN.md likely calls for layered depth)',
    '   - Motion primitives (durations, easings, named transitions)',
    '5. Apply the diff to `apps/colign-frontend/tailwind.config.js`.',
    '6. Update `apps/colign-frontend/src/responsive.css` with motion + depth utilities matching DESIGN.md.',
    '7. Refactor these 5 shared components to use the new tokens (verified to exist in repo):',
    '   - `apps/colign-frontend/src/components/AppShell.tsx` (top-level layout — touches every page)',
    '   - `apps/colign-frontend/src/components/SidebarShell.tsx` (sidebar layout)',
    '   - `apps/colign-frontend/src/components/NavRail.tsx` (primary navigation)',
    '   - `apps/colign-frontend/src/components/IcDrillDrawer.tsx` (drawer / drill-down pattern)',
    '   - `apps/colign-frontend/src/components/ConfirmDialog.tsx` (modal dialog pattern)',
    '   The app uses `flowbite-react`\'s Button directly (no local `Button.tsx`). Address button styling via Tailwind theme + the `flowbite` plugin config in `tailwind.config.js` instead of trying to refactor a non-existent component.',
    '8. After each Write/Edit, verify the change persisted on disk: `grep -c "<unique marker from the edit>" <file>`. Runbook gotcha #1: HMR can cause silent no-op writes.',
    '9. Restart the Tailwind watcher if you added new utility classes (`yarn build:css` one-shot also works).',
    '10. Run Cypress responsive specs from the worktree:',
    '    ```',
    '    cd /Users/jasondijols/Documents/Code-Projects/Colign && scripts/audit-teardown.sh flip && trap "scripts/audit-teardown.sh restore" EXIT INT TERM && cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 ./node_modules/.bin/cypress run --browser chrome --e2e --spec "cypress/e2e/responsive-*.cy.ts"',
    '    ```',
    '    **MUST PASS.** If they fail, revert all edits (`git reset --hard origin/main`) and return `cypress_passed: false`.',
    '11. Take before/after screenshots of 3 representative surfaces (Dashboard, Goals, Commits) at both viewports using:',
    '    ```',
    '    node tools/design-loop/screenshot.mjs --url http://localhost:4173/<route> --width <w> --height <h> --out tmp/design-loop/foundation/<surface>-<vp>.png --persona ada@st6.dev --role MANAGER',
    '    ```',
    '12. Commit changes in granular logical commits using conventional format:',
    '    `design(foundation): <what> — <why>`',
    '13. Push the branch and open a PR via `gh pr create`:',
    '    - Title: `Design foundation — tokens + shared components`',
    '    - Body: include',
    '      - Frontmatter block: `phase: foundation`, `cypress_status`, `files_changed_count`',
    '      - Token diff summary (1 paragraph per category)',
    '      - List of refactored components',
    '      - Before/after screenshot grid (markdown image links pointing at uploaded paths — use `gh issue-attach` or commit screenshots to a `docs/design-screenshots/foundation/` path)',
    '    - Label: `design-polish`',
    '',
    '## Hard constraints',
    '- NO commits to `main`. Work only in `design/foundation`.',
    '- NO new dependencies without explicit token-diff justification.',
    '- NO removal of existing tokens. Extend only.',
    '- Cypress responsive specs are a hard gate. Fail = revert + report.',
    '- After every Write/Edit to a `.tsx` or `.ts` file, grep-verify on disk.',
    '- If the dev server dies mid-task, restart it via `boot-stack.sh` and continue.',
    '',
    '## Return value',
    'Call StructuredOutput with:',
    '- `pr_url`: the PR URL from `gh pr create`',
    '- `files_changed`: list of relative paths',
    '- `token_summary`: 1-paragraph summary of the token changes',
    '- `components_refactored`: list',
    '- `cypress_passed`: boolean',
    '',
  ].join('\n')
}
```

- [ ] **Step 2: Sanity-parse the script**

We don't run the workflow yet (no DESIGN.md). Just sanity-check the JS parses:

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && node --check tools/design-loop/workflow.js
```

Expected: no output (parse OK). If it errors, fix the syntax before continuing.

- [ ] **Step 3: No commit yet**

---

## Task 6: Workflow script — per-surface phase

**Files:**
- Modify: `tools/design-loop/workflow.js` (replace the `phase('Per-surface polish')` block)

- [ ] **Step 1: Replace the placeholder per-surface block**

In `tools/design-loop/workflow.js`, find this block:

```javascript
// === Per-surface polish ===============================================
// (added in Task 6)

phase('Per-surface polish')
log('TODO: surface loop wired in Task 6')
```

Replace it with:

```javascript
// === Per-surface polish ===============================================

phase('Per-surface polish')

const surfaceResults = []
for (const surface of SURFACES) {
  log(`--- Starting surface: ${surface.label} ---`)
  const result = await runSurfaceLoop(surface, designMd)
  surfaceResults.push(result)
  log(`--- Done with ${surface.slug}: ${result.final_status} after ${result.cycles_used} cycles ---`)
}

log(`All surfaces complete. Summary:`)
for (const r of surfaceResults) {
  log(`  ${r.surface}: ${r.final_status} → ${r.pr_url || 'no PR'}`)
}

// === Wrap-up ==========================================================

phase('Wrap-up')
log('Loop complete. Triage PRs labeled `design-polish` and `design-polish-attempted`.')

// =====================================================================
// PER-SURFACE INNER LOOP
// =====================================================================

async function runSurfaceLoop(surface, designMd) {
  let consecutiveReverts = 0
  let lastGoodCycle = 0
  // Default to 'complete' — surfaces are successful unless the failure budget triggers.
  // Running out of cycles with keep_continue is still success (productive work done).
  let finalStatus = 'complete'
  const cycleLog = []

  // Take a "before" snapshot (cycle-0) for the PR description
  await agent(
    buildSnapshotPrompt(surface, 0, 'before'),
    { label: `snapshot:${surface.slug}:before` }
  )

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    log(`${surface.slug}: cycle ${cycle}/${MAX_CYCLES}`)

    // Critic
    const critique = await agent(
      buildCriticPrompt(surface, cycle, designMd),
      { label: `critic:${surface.slug}:c${cycle}`, schema: CRITIQUE_SCHEMA }
    )

    // Stop if critic finds nothing significant
    const significantIssues = (critique.issues || []).filter(i => i.severity >= 3)
    if (significantIssues.length === 0) {
      log(`${surface.slug}: critic found no severity≥3 issues — done`)
      finalStatus = 'complete'
      lastGoodCycle = cycle - 1
      cycleLog.push({ cycle, action: 'no-op', critic_summary: critique.overall_assessment })
      break
    }

    // Designer
    const designerResult = await agent(
      buildDesignerPrompt(surface, cycle, critique, designMd),
      { label: `designer:${surface.slug}:c${cycle}`, schema: DESIGNER_SCHEMA }
    )

    // Verifier
    const verdict = await agent(
      buildVerifierPrompt(surface, cycle, critique, designerResult),
      { label: `verifier:${surface.slug}:c${cycle}`, schema: VERDICT_SCHEMA }
    )

    cycleLog.push({
      cycle,
      action: verdict.action,
      designer_commit: designerResult.commit_sha,
      critic_issues_total: critique.issues.length,
      addressed: designerResult.addressed_issues?.length || 0,
      cypress_passed: verdict.cypress_passed,
      visual_delta: verdict.visual_delta,
    })

    if (verdict.action === 'revert') {
      consecutiveReverts++
      log(`${surface.slug}: cycle ${cycle} reverted (consecutive=${consecutiveReverts})`)
      if (consecutiveReverts >= FAILURE_BUDGET) {
        log(`${surface.slug}: failure budget hit, opening attempted PR`)
        finalStatus = 'attempted'
        break
      }
      continue
    }

    consecutiveReverts = 0
    lastGoodCycle = cycle

    if (verdict.action === 'keep_done') {
      log(`${surface.slug}: verifier says done at cycle ${cycle}`)
      finalStatus = 'complete'
      break
    }
  }

  // finalStatus is already 'complete' from init unless FAILURE_BUDGET hit

  // Take an "after" snapshot using lastGoodCycle
  if (lastGoodCycle > 0) {
    await agent(
      buildSnapshotPrompt(surface, lastGoodCycle, 'after'),
      { label: `snapshot:${surface.slug}:after` }
    )
  }

  // Skip PR if no commits landed (critic found nothing OR all cycles reverted)
  if (lastGoodCycle === 0) {
    log(`${surface.slug}: no commits landed (lastGoodCycle=0), skipping PR`)
    return {
      surface: surface.slug,
      cycles_used: 0,
      final_status: finalStatus,
      pr_url: null,
      note: finalStatus === 'attempted'
        ? 'All cycles reverted before any change held — surface needs human eye'
        : 'Critic found no significant issues — surface already meets DESIGN.md',
    }
  }

  // Open the PR
  const prResult = await agent(
    buildPrPrompt(surface, lastGoodCycle, finalStatus, cycleLog),
    { label: `open-pr:${surface.slug}` }
  )

  return {
    surface: surface.slug,
    cycles_used: lastGoodCycle,
    final_status: finalStatus,
    pr_url: extractUrl(prResult),
  }
}

function extractUrl(text) {
  const m = String(text).match(/https?:\/\/github\.com\/[^\s)]+/)
  return m ? m[0] : null
}

// =====================================================================
// PROMPT BUILDERS (continued)
// =====================================================================

function buildSnapshotPrompt(surface, cycle, label) {
  return [
    `# Snapshot — ${surface.label} (${label})`,
    '',
    `## Your role`,
    `Take screenshots of ${surface.label} for the loop's record.`,
    '',
    `## Environment`,
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Stack: run \`tools/design-loop/boot-stack.sh\` if not already up`,
    '',
    `## Actions`,
    `1. \`cd\` to the worktree. Ensure stack is booted (idempotent).`,
    `2. Take screenshots at mobile (375x667) and desktop (1440x900):`,
    `   \`\`\``,
    `   node tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 375 --height 667 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-${label}/mobile.png --persona ${PERSONA.email} --role ${PERSONA.role}`,
    `   node tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 1440 --height 900 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-${label}/desktop.png --persona ${PERSONA.email} --role ${PERSONA.role}`,
    `   \`\`\``,
    `3. Verify both files exist with non-zero size.`,
    `4. Return the two file paths as a brief message.`,
  ].join('\n')
}

function buildCriticPrompt(surface, cycle, designMd) {
  return [
    `# Critic Agent — ${surface.label} cycle ${cycle}`,
    '',
    `## Your role`,
    `You are an outside designer reviewing a screenshot. You can READ files but CANNOT edit code. Your job is to identify what's off about the current state of this surface vs DESIGN.md.`,
    '',
    `## Environment`,
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- URL: ${HOST_BASE}${surface.route}`,
    `- Mock auth: ${PERSONA.email} (${PERSONA.role})`,
    '',
    `## DESIGN.md (the taste anchor — be specific to its vocabulary)`,
    '```markdown',
    designMd,
    '```',
    '',
    `## Actions`,
    `1. \`cd\` to the worktree. Ensure stack booted via \`tools/design-loop/boot-stack.sh\`.`,
    `2. Take fresh screenshots at both viewports:`,
    `   \`\`\``,
    `   node tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 375 --height 667 --out tmp/design-loop/${surface.slug}/cycle-${cycle}/mobile.png --persona ${PERSONA.email} --role ${PERSONA.role}`,
    `   node tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 1440 --height 900 --out tmp/design-loop/${surface.slug}/cycle-${cycle}/desktop.png --persona ${PERSONA.email} --role ${PERSONA.role}`,
    `   \`\`\``,
    `3. Read both PNGs (Claude Code's Read tool can view images).`,
    `4. Compare what you see to the principles in DESIGN.md — be specific to its vocabulary, not generic design jargon.`,
    `5. Emit a structured issue list. Use the schema (StructuredOutput tool):`,
    `   - severity 1–5 (5 = visually broken / hurts comprehension; 1 = nitpick)`,
    `   - area: type | color | spacing | depth | motion | hierarchy | microcopy | polish`,
    `   - file_hint: best-guess file (\`${surface.page_file}\` or imports of it)`,
    `   - issue: concrete description`,
    `   - suggested_direction: NOT code — direction only (e.g. "increase letter-spacing on H1 to match DESIGN.md type ramp")`,
    `   `,
    `## Hard constraints`,
    `- DO NOT propose code. Direction only.`,
    `- DO NOT edit any files.`,
    `- Skip severity-1 issues if cycle > 3 (they're nitpicks; cycle budget is finite).`,
    `- Be specific to DESIGN.md's actual vocabulary. If DESIGN.md says "soft shadows" don't recommend "drop shadow" generically.`,
  ].join('\n')
}

function buildDesignerPrompt(surface, cycle, critique, designMd) {
  return [
    `# Designer Agent — ${surface.label} cycle ${cycle}`,
    '',
    `## Your role`,
    `Implement design improvements for ${surface.label}. Pick the top 2-3 critic issues, make specific changes, commit.`,
    '',
    `## Environment`,
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Surface file: \`${surface.page_file}\``,
    `- Files in scope: surface page + components imported transitively by it`,
    `- Files OUT of scope: shared components (AppShell, SidebarShell, NavRail, IcDrillDrawer, ConfirmDialog) and Tailwind config — foundation phase owns those`,
    '',
    `## DESIGN.md`,
    '```markdown',
    designMd,
    '```',
    '',
    `## Critic issues from this cycle`,
    '```json',
    JSON.stringify(critique.issues, null, 2),
    '```',
    '',
    `## Critic overall assessment`,
    critique.overall_assessment || '(none)',
    '',
    `## Actions`,
    `1. \`cd\` to the worktree.`,
    `2. Pick the top 2-3 highest-severity issues that are actually addressable in this cycle.`,
    `3. For each picked issue:`,
    `   - Propose a specific code change (1-2 sentences)`,
    `   - Edit the file using Edit tool`,
    `   - **AFTER the edit, grep-verify the change persisted on disk** (runbook gotcha #1 — HMR no-op):`,
    `     \`grep -cF '<a unique snippet of what you just wrote>' <file>\``,
    `     Expected: ≥ 1`,
    `4. If you added new Tailwind utility classes, run \`yarn build:css\` from \`apps/colign-frontend/\` to rebuild the compiled CSS (runbook gotcha #7).`,
    `5. Commit with conventional format:`,
    `   \`git add <changed files>\``,
    `   \`git commit -m "design(${surface.slug}): cycle ${cycle} — <summary>"\``,
    `6. Capture the commit SHA: \`git rev-parse HEAD\``,
    '',
    `## Return value (StructuredOutput)`,
    `- addressed_issues: list of indices into the critic issue array (0-based)`,
    `- files_changed: list of relative paths`,
    `- commit_sha: the SHA from step 6`,
    `- summary: 1-sentence description`,
    '',
    `## Hard constraints`,
    `- NO edits to shared components (AppShell, SidebarShell, NavRail, IcDrillDrawer, ConfirmDialog) or Tailwind config. If an issue truly requires one, NOTE IT in the commit message body and skip the issue.`,
    `- NO new dependencies.`,
    `- NO new files unless DESIGN.md calls for new UI patterns (rare — most polish is in-place).`,
    `- NO functional changes (no new features, no renamed concepts, no removed UI elements). Visual polish only.`,
    `- After EVERY Write/Edit, grep-verify.`,
  ].join('\n')
}

function buildVerifierPrompt(surface, cycle, critique, designerResult) {
  return [
    `# Verifier Agent — ${surface.label} cycle ${cycle}`,
    '',
    `## Your role`,
    `Judge whether this cycle improved the surface. Revert on regression. Run the hard regression gate (Cypress responsive specs).`,
    '',
    `## Environment`,
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Designer's commit: \`${designerResult.commit_sha}\``,
    `- Previous cycle screenshots: \`tmp/design-loop/${surface.slug}/cycle-${cycle - 1}/\` (or \`cycle-0-before\` if first cycle)`,
    `- New screenshots: take fresh ones with the snapshot pattern below`,
    '',
    `## Critic original issues`,
    '```json',
    JSON.stringify(critique.issues, null, 2),
    '```',
    '',
    `## Designer claimed addressed (indices)`,
    JSON.stringify(designerResult.addressed_issues || []),
    '',
    `## Actions`,
    `1. \`cd\` to the worktree.`,
    `2. Take post-cycle screenshots:`,
    `   \`\`\``,
    `   node tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 375 --height 667 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-post/mobile.png --persona ${PERSONA.email} --role ${PERSONA.role}`,
    `   node tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 1440 --height 900 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-post/desktop.png --persona ${PERSONA.email} --role ${PERSONA.role}`,
    `   \`\`\``,
    `3. Run Cypress responsive specs (HARD GATE):`,
    `   \`\`\``,
    `   cd /Users/jasondijols/Documents/Code-Projects/Colign && scripts/audit-teardown.sh flip && trap "scripts/audit-teardown.sh restore" EXIT INT TERM && cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 ./node_modules/.bin/cypress run --browser chrome --e2e --spec "cypress/e2e/responsive-*.cy.ts"`,
    `   \`\`\``,
    `4. If Cypress FAILS: revert the cycle and return action="revert", cypress_passed=false:`,
    `   \`git reset --hard HEAD~1\``,
    `5. If Cypress passes: read both screenshots (Read tool views images). Compare:`,
    `   - Is the new state visually better than the previous cycle?`,
    `   - Did the designer's changes actually address the claimed issues?`,
    `   - Are there any new regressions (text clipped, elements misaligned, color contrast lost)?`,
    `6. Judge:`,
    `   - **keep_done**: this cycle's changes are good AND remaining issues are nitpicks (or no significant issues left)`,
    `   - **keep_continue**: this cycle's changes are good AND there are more significant issues worth another cycle`,
    `   - **revert**: this cycle made the surface worse, or didn't actually address the claimed issues. Run \`git reset --hard HEAD~1\`.`,
    '',
    `## Return value (StructuredOutput)`,
    `- action: keep_continue | keep_done | revert`,
    `- cypress_passed: boolean`,
    `- reasoning: 1-2 sentences why`,
    `- visual_delta: brief description of what changed visually`,
    '',
    `## Hard constraints`,
    `- Cypress failure = automatic revert. No exceptions.`,
    `- Bias toward "revert" if uncertain. Better to lose a cycle than ship slop.`,
    `- "keep_done" is preferred over "keep_continue" if remaining issues are minor — finite cycle budget.`,
  ].join('\n')
}

function buildPrPrompt(surface, lastGoodCycle, finalStatus, cycleLog) {
  const cycleLogJson = JSON.stringify(cycleLog, null, 2)
  const labelSuffix = finalStatus === 'attempted' ? '-attempted' : ''
  const titleSuffix = finalStatus === 'attempted' ? ' — attempted, needs human eye' : ''
  return [
    `# Open PR — ${surface.label}`,
    '',
    `## Your role`,
    `Open a pull request for the ${surface.label} surface with full before/after context.`,
    '',
    `## Environment`,
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Branch: \`design/${surface.slug}\``,
    `- Last good cycle: ${lastGoodCycle}`,
    `- Final status: ${finalStatus}`,
    '',
    `## Cycle log`,
    '```json',
    cycleLogJson,
    '```',
    '',
    `## Actions`,
    `1. \`cd\` to the worktree.`,
    `2. Make sure the working tree is clean (no uncommitted changes left from a verifier revert).`,
    `3. Copy screenshots into the repo so the PR body can reference them:`,
    `   - Source: \`tmp/design-loop/${surface.slug}/cycle-0-before/\` and \`tmp/design-loop/${surface.slug}/cycle-${lastGoodCycle}-after/\``,
    `   - Destination: \`docs/design-screenshots/${surface.slug}/\` (create dir, commit)`,
    `4. Push the branch:`,
    `   \`git push -u origin design/${surface.slug}\``,
    `5. Open the PR:`,
    `   \`\`\``,
    `   gh pr create --title "design(${surface.slug}): visual polish${titleSuffix}" --label "design-polish${labelSuffix}" --body "$(cat <<'EOF'`,
    `---`,
    `surface: ${surface.slug}`,
    `cycles: ${lastGoodCycle}`,
    `final_status: ${finalStatus}`,
    `---`,
    ``,
    `## Before / After`,
    ``,
    `### Mobile (375×667)`,
    `| Before | After |`,
    `|---|---|`,
    `| ![before](docs/design-screenshots/${surface.slug}/cycle-0-before/mobile.png) | ![after](docs/design-screenshots/${surface.slug}/cycle-${lastGoodCycle}-after/mobile.png) |`,
    ``,
    `### Desktop (1440×900)`,
    `| Before | After |`,
    `|---|---|`,
    `| ![before](docs/design-screenshots/${surface.slug}/cycle-0-before/desktop.png) | ![after](docs/design-screenshots/${surface.slug}/cycle-${lastGoodCycle}-after/desktop.png) |`,
    ``,
    `## Cycle log`,
    ``,
    '```json',
    cycleLogJson,
    '```',
    ``,
    `EOF`,
    `)"`,
    `   \`\`\``,
    `6. Return the PR URL (as a plain string at the end of your output) so the workflow can capture it.`,
    '',
    `## Hard constraints`,
    `- DO NOT merge the PR. Human triage only.`,
    `- If \`gh pr create\` fails (e.g., empty diff because everything reverted), open an issue instead summarizing what was tried.`,
  ].join('\n')
}
```

- [ ] **Step 2: Sanity-parse**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && node --check tools/design-loop/workflow.js
```

Expected: no output.

- [ ] **Step 3: No commit yet**

---

## Task 7: Run /design-consultation interactively

**Files (produced by the skill — paths approximate):**
- Create: `docs/superpowers/design/DESIGN.md` (may land at gstack's default; move if needed)

> This task is interactive with the user. The user MUST be available during this task — it's 45–60 minutes of back-and-forth.

- [ ] **Step 1: Invoke the skill**

In Claude Code:

```
Skill: design-consultation
```

The skill will walk through:
- Current product understanding
- Reference apps (be prepared: Linear, Cron, Vercel, Stripe, Raycast, Arc, Granola, Things, Notion — pick 3-5 that match the *feeling* you want, not generic favorites)
- Aesthetic vocabulary (calm vs energetic, minimal vs rich, geometric vs organic, etc.)
- Typography, color, spacing, motion, depth principles
- Output preview HTML files

- [ ] **Step 2: Move DESIGN.md to the canonical path if needed**

If `/design-consultation` saved DESIGN.md somewhere other than `docs/superpowers/design/DESIGN.md`:

```bash
mkdir -p /Users/jasondijols/Documents/Code-Projects/Colign/docs/superpowers/design
mv <wherever it landed> /Users/jasondijols/Documents/Code-Projects/Colign/docs/superpowers/design/DESIGN.md
```

- [ ] **Step 3: Verify DESIGN.md is non-empty and references the picked apps**

```bash
wc -l /Users/jasondijols/Documents/Code-Projects/Colign/docs/superpowers/design/DESIGN.md
```

Expected: ≥ 100 lines (`/design-consultation` produces substantial output).

```bash
grep -E '(reference|inspiration|like|similar to)' /Users/jasondijols/Documents/Code-Projects/Colign/docs/superpowers/design/DESIGN.md | head -5
```

Expected: at least one match showing the reference apps are baked into the doc.

- [ ] **Step 4: No commit yet — Task 8 commits everything together**

---

## Task 8: Commit harness + DESIGN.md

**Files:** all created in Tasks 2–7

- [ ] **Step 1: Status check**

```bash
git -C /Users/jasondijols/Documents/Code-Projects/Colign status
```

Expected: untracked `tools/design-loop/`, `docs/superpowers/design/`, and any preview assets from `/design-consultation`. Modified `.gitignore`, `package.json`, `yarn.lock`.

- [ ] **Step 2: Stage specifically**

Stage only the harness + DESIGN.md (NOT the unrelated `AGENTS.md` and `docs/Gemini/` from the initial git status):

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && git add tools/design-loop/ docs/superpowers/design/ .gitignore package.json yarn.lock
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/jasondijols/Documents/Code-Projects/Colign commit -m "$(cat <<'EOF'
feat(design-loop): harness + DESIGN.md anchor

- tools/design-loop/: Workflow script, Playwright screenshot helper,
  mock-auth wiring, stack boot/teardown scripts, config + README
- docs/superpowers/design/DESIGN.md: produced by /design-consultation,
  anchors the overnight loop's taste reference
- Adds Playwright as a workspace devDep

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push main**

```bash
git -C /Users/jasondijols/Documents/Code-Projects/Colign push origin main
```

(This commit goes to `main` because it's tooling, not design changes. The design changes go on `design/*` branches via the loop.)

---

## Task 9: Create worktrees

**Files:** none (worktree operations)

- [ ] **Step 1: Create the worktree root directory next to the repo**

```bash
mkdir -p /Users/jasondijols/Documents/Code-Projects/colign-worktrees
```

- [ ] **Step 2: Create the foundation worktree**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && git worktree add -b design/foundation ../colign-worktrees/design-foundation main
```

Expected: `Preparing worktree (new branch 'design/foundation')`.

- [ ] **Step 3: Create one worktree per surface (off main initially; the foundation PR will be rebased in after Phase 1)**

```bash
for slug in weekly-plan dashboard goals commits reconcile manager; do
  cd /Users/jasondijols/Documents/Code-Projects/Colign && git worktree add -b design/$slug ../colign-worktrees/design-$slug main
done
```

Expected: 6 new worktrees created.

- [ ] **Step 4: Verify worktrees**

```bash
git -C /Users/jasondijols/Documents/Code-Projects/Colign worktree list
```

Expected: 8 entries — main repo + 7 design worktrees.

- [ ] **Step 5: Install deps in each worktree (yarn workspaces should symlink, but verify)**

```bash
for dir in /Users/jasondijols/Documents/Code-Projects/colign-worktrees/design-*; do
  echo "--- $dir ---"
  ls "$dir/node_modules" >/dev/null 2>&1 && echo "node_modules present" || (cd "$dir" && yarn install)
done
```

Expected: each worktree either has `node_modules` (symlinked or fresh) or yarn runs successfully.

> Note: yarn workspaces typically share `node_modules` at the repo root. Each worktree should NOT need its own full install — it sees the parent's `node_modules` via the workspace resolution. If you see "cannot find module" errors at boot time, run `yarn install` in that worktree.

- [ ] **Step 6: No commit (worktree creation is local-only)**

---

## Task 10: Dry-run validation

**Files:** none (validation only)

- [ ] **Step 1: Boot the stack in the dashboard worktree**

```bash
cd /Users/jasondijols/Documents/Code-Projects/colign-worktrees/design-dashboard && /Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/boot-stack.sh
```

Expected: log messages indicating backend (8080), remote (5174), host (4173), css watcher all up. Takes 30-60 seconds.

- [ ] **Step 2: Smoke screenshot via the helper**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && node tools/design-loop/screenshot.mjs --url http://localhost:4173/dashboard --width 1440 --height 900 --out tmp/design-loop/dry-run/dashboard-desktop.png --persona ada@st6.dev --role MANAGER
```

Expected: `Screenshot saved`. Open the file and verify it's the Dashboard page (NOT the login screen).

- [ ] **Step 3: Run Cypress responsive specs against the dashboard worktree**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && scripts/audit-teardown.sh flip && trap 'scripts/audit-teardown.sh restore' EXIT INT TERM && cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 ./node_modules/.bin/cypress run --browser chrome --e2e --spec 'cypress/e2e/responsive-*.cy.ts'
```

Expected: both specs pass.

- [ ] **Step 4: Tear down the dry-run stack**

```bash
cd /Users/jasondijols/Documents/Code-Projects/colign-worktrees/design-dashboard && /Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/teardown-stack.sh
```

Expected: kill messages for backend, remote, host, css, and env restore.

- [ ] **Step 5: Verify no orphaned processes**

```bash
lsof -i :8080 -i :5174 -i :4173 2>/dev/null
```

Expected: no output (all ports free).

- [ ] **Step 6: Document the dry-run in the spec**

If anything failed, capture it in the spec as an Open Question / Risk. If it all passed, no edit needed.

---

## Task 11: Kick off the overnight loop

**Files:** none (orchestration only)

> **DO THIS LAST, JUST BEFORE BED.** The loop runs for 6–12 hours.

- [ ] **Step 1: Final pre-flight checklist**

Confirm aloud:

- [ ] `docs/superpowers/design/DESIGN.md` exists and is committed
- [ ] `tools/design-loop/` is committed to main
- [ ] All 7 worktrees exist (`git worktree list`)
- [ ] No design loop processes are currently running (`lsof -i :8080 -i :5174 -i :4173` empty)
- [ ] `gh auth status` shows logged in
- [ ] Disk has at least 5 GB free (`df -h .`) — screenshots accumulate
- [ ] Laptop on AC power, sleep disabled (`caffeinate -di &` if needed)

- [ ] **Step 2: Read the workflow script content to pass inline**

The Workflow tool requires `script` (inline) or `scriptPath`. Use `scriptPath`:

```
Workflow({ scriptPath: '/Users/jasondijols/Documents/Code-Projects/Colign/tools/design-loop/workflow.js' })
```

(The runtime persists scripts to a session directory. We pass the canonical path so iteration is easy.)

- [ ] **Step 3: Watch the first 5–10 minutes**

The pre-flight phase + foundation phase start. If anything fails immediately (DESIGN.md unreadable, foundation agent confused), TaskStop and fix before going to sleep.

Successful early signs:
- "DESIGN.md loaded (N chars)" log line
- Foundation agent reports its planned token diff in its working messages
- Backend + remote + host boot in the foundation worktree
- Foundation agent's first commit appears

- [ ] **Step 4: Sleep**

The workflow will keep running. Notifications (PushNotification) will fire when it completes or hits a fatal error.

- [ ] **Step 5: NO COMMIT for this task** (it's a runtime invocation, not code)

---

## Task 12: Morning triage + handoff doc

**Files:**
- Create: `docs/handoffs/2026-06-03-overnight-design-loop.md`

> Run this on the morning of 2026-06-03 (or whenever the user wakes up after the run).

- [ ] **Step 1: List PRs the loop opened**

```bash
gh pr list --label design-polish --json number,title,headRefName,state,createdAt
gh pr list --label design-polish-attempted --json number,title,headRefName,state,createdAt
```

Expected: ~7 PRs (1 foundation + 6 surfaces, some may be `attempted`).

- [ ] **Step 2: Review each PR in order**

Recommended order (foundation first because surface PRs build on its branch):

1. Foundation PR — review token diff, refactored components, Cypress result. Merge if good.
2. Per-surface PRs — review before/after screenshots, cycle log. For each: merge, kill, or comment "iterate" for the next overnight run.

For each merge, also delete the local branch + worktree:

```bash
gh pr merge <N> --squash --delete-branch
cd /Users/jasondijols/Documents/Code-Projects/Colign && git worktree remove ../colign-worktrees/design-<slug>
```

For each kill:

```bash
gh pr close <N> --delete-branch
cd /Users/jasondijols/Documents/Code-Projects/Colign && git worktree remove ../colign-worktrees/design-<slug> --force
```

- [ ] **Step 3: Write the handoff doc**

Create `docs/handoffs/2026-06-03-overnight-design-loop.md` following the project convention. Frontmatter format from existing handoffs:

```markdown
---
date: 2026-06-03
branch: main
focus: Overnight design loop — first run
status: <complete | partial>
remotes: [origin, gauntlet]
companion: docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md
---

# Overnight design loop — first run results

## What ran
Workflow `colign-design-loop` (commit <SHA>, invoked <TIME>).
Total runtime: <HH:MM>. Total token spend: $<X>.

## What landed
- Foundation PR #<N>: <merged|killed|open> — <one-line summary>
- Weekly plan PR #<N>: ...
- Dashboard PR #<N>: ...
- Goals PR #<N>: ...
- Commits PR #<N>: ...
- Reconcile PR #<N>: ...
- Manager PR #<N>: ...

## What worked
- ...

## What didn't
- ...

## Surprises
- ...

## Follow-ups
- ...

## Memory updates to make
- ...
```

- [ ] **Step 4: Commit the handoff**

```bash
cd /Users/jasondijols/Documents/Code-Projects/Colign && git add docs/handoffs/2026-06-03-overnight-design-loop.md && git commit -m "$(cat <<'EOF'
docs(handoff): overnight design loop — first run

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push**

```bash
git -C /Users/jasondijols/Documents/Code-Projects/Colign push origin main
```

- [ ] **Step 6: Update memory if any non-obvious learnings**

If anything surprised you (a gotcha not in the runbook, a pattern that worked unusually well), invoke the auto-memory system to capture it.

---

## Done.

After Task 12, the overnight loop's first run is complete and documented. Re-runs are simpler — the harness exists; you just need a fresh `DESIGN.md` revision (or re-use the same one) and a fresh round of worktrees.
