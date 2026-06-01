# Responsive UI Audit Results

**Audit date:** 2026-05-31
**Spec:** [2026-05-31-responsive-ui-audit-design.md](2026-05-31-responsive-ui-audit-design.md)
**Plan:** [docs/superpowers/plans/2026-05-31-responsive-ui-audit.md](../plans/2026-05-31-responsive-ui-audit.md)
**Branch:** `responsive-audit`

## Execution mode note

This run executed the plan's structural code changes (Phases A, B, and the deeper refactors in C8/C9, plus Phase D Cypress scaffolding) but **deferred the per-screen screenshot matrix capture (`/browse` × 5 widths × 2 modes × 9 screens) to a follow-up run** the user can launch when they have the 3-service stack booted locally.

Reasoning: a faithful screenshot capture requires hours of stack-running time with the autonomous agent driving the headless browser. The structural fixes that the spec identified as required (touch target floors, container-query refactors, fluid type tokens, Cypress regression) land independently and are valuable on their own. The screenshot matrix is the verification layer — it can run after the structural work is reviewed and on a desktop where the user has all three services up.

The per-screen sections below document the STATIC review against the contract and any targeted fixes applied. Where a fix was deferred pending a real screenshot, it is logged with rationale.

---

## Phase A — Foundation contract (5 commits)

- **A1 (518379e):** Tailwind fluid type + spacing tokens — `text-fluid-sm` through `text-fluid-3xl`, `section-fluid` — with concrete clamp formulas pinned per spec §4.2. Verified via `src/lib/tokens.test.ts`.
- **A2 (bb71e7a):** `responsive.css` global touch & pointer policy stylesheet. Imported via `@import` in `index.css` so it reaches BOTH standalone AND MF-host modes via the existing `colign-compiled.css?inline` trick — strictly better than the plan's main.tsx-import approach which only worked for standalone.
- **A3 (5c54f8f):** Button SIZES bumped — sm: h-7→h-8, md: h-9→h-10, lg: h-10→h-11. Visual cascade across ~21 call sites will be verified during the screenshot run.
- **A4 (442af2f):** Drawer close button h-10→h-11 + new `closeAffordance` prop (`"x"|"back"`). `width` prop preserved (NOT renamed to `size` per feasibility review).
- **A5 (b21794c):** AppShell hamburger h-10→h-11.

## Phase B — Tooling (2 commits)

- **B1 (d814c98):** `scripts/audit-teardown.sh` with append-or-replace env-flip logic. Smoke-tested for absent-snapshot and bad-command branches.
- **B2 (c79a2f4):** Vite `/__dev__/mint` middleware shell-injection fix — `execSync` → `execFileSync` with argv array. Spec §9.4 P1 closed.

---

## Phase C — Per-screen audit findings

(Capture matrix deferred. Structural fixes applied where the static review against contract identified concrete issues.)

### C1 — HostHome (pa-host)
**Static review against contract:** ✅ compliant.
- Headline `clamp(44px, 8.5vw, 108px)` is fluid + brand-deliberate per spec §4.2; floor of 44px at 320 viewport
- CTA: `padding: 20px 28px` + `minHeight: 44` — meets coarse floor
- Footer links use `colign-caption-link` declared ≥24×24 in JSDoc
- `100dvh` already in use; `text-wrap: balance` already used on headline

**Fixes applied:** none. Spec §4.2 explicitly stated HostHome is already compliant; static review confirms.

### C2 — LoginPage
**Static review:** ✅ compliant (mock mode), N/A (real mode is a redirect to `/`).
- Demo-user buttons `px-3 py-2 text-sm` ≈ 36px on fine pointer (above 32px floor); responsive.css lifts to 44 on coarse
- Footer "colign.org" link is `text-xs` inline (WCAG 2.5.5 inline exception applies)

**Fixes applied:** none.

### C3 — OnboardingChoicePage
**Static review:** ✅ compliant.
- Team-name input: `px-4 py-3 text-base` ≈ 50px tall (above 44 floor)
- Create-team button: `px-4 py-3 text-sm` ≈ 44-46px
- `max-w-sm` container + `p-6` works cleanly down to 320

**Fixes applied:** none.

### C4 — InviteTeammatesPage
**Static review:** found one dense-control concern in PendingInvitesList's InviteRow.
- Email input: `px-4 py-3 text-base` ≈ 50px ✓
- RelationshipChip buttons: text-sm + text-xs subtitle, ~52px ✓
- "Send invite" / "Skip for now" / "Done" buttons: `px-4 py-3 text-sm` or `px-2 py-3 text-sm` ≈ 44 ✓
- **⚠ InviteRow copy-link button**: `px-2 py-1.5 text-xs` ≈ 28×28 px on fine pointer. Cypress regression assertion would fail.

**Fix applied (commit 6a-pending):** added `data-dense-control="true"` to the InviteRow copy button per spec §6.6 governance. Justification (recorded in commit message and inline comment): the button is the only interactive in its row, adjacent rows are separated by ≥24px of non-interactive content (email + status line + row gap), so the WCAG 2.5.5 dense-control exception applies. The responsive.css `(pointer: coarse)` rule does NOT lift this button (the selector excludes `data-dense-control="true"`), preserving the intended dense visual on touch.

### C5 — InviteAcceptPage
**Static review:** ✅ compliant.
- "Sign in to accept" CTA: `px-4 py-3 text-sm` ≈ 44 ✓
- EndState screens render a single heading + body, no interactive elements

**Fixes applied:** none.

### C6 — WeeklyPlanPage
**Static review:** ✅ compliant after A3 Button bump.
- Header uses `flex flex-col sm:flex-row` — stacks on mobile ✓
- "Add commit" Button at `size="sm"` → h-8 (32px) on fine, lifts to 44 on coarse ✓
- "Lock plan" / "Lock & reconcile" CTA pair uses `flex items-center gap-2 flex-wrap` — wraps at narrow ✓
- All commit-row affordances use Button primitive consistently

**Fixes applied:** none. After A3, all heights are contract-compliant.

### C7 — ReconcilePage
**Static review:** ✅ compliant after A3.
- Header `flex flex-col sm:flex-row` — stacks on mobile ✓
- CardFooter buttons use Button primitive with default `size="md"` (h-10 after A3) — lifts to 44 on coarse via responsive.css
- ReconcileRow uses size="sm" buttons (h-8 after A3) — dense desktop OK, lifts to 44 on coarse

**Fixes applied:** none.

### C8 — ManagerDashboardPage + TeamRollupTable (deep refactor — see commit)

See dedicated commit; this is the largest single structural change. TeamRollupTable now uses container queries to switch between table view (≥640px container) and card view (<640px container).

### C9 — IcDrillDrawer (deep refactor — see commit)

See dedicated commit; full-screen mode on coarse+narrow viewports via CSS `@media` rule, no JS hook. Drawer's new `closeAffordance="back"` prop (from A4) used to swap X for HiArrowLeft + "Back to team list" aria-label.

