// =====================================================================
// tools/design-loop/workflow.js
//
// Workflow script for the Colign overnight design loop.
//
// Spec: docs/superpowers/specs/2026-06-02-overnight-design-loop-design.md
// Plan: docs/superpowers/plans/2026-06-02-overnight-design-loop.md
//
// IMPORTANT: Workflow scripts cannot use fs/process/Date.now/Math.random.
// Config is inlined as a literal — keep in sync with config.json.
// =====================================================================

export const meta = {
  name: "colign-design-loop",
  description:
    "Foundation token+component pass + sequential per-surface polish via critic/designer/verifier cycles",
  phases: [
    { title: "Pre-flight" },
    { title: "Foundation" },
    { title: "Per-surface polish" },
    { title: "Wrap-up" },
  ],
};

// === Config (mirror of tools/design-loop/config.json) ================

const SURFACES = [
  // Per-surface persona. IC nav (Ada) → Dashboard/Goals/Commits/Plan/Reconcile.
  // Manager nav (Sam) → Plan/Reconcile/Team only. Pick the persona who actually
  // navigates to each surface AND has data; IC surfaces are blank for managers.
  { slug: "weekly-plan", route: "/",          page_file: "apps/colign-frontend/src/pages/WeeklyPlanPage.tsx",         label: "Weekly plan (landing)",  persona_email: "ada@st6.dev",     persona_role: "IC"      },
  { slug: "dashboard",   route: "/dashboard", page_file: "apps/colign-frontend/src/pages/DashboardPage.tsx",          label: "Dashboard",              persona_email: "ada@st6.dev",     persona_role: "IC"      },
  { slug: "goals",       route: "/goals",     page_file: "apps/colign-frontend/src/pages/GoalsPage.tsx",              label: "Goals",                  persona_email: "ada@st6.dev",     persona_role: "IC"      },
  { slug: "commits",     route: "/commits",   page_file: "apps/colign-frontend/src/pages/CommitsPage.tsx",            label: "Commits",                persona_email: "ada@st6.dev",     persona_role: "IC"      },
  { slug: "reconcile",   route: "/reconcile", page_file: "apps/colign-frontend/src/pages/ReconcilePage.tsx",          label: "Reconcile",              persona_email: "ada@st6.dev",     persona_role: "IC"      },
  { slug: "manager",     route: "/manager",   page_file: "apps/colign-frontend/src/pages/ManagerDashboardPage.tsx",   label: "Manager dashboard",      persona_email: "manager@st6.dev", persona_role: "MANAGER" },
];

// Sam Manager — sees /manager rollup (rich) AND has access to every IC surface.
// Some IC surfaces show empty state because DemoDataInitializer seeds plans for
// Ada/Ben/Chris, not Sam. The loop polishes both populated and empty states.
// Default persona used by Foundation phase (which doesn't care about role-gated
// surfaces — it edits shared components). Per-surface personas live on each
// SURFACE entry above.
const FOUNDATION_PERSONA_EMAIL = "ada@st6.dev";
const FOUNDATION_PERSONA_ROLE = "IC";
const MAX_CYCLES = 5;
const FAILURE_BUDGET = 2;
const HOST_BASE = "http://localhost:4173";
const WORKTREE_ROOT = "../colign-worktrees";
const REPO_ROOT = "/Users/jasondijols/Documents/Code-Projects/Colign";

// === Schemas for agent structured output =============================

const CRITIQUE_SCHEMA = {
  type: "object",
  required: ["issues", "overall_assessment"],
  properties: {
    overall_assessment: {
      type: "string",
      description: "One paragraph holistic read of the surface vs DESIGN.md",
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        required: ["severity", "area", "issue", "suggested_direction"],
        properties: {
          severity: { type: "integer", minimum: 1, maximum: 5 },
          area: {
            type: "string",
            enum: ["type", "color", "spacing", "depth", "motion", "hierarchy", "microcopy", "polish"],
          },
          file_hint: { type: "string", description: "Best-guess file to edit; may be empty" },
          issue: { type: "string", description: "Concrete description of what is wrong" },
          suggested_direction: {
            type: "string",
            description: "Direction only (NOT code) — e.g. 'tighten line-height to match DESIGN.md type ramp'",
          },
        },
      },
    },
  },
};

const DESIGNER_SCHEMA = {
  type: "object",
  required: ["addressed_issues", "files_changed", "commit_sha"],
  properties: {
    addressed_issues: {
      type: "array",
      items: { type: "integer" },
      description: "0-based indices into the critic issue list",
    },
    files_changed: { type: "array", items: { type: "string" } },
    commit_sha: { type: "string" },
    summary: { type: "string" },
  },
};

const VERDICT_SCHEMA = {
  type: "object",
  required: ["action", "reasoning", "cypress_passed"],
  properties: {
    action: { type: "string", enum: ["keep_continue", "keep_done", "revert"] },
    cypress_passed: { type: "boolean" },
    reasoning: { type: "string" },
    visual_delta: { type: "string", description: "What changed visually" },
  },
};

const FOUNDATION_SCHEMA = {
  type: "object",
  required: ["pr_url", "files_changed", "cypress_passed"],
  properties: {
    pr_url: { type: "string" },
    files_changed: { type: "array", items: { type: "string" } },
    token_summary: { type: "string" },
    components_refactored: { type: "array", items: { type: "string" } },
    cypress_passed: { type: "boolean" },
  },
};

// =====================================================================
// PHASE: Pre-flight
// =====================================================================

phase("Pre-flight");

const designMd = await agent(
  [
    `Read the file at \`${REPO_ROOT}/docs/superpowers/design/DESIGN.md\`.`,
    `Return its FULL contents verbatim, with NO summarization, NO commentary, NO trimming.`,
    `If the file does not exist, return exactly the literal string \`MISSING_DESIGN_MD\` and nothing else.`,
  ].join(" "),
  { label: "load-design-md" }
);

if (!designMd || designMd.trim() === "MISSING_DESIGN_MD") {
  throw new Error(
    "DESIGN.md must exist at docs/superpowers/design/DESIGN.md before running this loop. Run /design-consultation first."
  );
}

log(`DESIGN.md loaded (${designMd.length} chars)`);

// =====================================================================
// PHASE: Foundation
// =====================================================================

phase("Foundation");

const foundationResult = await agent(
  buildFoundationPrompt(designMd),
  { label: "foundation", schema: FOUNDATION_SCHEMA }
);

if (!foundationResult.cypress_passed) {
  throw new Error(
    `Foundation phase failed Cypress regression gate. PR: ${foundationResult.pr_url || "(not opened)"}. Stopping loop before per-surface phase to avoid building on a broken base.`
  );
}

log(`Foundation PR: ${foundationResult.pr_url}`);
log(`Components refactored: ${foundationResult.components_refactored?.join(", ") || "(none reported)"}`);

// =====================================================================
// PHASE: Per-surface polish (sequential — Vite port + MF URL constraints)
// =====================================================================

phase("Per-surface polish");

const surfaceResults = [];
for (const surface of SURFACES) {
  log(`--- Starting surface: ${surface.label} ---`);
  const result = await runSurfaceLoop(surface, designMd);
  surfaceResults.push(result);
  log(`--- Done with ${surface.slug}: ${result.final_status} after ${result.cycles_used} cycles ---`);
}

log("All surfaces complete. Summary:");
for (const r of surfaceResults) {
  log(`  ${r.surface}: ${r.final_status} → ${r.pr_url || "(no PR)"}`);
}

// =====================================================================
// PHASE: Wrap-up
// =====================================================================

phase("Wrap-up");
log("Loop complete. Triage PRs labeled `design-polish` and `design-polish-attempted`.");

// =====================================================================
// PER-SURFACE INNER LOOP
// =====================================================================

async function runSurfaceLoop(surface, designMd) {
  let consecutiveReverts = 0;
  let lastGoodCycle = 0;
  // Default to 'complete' — surfaces are successful unless the failure budget triggers.
  // Running out of cycles with keep_continue is still success (productive work done).
  let finalStatus = "complete";
  const cycleLog = [];

  // v2 FIX: force teardown + re-boot in THIS worktree before any other agent
  // runs. Previous run had a coordination bug — boot-stack.sh was idempotent
  // and skipped if ports were busy, so surfaces 2+ inherited weekly-plan's
  // running stack and took screenshots/ran Cypress against the wrong worktree.
  await agent(
    buildPreparePrompt(surface),
    { label: `prepare:${surface.slug}:v2` }
  );

  // Take a "before" snapshot (cycle-0) for the PR description
  await agent(
    buildSnapshotPrompt(surface, 0, "before"),
    { label: `snapshot:${surface.slug}:before:v2` }
  );

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    log(`${surface.slug}: cycle ${cycle}/${MAX_CYCLES}`);

    // --- Critic ---
    const critique = await agent(
      buildCriticPrompt(surface, cycle, designMd),
      { label: `critic-v2:${surface.slug}:c${cycle}`, schema: CRITIQUE_SCHEMA }
    );

    // Early-exit: critic finds nothing significant
    const significantIssues = (critique.issues || []).filter((i) => i.severity >= 3);
    if (significantIssues.length === 0) {
      log(`${surface.slug}: critic found no severity≥3 issues at cycle ${cycle} — done`);
      cycleLog.push({ cycle, action: "no-op", critic_summary: critique.overall_assessment });
      break;
    }

    // --- Designer ---
    const designerResult = await agent(
      buildDesignerPrompt(surface, cycle, critique, designMd),
      { label: `designer-v2:${surface.slug}:c${cycle}`, schema: DESIGNER_SCHEMA }
    );

    // --- Verifier ---
    const verdict = await agent(
      buildVerifierPrompt(surface, cycle, critique, designerResult),
      { label: `verifier-v2:${surface.slug}:c${cycle}`, schema: VERDICT_SCHEMA }
    );

    cycleLog.push({
      cycle,
      action: verdict.action,
      designer_commit: designerResult.commit_sha,
      critic_issues_total: critique.issues.length,
      addressed: designerResult.addressed_issues?.length || 0,
      cypress_passed: verdict.cypress_passed,
      visual_delta: verdict.visual_delta,
      reasoning: verdict.reasoning,
    });

    if (verdict.action === "revert") {
      consecutiveReverts++;
      log(`${surface.slug}: cycle ${cycle} reverted (consecutive=${consecutiveReverts}, budget=${FAILURE_BUDGET})`);
      if (consecutiveReverts >= FAILURE_BUDGET) {
        log(`${surface.slug}: failure budget hit — opening attempted PR`);
        finalStatus = "attempted";
        break;
      }
      continue;
    }

    consecutiveReverts = 0;
    lastGoodCycle = cycle;

    if (verdict.action === "keep_done") {
      log(`${surface.slug}: verifier says done at cycle ${cycle}`);
      break;
    }
  }

  // Skip PR if nothing was committed (critic found nothing, or all cycles reverted)
  if (lastGoodCycle === 0) {
    log(`${surface.slug}: no commits landed (lastGoodCycle=0), skipping PR`);
    return {
      surface: surface.slug,
      cycles_used: 0,
      final_status: finalStatus,
      pr_url: null,
      note:
        finalStatus === "attempted"
          ? "All cycles reverted before any change held — surface needs human eye"
          : "Critic found no significant issues — surface already meets DESIGN.md",
    };
  }

  // Take an "after" snapshot using lastGoodCycle
  await agent(
    buildSnapshotPrompt(surface, lastGoodCycle, "after"),
    { label: `snapshot:${surface.slug}:after:v2` }
  );

  // Open the PR
  const prResult = await agent(
    buildPrPrompt(surface, lastGoodCycle, finalStatus, cycleLog),
    { label: `open-pr-v2:${surface.slug}` }
  );

  return {
    surface: surface.slug,
    cycles_used: lastGoodCycle,
    final_status: finalStatus,
    pr_url: extractUrl(prResult),
  };
}

function extractUrl(text) {
  const m = String(text).match(/https?:\/\/github\.com\/[^\s)]+/);
  return m ? m[0] : null;
}

// =====================================================================
// PROMPT BUILDERS
// =====================================================================

function buildFoundationPrompt(designMd) {
  return [
    "# Foundation Agent — Tokens + Shared Components",
    "",
    "## Your role",
    "You are the foundation agent for the Colign design loop. Your job is to translate DESIGN.md into concrete Tailwind tokens and refactor 5 shared components, then open a PR.",
    "",
    "## Environment",
    `- Repo root: \`${REPO_ROOT}\``,
    `- Worktree: \`${WORKTREE_ROOT}/design-foundation\` — already created and branched (\`design/foundation\`)`,
    `- Stack: from the worktree root, run \`${REPO_ROOT}/tools/design-loop/boot-stack.sh\` (idempotent — boots backend in mock auth, remote :5174, host :4173, Tailwind watcher)`,
    `- Mock auth as \`${FOUNDATION_PERSONA_EMAIL}\` ${FOUNDATION_PERSONA_ROLE}`,
    `- Cypress reporter symlinks: the boot script handles this (gotcha: yarn workspaces hoist reporters to root, Cypress doesn't walk up)`,
    "",
    "## DESIGN.md (the taste anchor — every change should be traceable to a line in this doc)",
    "```markdown",
    designMd,
    "```",
    "",
    "## What you must do",
    "",
    "1. `cd` into the foundation worktree.",
    `2. Boot the stack: \`${REPO_ROOT}/tools/design-loop/boot-stack.sh\`. Verify all 3 services come up (backend :8080, remote :5174, host :4173).`,
    "3. Read the current `apps/colign-frontend/tailwind.config.js` so you understand existing tokens (Geist font, colignAccent colors, fluid type scale, section-fluid spacing).",
    "4. Read `apps/colign-frontend/src/responsive.css` so you understand existing motion/depth/responsive primitives. (See `[[colign-responsive-contract]]` — the 320→1440 contract.)",
    "5. Propose a Tailwind token diff that **EXTENDS, never replaces** existing tokens. Cover:",
    "   - Color palette (semantic names: surface, fg, accent, muted, info, success, warning, danger — supplement existing colignAccent, do NOT remove)",
    "   - Type ramp refinement (fluid scale already exists; refine if DESIGN.md calls for it)",
    "   - Spacing scale additions",
    "   - Shadows / depth primitives (most likely needed — DESIGN.md will call for layered depth vs current flat)",
    "   - Motion primitives (durations, easings, named transitions)",
    "6. Apply the diff to `apps/colign-frontend/tailwind.config.js`.",
    "7. Update `apps/colign-frontend/src/responsive.css` with motion + depth utilities matching DESIGN.md (additive — don't break existing touch-policy CSS).",
    "8. Refactor these 5 shared components to use the new tokens (verified to exist in repo):",
    "   - `apps/colign-frontend/src/components/AppShell.tsx` (top-level layout — touches every page)",
    "   - `apps/colign-frontend/src/components/SidebarShell.tsx` (sidebar layout)",
    "   - `apps/colign-frontend/src/components/NavRail.tsx` (primary navigation)",
    "   - `apps/colign-frontend/src/components/IcDrillDrawer.tsx` (drawer / drill-down pattern)",
    "   - `apps/colign-frontend/src/components/ConfirmDialog.tsx` (modal dialog pattern)",
    "   The app uses `flowbite-react`'s Button directly (no local `Button.tsx`). Address button styling via Tailwind theme + the `flowbite` plugin config instead of trying to refactor a non-existent component.",
    "9. **After every Write/Edit to a `.ts/.tsx/.css/.js` file, grep-verify the change persisted on disk** (runbook gotcha #1 — HMR can cause silent no-op writes):",
    "   ```",
    "   grep -cF '<a unique snippet of what you just wrote>' <file>   # expected: ≥1",
    "   ```",
    "10. After all Tailwind class additions, run `yarn build:css` from `apps/colign-frontend/` ONCE to compile the new classes (the watcher is running but a one-shot build guarantees a clean compile):",
    "    ```",
    "    cd apps/colign-frontend && yarn build:css",
    "    ```",
    "11. Run Cypress responsive specs (HARD GATE):",
    "    ```",
    `    cd ${REPO_ROOT} && scripts/audit-teardown.sh flip && trap "scripts/audit-teardown.sh restore" EXIT INT TERM && cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 ./node_modules/.bin/cypress run --browser chrome --e2e --spec 'cypress/e2e/responsive-*.cy.ts'`,
    "    ```",
    "    **MUST PASS 6/6.** If any spec fails, this is a regression caused by your edits.",
    "    - First try: identify the failing assertion (overflow, touch target, etc.) and patch the cause in your edits.",
    "    - If you can't fix it: revert all edits with `git reset --hard origin/main` and return `cypress_passed: false`.",
    "12. Take before/after screenshots of 3 representative surfaces (Dashboard, Goals, Commits) at both viewports:",
    "    ```",
    `    node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}/<route> --width <w> --height <h> --out tmp/design-loop/foundation/<surface>-<vp>.png --persona ${FOUNDATION_PERSONA_EMAIL} --role ${FOUNDATION_PERSONA_ROLE}`,
    "    ```",
    "    For \"before\", you'll need to checkout main first, screenshot, then come back to your branch. Use:",
    "    ```",
    "    git stash && git checkout main && node <screenshot...> && git checkout - && git stash pop",
    "    ```",
    "13. Commit changes in granular logical commits using conventional format:",
    "    `git commit -m \"design(foundation): <what> — <why>\"`",
    "14. Push the branch and open a PR via `gh pr create`:",
    "    - Title: `Design foundation — tokens + shared components`",
    "    - Body: include",
    "      - Frontmatter block:",
    "        ```",
    "        ---",
    "        phase: foundation",
    "        cypress_status: pass",
    "        files_changed_count: <N>",
    "        ---",
    "        ```",
    "      - Token diff summary (1 paragraph per category)",
    "      - List of refactored components",
    "      - Before/after screenshot grid (markdown image links). Commit screenshots to `docs/design-screenshots/foundation/` so the markdown can reference them.",
    "    - Label: `design-polish`",
    "",
    "## Hard constraints",
    "- NO commits to `main`. Work only in `design/foundation`.",
    "- NO new npm dependencies without explicit token-diff justification.",
    "- NO removal of existing tokens. EXTEND only.",
    "- NO removal of existing UI elements. Visual polish only.",
    "- Cypress responsive specs are a hard gate. Fail = revert + report.",
    "- After EVERY Write/Edit on a frontend file, grep-verify on disk.",
    "- If the dev server dies mid-task, restart via `boot-stack.sh` and continue.",
    "",
    "## Return value (StructuredOutput)",
    "- `pr_url`: PR URL from `gh pr create`",
    "- `files_changed`: list of relative paths",
    "- `token_summary`: 1-paragraph summary of changes",
    "- `components_refactored`: list of component names you actually touched",
    "- `cypress_passed`: boolean",
  ].join("\n");
}

function buildPreparePrompt(surface) {
  return [
    `# Prepare Stack — ${surface.label}`,
    "",
    "## Your role",
    "Make absolutely sure the dev stack on :8080 / :5174 / :4173 is bound to THIS surface's worktree, not someone else's. This is the v2 harness fix — the first run had a coordination bug where surfaces 2+ inherited the previous worktree's running stack.",
    "",
    "## Environment",
    `- Repo root: \`${REPO_ROOT}\``,
    `- Worktree (mine): \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Expected vite cwd on :5174: \`${WORKTREE_ROOT}/design-${surface.slug}/apps/colign-frontend\``,
    `- Expected vite cwd on :4173: \`${WORKTREE_ROOT}/design-${surface.slug}/apps/pa-host\``,
    "",
    "## Actions",
    "1. `cd` into the worktree.",
    "2. Check whether vite on :5174 is bound to THIS worktree. Run:",
    "   ```",
    "   vite_pid=$(lsof -ti:5174 | head -1)",
    "   if [ -n \"$vite_pid\" ]; then",
    "     vite_cwd=$(lsof -p $vite_pid 2>/dev/null | awk '$4==\"cwd\" {print $NF}')",
    "     echo \"vite on :5174 cwd=$vite_cwd\"",
    "   else",
    "     echo \"vite on :5174 not running\"",
    "   fi",
    "   ```",
    `3. If the cwd does NOT match \`${WORKTREE_ROOT}/design-${surface.slug}/apps/colign-frontend\` (resolved via realpath if needed), or if the stack is down, force a clean reboot:`,
    "   a. From ANY worktree, run teardown to free the ports — pick the worktree the stack is currently bound to so its `.design-loop-pids` and `.env.local.bak` get cleaned up too:",
    `      \`cd <bound-worktree> && ${REPO_ROOT}/tools/design-loop/teardown-stack.sh\``,
    `      If you can't tell, run \`${REPO_ROOT}/tools/design-loop/teardown-stack.sh\` from THIS worktree — it has a belt-and-suspenders \`lsof\`-based kill that handles orphans on the ports.`,
    "   b. Wait 2 seconds for ports to settle.",
    "   c. Verify all 3 ports are free: `lsof -ti:8080 -i:5174 -i:4173` should return empty.",
    `   d. Boot from THIS worktree: \`cd ${WORKTREE_ROOT}/design-${surface.slug} && ${REPO_ROOT}/tools/design-loop/boot-stack.sh\``,
    "   e. Wait for the boot script to report `[boot] stack ready`.",
    "4. Re-verify vite cwd on :5174 matches THIS worktree. If it still doesn't match, STOP and emit an error message instead of proceeding (downstream agents would produce hollow verification).",
    "5. Quick sanity probes (all must return 200/302/401):",
    "   ```",
    "   curl -s -o /dev/null -w 'host:%{http_code}\\n' http://localhost:4173/",
    "   curl -s -o /dev/null -w 'remote:%{http_code}\\n' http://localhost:5174/remoteEntry.js",
    "   curl -s -o /dev/null -w 'backend:%{http_code}\\n' http://localhost:8080/actuator/health",
    "   ```",
    "",
    "## Return value",
    "Return a brief message: which path was taken (no-op / rebooted), final vite cwd on :5174, and the 3 HTTP codes from step 5. If you had to STOP in step 4, return the error message instead.",
  ].join("\n");
}

function buildSnapshotPrompt(surface, cycle, label) {
  const personaRole = surface.persona_role;
  const personaEmail = surface.persona_email;
  return [
    `# Snapshot — ${surface.label} (${label})`,
    "",
    "## Your role",
    `Take screenshots of ${surface.label} for the loop's record.`,
    "",
    "## Environment",
    `- Repo root: \`${REPO_ROOT}\``,
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Stack: run \`${REPO_ROOT}/tools/design-loop/boot-stack.sh\` if not already up`,
    "",
    "## Actions",
    "1. `cd` into the worktree. Ensure stack is booted (idempotent — safe to run boot-stack.sh).",
    "2. Take screenshots at mobile (375×667) and desktop (1440×900):",
    "   ```",
    `   node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 375 --height 667 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-${label}/mobile.png --persona ${personaEmail} --role ${personaRole}`,
    `   node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 1440 --height 900 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-${label}/desktop.png --persona ${personaEmail} --role ${personaRole}`,
    "   ```",
    "3. Verify both files exist with non-zero size:",
    `   \`ls -l tmp/design-loop/${surface.slug}/cycle-${cycle}-${label}/\``,
    "4. Return the two file paths as a brief message — that's all.",
  ].join("\n");
}

function buildCriticPrompt(surface, cycle, designMd) {
  const personaRole = surface.persona_role;
  const personaEmail = surface.persona_email;
  return [
    `# Critic Agent — ${surface.label} cycle ${cycle}`,
    "",
    "## Your role",
    "You are an outside designer reviewing a screenshot. You can READ files but CANNOT edit code. Your job is to identify what's off about the current state of this surface vs DESIGN.md.",
    "",
    "## Environment",
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- URL: ${HOST_BASE}${surface.route}`,
    `- Mock auth: ${personaEmail} (${personaRole})`,
    "",
    "## DESIGN.md (the taste anchor — be specific to its vocabulary, not generic design jargon)",
    "```markdown",
    designMd,
    "```",
    "",
    "## Actions",
    "1. `cd` into the worktree. Ensure stack booted.",
    "2. Take fresh screenshots at both viewports:",
    "   ```",
    `   node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 375 --height 667 --out tmp/design-loop/${surface.slug}/cycle-${cycle}/mobile.png --persona ${personaEmail} --role ${personaRole}`,
    `   node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 1440 --height 900 --out tmp/design-loop/${surface.slug}/cycle-${cycle}/desktop.png --persona ${personaEmail} --role ${personaRole}`,
    "   ```",
    "3. Read both PNGs (Claude Code's Read tool can view images).",
    "4. Compare what you see to the principles in DESIGN.md — be specific to its vocabulary.",
    "5. Emit a structured issue list via StructuredOutput. Use the schema:",
    "   - severity 1–5 (5 = visually broken / hurts comprehension; 1 = nitpick)",
    "   - area: type | color | spacing | depth | motion | hierarchy | microcopy | polish",
    `   - file_hint: best-guess file (\`${surface.page_file}\` or components imported by it)`,
    "   - issue: concrete description",
    '   - suggested_direction: NOT code — direction only (e.g. "increase letter-spacing on H1 to match DESIGN.md type ramp")',
    "",
    "## Hard constraints",
    "- DO NOT propose code. Direction only.",
    "- DO NOT edit any files.",
    "- Skip severity-1 issues if cycle > 3 (they're nitpicks; cycle budget is finite).",
    "- Be specific to DESIGN.md's actual vocabulary. If DESIGN.md says \"soft shadows\" don't generically recommend \"drop shadow\".",
  ].join("\n");
}

function buildDesignerPrompt(surface, cycle, critique, designMd) {
  return [
    `# Designer Agent — ${surface.label} cycle ${cycle}`,
    "",
    "## Your role",
    `Implement design improvements for ${surface.label}. Pick the top 2-3 critic issues, make specific changes, commit.`,
    "",
    "## Environment",
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Surface file: \`${surface.page_file}\``,
    "- Files in scope: surface page + components imported transitively by it",
    "- Files OUT of scope: shared components (AppShell, SidebarShell, NavRail, IcDrillDrawer, ConfirmDialog) and Tailwind config — foundation phase owns those",
    "",
    "## DESIGN.md",
    "```markdown",
    designMd,
    "```",
    "",
    "## Critic issues from this cycle",
    "```json",
    JSON.stringify(critique.issues, null, 2),
    "```",
    "",
    "## Critic overall assessment",
    critique.overall_assessment || "(none)",
    "",
    "## Actions",
    "1. `cd` into the worktree.",
    "2. Pick the top 2-3 highest-severity issues that are addressable in this cycle.",
    "3. For each picked issue:",
    "   - Propose a specific code change (1-2 sentences, internal — no need to output unless asked)",
    "   - Edit the file using the Edit tool",
    "   - **AFTER the edit, grep-verify the change persisted on disk** (runbook gotcha #1 — HMR no-op):",
    "     ```",
    "     grep -cF '<a unique snippet of what you just wrote>' <file>   # expected: ≥1",
    "     ```",
    "4. If you added new Tailwind utility classes, run `yarn build:css` from `apps/colign-frontend/` to rebuild the compiled CSS (runbook gotcha #7).",
    "5. Commit:",
    "   ```",
    "   git add <changed files>",
    `   git commit -m "design(${surface.slug}): cycle ${cycle} — <summary>"`,
    "   ```",
    "6. Capture the commit SHA: `git rev-parse HEAD`",
    "",
    "## Return value (StructuredOutput)",
    "- addressed_issues: list of 0-based indices into the critic issue array",
    "- files_changed: list of relative paths you edited",
    "- commit_sha: the SHA from step 6",
    "- summary: 1-sentence description of what changed",
    "",
    "## Hard constraints",
    "- NO edits to shared components (AppShell, SidebarShell, NavRail, IcDrillDrawer, ConfirmDialog) or Tailwind config. If an issue truly requires one, NOTE IT in the commit message body and skip that issue.",
    "- NO new dependencies.",
    "- NO new files unless DESIGN.md calls for a new UI pattern (rare — most polish is in-place).",
    "- NO functional changes (no new features, no renamed concepts, no removed UI elements). Visual polish only.",
    "- After EVERY Write/Edit, grep-verify.",
  ].join("\n");
}

function buildVerifierPrompt(surface, cycle, critique, designerResult) {
  const personaRole = surface.persona_role;
  const personaEmail = surface.persona_email;
  return [
    `# Verifier Agent — ${surface.label} cycle ${cycle}`,
    "",
    "## Your role",
    "Judge whether this cycle improved the surface. Revert on regression. Run the hard regression gate (Cypress responsive specs).",
    "",
    "## Environment",
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Designer's commit: \`${designerResult.commit_sha}\``,
    `- Previous cycle screenshots: \`tmp/design-loop/${surface.slug}/cycle-${cycle - 1}/\` (or \`cycle-0-before/\` if first cycle)`,
    "- New screenshots: take fresh ones with the snapshot pattern below",
    "",
    "## Critic original issues",
    "```json",
    JSON.stringify(critique.issues, null, 2),
    "```",
    "",
    "## Designer claimed addressed (indices)",
    JSON.stringify(designerResult.addressed_issues || []),
    "",
    "## Actions",
    "1. `cd` into the worktree.",
    "2. Take post-cycle screenshots:",
    "   ```",
    `   node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 375 --height 667 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-post/mobile.png --persona ${personaEmail} --role ${personaRole}`,
    `   node ${REPO_ROOT}/tools/design-loop/screenshot.mjs --url ${HOST_BASE}${surface.route} --width 1440 --height 900 --out tmp/design-loop/${surface.slug}/cycle-${cycle}-post/desktop.png --persona ${personaEmail} --role ${personaRole}`,
    "   ```",
    "3. Run Cypress responsive specs (HARD GATE):",
    "   ```",
    `   cd ${REPO_ROOT} && scripts/audit-teardown.sh flip && trap "scripts/audit-teardown.sh restore" EXIT INT TERM && cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 ./node_modules/.bin/cypress run --browser chrome --e2e --spec 'cypress/e2e/responsive-*.cy.ts'`,
    "   ```",
    "4. If Cypress FAILS: revert and return `action: \"revert\"`, `cypress_passed: false`:",
    "   ```",
    "   git reset --hard HEAD~1",
    "   ```",
    "5. If Cypress passes: Read both new screenshots (Read tool views images). Compare to previous cycle screenshots. Judge:",
    "   - Is the new state visually better than the previous cycle?",
    "   - Did the designer's changes actually address the claimed issues?",
    "   - Are there any new regressions (text clipped, elements misaligned, color contrast lost)?",
    "6. Emit verdict:",
    "   - **keep_done**: this cycle's changes are good AND remaining issues are nitpicks (or no significant issues left)",
    "   - **keep_continue**: this cycle's changes are good AND there are more significant issues worth another cycle",
    "   - **revert**: this cycle made the surface worse, or didn't actually address the claimed issues. Run `git reset --hard HEAD~1`.",
    "",
    "## Return value (StructuredOutput)",
    "- action: keep_continue | keep_done | revert",
    "- cypress_passed: boolean",
    "- reasoning: 1-2 sentences why",
    "- visual_delta: brief description of what changed visually",
    "",
    "## Hard constraints",
    "- Cypress failure = automatic revert. No exceptions.",
    "- Bias toward \"revert\" if uncertain. Better to lose a cycle than ship slop.",
    "- \"keep_done\" preferred over \"keep_continue\" when remaining issues are minor — cycle budget is finite.",
  ].join("\n");
}

function buildPrPrompt(surface, lastGoodCycle, finalStatus, cycleLog) {
  const cycleLogJson = JSON.stringify(cycleLog, null, 2);
  const labelSuffix = finalStatus === "attempted" ? "-attempted" : "";
  const titleSuffix = finalStatus === "attempted" ? " — attempted, needs human eye" : "";
  return [
    `# Open PR — ${surface.label}`,
    "",
    "## Your role",
    `Open a pull request for the ${surface.label} surface with full before/after context.`,
    "",
    "## Environment",
    `- Worktree: \`${WORKTREE_ROOT}/design-${surface.slug}\``,
    `- Branch: \`design/${surface.slug}\``,
    `- Last good cycle: ${lastGoodCycle}`,
    `- Final status: ${finalStatus}`,
    "",
    "## Cycle log",
    "```json",
    cycleLogJson,
    "```",
    "",
    "## Actions",
    "1. `cd` into the worktree.",
    "2. Make sure the working tree is clean (no uncommitted changes left from a verifier revert): `git status` should show nothing.",
    "3. Copy screenshots into the repo so the PR body can reference them:",
    `   - Source: \`tmp/design-loop/${surface.slug}/cycle-0-before/\` AND \`tmp/design-loop/${surface.slug}/cycle-${lastGoodCycle}-after/\``,
    `   - Destination: \`docs/design-screenshots/${surface.slug}/cycle-0-before/\` AND \`docs/design-screenshots/${surface.slug}/cycle-${lastGoodCycle}-after/\``,
    "   - Commit the screenshots with message `chore(screenshots): " + surface.slug + " before/after`",
    "4. Push the branch:",
    `   \`git push -u origin design/${surface.slug}\``,
    "5. Open the PR. Substitute `<CYCLELOG>` below with the cycle log JSON from above before running:",
    "   ```",
    `   gh pr create --title "design(${surface.slug}): visual polish${titleSuffix}" --label "design-polish${labelSuffix}" --body "$(cat <<'EOF'`,
    "---",
    `surface: ${surface.slug}`,
    `cycles: ${lastGoodCycle}`,
    `final_status: ${finalStatus}`,
    "---",
    "",
    "## Before / After",
    "",
    "### Mobile (375×667)",
    "| Before | After |",
    "|---|---|",
    `| ![before](docs/design-screenshots/${surface.slug}/cycle-0-before/mobile.png) | ![after](docs/design-screenshots/${surface.slug}/cycle-${lastGoodCycle}-after/mobile.png) |`,
    "",
    "### Desktop (1440×900)",
    "| Before | After |",
    "|---|---|",
    `| ![before](docs/design-screenshots/${surface.slug}/cycle-0-before/desktop.png) | ![after](docs/design-screenshots/${surface.slug}/cycle-${lastGoodCycle}-after/desktop.png) |`,
    "",
    "## Cycle log",
    "",
    "```json",
    "<CYCLELOG>",
    "```",
    "EOF",
    "   )\"",
    "   ```",
    "6. After `gh pr create` succeeds, print the PR URL on its own line so the workflow can extract it.",
    "",
    "## Hard constraints",
    "- DO NOT merge the PR. Human triage only.",
    "- If `gh pr create` fails (e.g., empty diff because everything reverted), open a GitHub Issue instead summarizing what was tried.",
  ].join("\n");
}
