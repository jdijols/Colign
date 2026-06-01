# Responsive UI Audit & System — Design Spec

**Date:** 2026-05-31
**Revision:** 2 — incorporates 7-persona doc-review findings
**Status:** Approved (revised) — ready for implementation plan
**Owner:** Jason Dijols
**Scope:** `apps/colign-frontend` + `apps/pa-host` user-facing surfaces

---

## 1. Goal

Establish a responsiveness contract for end-user-facing screens of Colign across **320 px → 1440 px** viewports, verify the current state of 9 screens against that contract, fix issues uncovered, and add a CI regression layer so future PRs can't drift past the contract. Explicit handling of cursor/keyboard ↔ touch input switching is part of the contract.

The phrase "over-index" used in earlier drafts has been softened: this is a focused responsiveness audit with a token contract, not a design-system overhaul. Scope boundaries in §2 enforce that. Strategic and pre-existing concerns surfaced by reviewers are documented in §9 rather than silently expanding scope.

## 2. Non-goals

- The architecture documentation site (`pa-host/src/architecture/*`) — engineering reference only
- Rewriting `flowbite-react` components — explicit user call; we audit and adapt around them
- Automated visual regression infrastructure (Percy / Chromatic) — future project
- Dark-mode **visual polish** (colors, shadows, contrast ratios) is out of scope. Dark-mode **layout bugs** (overflow, clipping, broken structure) ARE in scope, because the screenshot matrix captures both modes and layout is viewport-independent of color scheme
- Core Web Vitals / performance work — use `/benchmark`
- A cross-app design-token bridge (`pa-host/src/tokens.css`) — considered and rejected: only one consumer (HostHome) and HostHome is already compliant via inline `clamp()`. See §4.2 rationale

## 3. Standards we are anchoring on

Multiple authorities converge on the same numerical guidance.

### Touch target sizes

| Source | Minimum | Notes |
|---|---|---|
| WCAG 2.2 AA (2.5.8 Target Size Minimum) | 24×24 CSS px | Inline / spacing / UA exceptions allowed |
| WCAG 2.1 AAA (2.5.5 Target Size Enhanced) | 44×44 CSS px | Stricter, fewer exceptions |
| Apple Human Interface Guidelines | 44×44 pt | iOS / iPadOS minimum |
| Material Design 3 | 48×48 dp | Plus 8 dp spacing between targets |

**Our adopted floor on touch pointers:** primary interactive elements = **44×44 CSS px**. This approximates Apple HIG's 44pt minimum at standard retina DPRs (point↔pixel equivalence depends on DPR; on @2x and @3x retina the relationship holds, on unusual-DPR contexts it shifts). Dense inline controls (sort headers, pagination digits) may be **24×24** if adjacent-target spacing ≥ 24px — see authoritative exception list in §6.6. On cursor (`pointer: fine`) the floor relaxes to **32×32** — sufficient for mouse precision and allows denser desktop layouts.

### Breakpoint conventions

| System | Values (px) |
|---|---|
| Tailwind 3 (in use) | 640 / 768 / 1024 / 1280 / 1536 |
| Material Design 3 window classes | <600 / 600-839 / 840-1199 / 1200+ |
| Bootstrap 5 | 576 / 768 / 992 / 1200 / 1400 |

**Our adopted contract:** Tailwind defaults, unchanged. Tailwind is mobile-first — the unprefixed base targets every width including 320 px, so we DESIGN AT 320 px and use the existing breakpoint prefixes for layout transitions above that. (An earlier draft introduced `xs: 320px` — removed. Tailwind's `xs:` prefix would be min-width 320, semantically identical to base, and confusing to future contributors who would expect it to mean "at narrow widths only".)

### Real-device viewport floor in 2026

- 360 px and 375 px dominate (>50% of mobile traffic combined)
- 320 px is the practical stress test — older budget devices and foldables (inner panel)
- We design AT 320 px so 360 / 375 / 414 / 430 are comfortable by inheritance

### Modern CSS techniques to standardize

- `clamp(min-rem, preferred-vw, max-rem)` for fluid type and spacing — rem in min/max respects user zoom (accessibility-critical)
- `100dvh` instead of `100vh` — already used in `HostHome`; propagate everywhere
- `env(safe-area-inset-bottom)` for floating bottom elements (iPhone)
- `text-wrap: balance` on headlines (already used in `HostHome`)
- `(pointer: coarse)` and `(hover: hover)` media queries — never hide functionality behind hover on touch devices

### Browser support matrix

All techniques used here have wide modern support; no polyfill or JS fallback required, but the floors matter:

| Technique | Floor |
|---|---|
| Container queries (`@container`, `container-type: inline-size`) | Chrome 105 / Safari 16 / Firefox 110 (baseline 2023) |
| `dvh` / `svh` / `lvh` units | Chrome 108 / Safari 15.4 / Firefox 101 (baseline 2022) |
| `env(safe-area-inset-*)` | All current browsers (baseline 2017) |
| `text-wrap: balance` | Chrome 114 / Safari 17.5 / Firefox 121 — newest of the set; acceptable progressive enhancement (degrades to no balancing) |
| `(pointer:)` / `(hover:)` media queries | All current browsers (baseline 2018) |

### Sources

- W3C — [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Apple — [Human Interface Guidelines: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- Tailwind — [Responsive Design](https://tailwindcss.com/docs/responsive-design)
- Smashing Magazine — [Modern Fluid Typography Using CSS Clamp](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/)
- Smashing Magazine — [A Guide To Hover And Pointer Media Queries](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/)
- bram.us — [The Large, Small, and Dynamic Viewports](https://www.bram.us/2021/07/08/the-large-small-and-dynamic-viewports/)

---

## 4. The contract (breakpoints + design tokens + touch policy)

### 4.1 Breakpoint contract

Tailwind defaults are mobile-first. The unprefixed base targets all widths and IS our 320 px floor.

| Breakpoint | Min width | Purpose |
|---|---|---|
| (base — no prefix) | **0 px** | Mobile-first floor — design AT 320 px; rules apply at all widths until overridden |
| `sm` | 640 px | Large phone / small tablet portrait |
| `md` | **768 px** | Tablet / cursor crossover — desktop layout begins |
| `lg` | 1024 px | Small laptop |
| `xl` | 1280 px | Standard laptop |
| `2xl` | 1536 px | Large desktop — above our 1440 target |

Above 1440 px, layouts stay centered with existing `max-w-*` containers — desktop users with ultra-wide monitors get whitespace, not stretched layout. If the manager-on-monitor scenario warrants a wider ceiling, a follow-up audit can extend this.

### 4.2 Design tokens — the numerical contract

**`colign-frontend`** — extend `tailwind.config.js`:

Fluid type scale (`theme.extend.fontSize`). Implementers MUST use these exact `clamp()` values — the slope is computed by linear interpolation between 320 px (min) and 1440 px (max) viewports.

| Token | clamp() | Min @ ≤320 px | Max @ ≥1440 px |
|---|---|---|---|
| `text-fluid-sm` | `clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)` | 13 px | 14 px |
| `text-fluid-base` | `clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)` | 15 px | 16 px |
| `text-fluid-lg` | `clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)` | 17 px | 18 px |
| `text-fluid-xl` | `clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)` | 20 px | 24 px |
| `text-fluid-2xl` | `clamp(1.5rem, 1.36rem + 0.71vw, 2rem)` | 24 px | 32 px |
| `text-fluid-3xl` | `clamp(1.875rem, 1.55rem + 1.61vw, 3rem)` | 30 px | 48 px |

Fluid spacing (`theme.extend.spacing`):

| Token | clamp() | Min @ ≤320 px | Max @ ≥1440 px |
|---|---|---|---|
| `section-fluid` | `clamp(1.5rem, 1.0rem + 2.5vw, 4rem)` | 24 px | 64 px |

A `:root` CSS custom property block in `src/index.css` `@layer base` mirrors these same values so non-Tailwind contexts inside `colign-frontend` can read them (e.g., `var(--text-fluid-base)`).

**`pa-host`** — **no token file added.** HostHome already uses appropriate `clamp()` literals (`clamp(44px, 8.5vw, 108px)` for the headline, etc.) and is the only user-facing pa-host surface. The HostHome CTA button uses `padding: 20px 28px` + `minHeight: 44` — already meets the 44×44 floor. Footer links use the `colign-caption-link` CSS class with tap zones documented at ≥24×24. **HostHome is in the audit (we verify at 320 / 375 / 768 / 1024 / 1440), but no refactor is required to satisfy the contract.** If the audit surfaces issues, fix them inline — no token bridge needed.

Rationale for dropping the cross-app token bridge: it would have had exactly one consumer (HostHome), would have introduced a permanent two-file numerical-sync tax with no enforcement mechanism beyond convention, and HostHome's responsiveness is unchanged by the refactor (same `clamp()` values, different storage location).

### 4.3 Touch & pointer policy

A new global stylesheet — `apps/colign-frontend/src/responsive.css`, imported once at the app root.

**Touch target floor (pointer-conditional):**
- `(pointer: coarse)` — primary interactive elements measure **≥44×44 CSS px**: buttons, links acting as buttons, icon-only buttons, form controls (input, select, checkbox, radio), nav items
- `(pointer: fine)` — primary interactive elements measure **≥32×32 CSS px** — sufficient for mouse precision, allows denser desktop layouts
- Dense inline controls — the authoritative exception list lives in **§6.6**, not here. To add a new exception, add the selector there first. May be 24×24 if adjacent-target spacing ≥24 px (WCAG 2.2 AA exception)

**Component-level requirement (important — surfaced by feasibility review):**
The existing `components/ui/Button.tsx` size tokens use fixed heights (`h-7`/`h-9`/`h-10` = 28/36/40 px). Padding-only overrides cannot lift these heights. Implementation must update Button's `SIZES` map so that on coarse pointers the minimum intrinsic height is ≥44 px. Same applies to `Drawer.tsx` close button (`h-10 w-10`) and any future icon-only chrome. This is a **component-level token change**, not just a CSS override.

**Hover/coarse policy:**
- `@media (hover: hover)` gates any hover-only affordance
- **Default to always-visible** for affordances that communicate availability (sort indicators, interactive row state, "this card is clickable" cues). Reserve tap-to-reveal for secondary actions (overflow menus, swipe actions) where always-visible would create visual noise
- Specifically: `TeamRollupTable` sort-header `hover:bg-neutral-50` becomes always-visible chrome (a faint background or a small "click to sort" icon)

**Viewport units:**
- `100dvh` replaces `100vh` everywhere
- `env(safe-area-inset-bottom)` added to any sticky/fixed bottom element (login CTA, plan action bar)

**Component-vs-viewport interaction note:** the coarse-pointer policy is a global rule. Individual components (e.g., `IcDrillDrawer`) may additionally respond to viewport breakpoints in combination with pointer type (e.g., "coarse AND viewport < md → full-screen") — these are component-level refinements stacked on the global policy, not exceptions to it.

### 4.4 Tailwind specificity gotcha (colign-frontend)

`colign-frontend/tailwind.config.js` uses `important: "#colign-root"` to scope utilities for Module Federation consumption. This means `<button class="px-4 py-2">` compiles to `#colign-root .px-4 { padding: 0 1rem }` — high specificity. A naive `responsive.css` rule like `@media (pointer: coarse) { button { padding: 0.75rem 1.25rem } }` will **lose** against the Tailwind utility.

Resolution: write `responsive.css` rules either
1. Scoped to `#colign-root` with matched-or-higher specificity (e.g., `#colign-root button.colign-touch-target`), OR
2. Authored as Tailwind layers / variants via `@layer utilities` and `@media` blocks in `src/index.css` so they compete on equal footing

Implementation plan (writing-plans step) picks one; both are valid. **Verification requirement:** before declaring §4.3 done, manually inspect a coarse-pointer Button via Chrome DevTools to confirm the runtime computed style reflects the 44-px-minimum policy. "The policy must apply, not just be declared."

---

## 5. Container queries — targeted, not everywhere

**Forward-looking rule:** add container queries to a component when the same component is composed in two contexts whose container widths can diverge by ≥1 breakpoint. Apply this rule when reviewing future PRs that propose new container-query usage.

### 5.1 Where container queries go (revised)

**`TeamRollupTable`** — primary win. Today it wraps in `TableScroller` and force-scrolls horizontally on narrow viewports.

- Outer wrapper becomes `container-type: inline-size`
- Container ≥ 640 px → table layout (current desktop view)
- Container < 640 px → **card view**

**Card view anatomy** (each row becomes one stacked Card):

| Row | Content | Style |
|---|---|---|
| 1 | Avatar (h-7 w-7) + display name | `text-fluid-base font-medium`, name+avatar form the row identity |
| 2 | Email | `text-xs font-mono text-neutral-600` — caption |
| 3 | Status pill · commit count · alignment bar with % label | Left-to-right metadata cluster |
| 4 | "Review" button | **Full-width, ≥44 px tall** — primary action |

- **Tap target:** the entire card body remains clickable, calling `onSelectMember(m)` — same behavior as the table mode's TR click. The "Review" button stops propagation to avoid double-handling
- **Sort controls in card mode:** a "Sort by" chip row above the card list, one chip per current sort key (with direction arrow). Replaces the per-column TH click
- **Pagination footer:** wraps to stacked layout below the card list (mirrors the existing `flex flex-col sm:flex-row` pattern in `TeamRollupTable.tsx`)
- **AppShell padding caveat:** at 320 px viewport, `AppShell` page-content padding subtracts from the available container width. Implementation must verify that at 320 px viewport the `TeamRollupTable` outer container width falls below 640 px so the card view triggers. (Today: `ManagerDashboardPage` uses `p-6 sm:p-8` — 24 px each side at base. 320 − 48 = 272 px, well below 640 — fine. Re-verify after any padding change.)

**`IcDrillDrawer`** — already container-sensitive.

- Drawer content area becomes a container
- Container ≥ 480 px → current sectioned layout
- Container < 480 px → commit list collapses to single-column with looser line-height for touch
- **Viewport rule:** on `(pointer: coarse) AND viewport < md (768px)` the drawer renders **full-screen** instead of side-anchored

**Full-screen mode UX detail:**
- A left-pointing **back arrow** (`HiArrowLeft`, `aria-label="Back to team list"`, ≥44×44 tap target) appears in the drawer header, REPLACING the X close button. Phones expect back-navigation when a panel feels page-like; the X button alone is a panel convention that breaks the mental model
- **Scroll position is NOT preserved** across the drawer-to-fullscreen transition — commit list resets to top. (Simpler than tracking + restoring; the IC drill content fits in a couple of screens at touch sizes)
- **Viewport resize handling:** if user resizes from < 768 px to ≥ 768 px while drawer is open (foldable unfold, window resize), the drawer animates back to side-anchored mode and resets scroll to top. Underlying state (selected member) is unchanged

### 5.2 Where container queries do NOT go

- Page-level layout — use viewport breakpoints
- `AppShell` header — always full viewport width
- `HostHome` landing — single column, already fluid via `clamp()`
- Form components (`CommitForm`, invite forms) — single column at all sizes, no value
- Architecture docs site — out of scope per agreed coverage
- **`Card` primitive (`components/ui/Card.tsx`)** — **dropped from this revision**. Card today is used in single-column page-level contexts (WeeklyPlanPage, ReconcilePage, ManagerDashboardPage, CommitForm) — none embed it inside a narrower sibling. Adding `container-type: inline-size` to a shared primitive risks stacking-context side effects for future consumers. Re-evaluate when a concrete narrow-embedding case appears

### 5.3 Browser support

Container queries are baseline 2023 — full support in current Chrome / Safari / Firefox / Edge (see §3 browser support matrix for floors). No polyfill, no legacy gating.

---

## 6. Visual testing workflow

### 6.1 Tool

The gstack `/browse` skill — fast headless Chromium with stealth + cookie management. Per the global rule in `~/.claude/CLAUDE.md`: **never** use `mcp__claude-in-chrome__*` tools directly.

### 6.2 Viewport matrix (revised)

**Five widths per screen** (revised down from seven to keep cost proportional to value):

| Width | Rationale |
|---|---|
| **320 px** | Narrow floor — iPhone SE 1st gen, foldable inner |
| **375 px** | Most common small phone class (iPhone 13 mini / Pixel) — sanity check for the >50% mobile-traffic band |
| **768 px** | `md` boundary — cursor↔touch crossover |
| **1024 px** | `lg` — representative desktop |
| **1440 px** | Stated desktop target |

Dropped from earlier revision: 640 (`sm` boundary — no screens in scope have sm-specific layout transitions) and 1280 (`xl` — identical to 1024 for every layout in scope). Add either back per-screen if the audit surfaces a width-specific behavior.

**Both light and dark mode captured.** Total: 5 widths × 2 modes × 9 screens = **90 baseline + 90 after = 180 screenshots** (vs. 252 in the prior revision).

**Dark-mode triage rule** (resolves the prior dark-mode contradiction):
- Layout bugs in dark mode (overflow, clipping, broken structure) → **in scope**, log in the "broken-on-mobile" bucket and fix
- Color/contrast/shadow polish in dark mode → **out of scope** per §2, log in the results doc as "future dark-mode work" and skip

### 6.3 Auth strategy

Real Auth0 cannot be driven headlessly (Google federation). Procedure for any authenticated screen:

**Precondition (before any audit run):**
- Verify `node scripts/mock-jwt.mjs --email <addr> --role IC` exists and produces a JWT the backend accepts in mock mode. Failure here blocks the audit before any env flips happen — don't proceed until smoke-tested

**Audit-mode flip + restore script (new — `scripts/audit-teardown.sh`):**

The "hard step at end of workflow" sentence becomes a mechanically-enforced script rather than convention-dependent operator memory.

```
#!/bin/bash
# scripts/audit-teardown.sh
# Snapshots .env files at audit start; restores on exit (including SIGINT)
SNAPSHOT_DIR=".audit-snapshot"
case "$1" in
  flip)
    mkdir -p "$SNAPSHOT_DIR"
    cp apps/colign-frontend/.env.local "$SNAPSHOT_DIR/frontend.env.local.bak"
    cp apps/colign-backend/.env.local "$SNAPSHOT_DIR/backend.env.local.bak"
    # ... flip VITE_AUTH_MODE / COLIGN_AUTH_MODE to mock
    ;;
  restore)
    cp "$SNAPSHOT_DIR/frontend.env.local.bak" apps/colign-frontend/.env.local
    cp "$SNAPSHOT_DIR/backend.env.local.bak" apps/colign-backend/.env.local
    rm -rf "$SNAPSHOT_DIR"
    ;;
esac
```

Run `flip` before screenshots, `restore` after. The audit workflow MUST `trap restore EXIT` so an interrupted run still restores.

**Mint JWTs:**
- `node scripts/mock-jwt.mjs --email <addr> --role <IC|MANAGER>` — one IC JWT, one MANAGER JWT
- Inject under `colign_jwt` / `colign_email` / `colign_role` localStorage keys before navigating

### 6.4 Per-screen audit loop (ordered by user journey)

For each screen, capture and audit in BOTH light and dark mode (per §6.2). The list is ordered by user journey:

1. **HostHome** (`pa-host`) — public, no auth
2. **LoginPage** (`colign-frontend`) — public
3. **OnboardingChoicePage** — IC mock, fresh user state
4. **InviteTeammatesPage** — manager flow during onboarding
5. **InviteAcceptPage** — public, takes a token URL
6. **WeeklyPlanPage** — primary IC screen
7. **ReconcilePage** — IC follow-on
8. **ManagerDashboardPage** + **TeamRollupTable** — manager primary
9. **IcDrillDrawer** — opens from #8

Plus **AppShell** chrome — audited once on HostHome and spot-checked on 3+ subsequent screens to confirm consistent target sizing. Required fix: hamburger button ≥ 44×44 CSS px (currently `h-10 w-10` = 40px — fails the touch floor).

For each screen:
1. **Baseline matrix** — capture 5 widths × 2 modes = 10 screenshots
2. **Issue identification** — log against three buckets:
   - WCAG-fail (must fix)
   - Broken-on-mobile (must fix; includes dark-mode layout bugs per §6.2)
   - Polish (logged, not always fixed in this pass)
3. **Apply fixes** — touch targets, breakpoints, container queries, fluid type, hover gating
4. **After matrix** — re-capture the same 10 screenshots
5. **Side-by-side diff** — record in the audit report

### 6.5 Screenshot storage

`tmp/responsive-audit/<screen-name>/{before,after}/<width>-<mode>.png` — gitignored. The final audit report (`docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md`) embeds them via relative path; the directory delivered via `SendUserFile` if a zipped artifact is wanted.

**Capture hygiene** (to avoid leaking mock JWTs):
- Capture only the page viewport — not a full-browser frame including dev-tools or storage panels
- Verify dev-tools / Application / Storage panels are closed before capture
- Screenshot bundles MUST NOT be committed to the public repo without first verifying no JWTs / PII are visible. (Headless capture defaults satisfy this if dev-tools never opens; document anyway.)

### 6.6 Regression layer

Two Cypress specs added to `apps/colign-frontend/cypress/e2e/`:
- `responsive-narrow.cy.ts` — drives `HostHome → Login (mock) → OnboardingChoice → InviteTeammates → WeeklyPlan` at **viewport 320×568**
- `responsive-wide.cy.ts` — same journey at **viewport 1440×900**

The two layers serve different goals: the screenshot audit (§6.4) validates **current state**; the Cypress specs prevent **future regression**. Both are kept.

**CI preflight (mandatory):** Both specs' `before` hook MUST assert:
- `Cypress.env('VITE_AUTH_MODE') === 'mock'`
- `Cypress.env('VITE_API_BASE')` matches an allowlist of dev/local hostnames (regex: `^https?://(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+(?::\d+)?)`)
If either assertion fails, the suite aborts before any screen navigation. Prevents a misconfigured CI job from running the responsive specs against a real backend or real Auth0.

**Scroll/touch assertions** (scoped to the MFE payload, not the entire document):

```typescript
const root = document.querySelector('#colign-root') ?? document.documentElement;
expect(root.scrollWidth).to.be.at.most(root.clientWidth); // no horizontal scroll inside the app
const candidates = root.querySelectorAll(
  'a, button, input, select, [role="button"], tr[data-clickable="true"]'
);
// walk candidates; check 44x44 on narrow run; apply exception list below
```

**Dense-control exception selector list** (authoritative — referenced from §4.3; these may be 24×24 with ≥24 px adjacent spacing):

- `th button` — sort header activators inside `<TableScroller>` tables
- `[aria-label*="agination" i] button, [data-testid*="pagination"] button` — pagination digit buttons (broadened from prior exact-label selector to catch variant labels)
- `[data-dense-control="true"]` — opt-in escape hatch

**Governance for the escape hatch:** adding `data-dense-control="true"` to a new component requires (a) the PR description includes one sentence justifying why 44×44 is infeasible AND (b) the component author confirms adjacent-target spacing is ≥24 px. This makes the escape hatch deliberately friction-ful so it is used sparingly.

These two specs prevent future PRs from regressing the onboarding journey at the two extremes.

---

## 7. Files touched (preview — exact list comes from writing-plans)

**New files:**
- `apps/colign-frontend/src/responsive.css` — touch/pointer policy stylesheet
- `apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`
- `apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts`
- `scripts/audit-teardown.sh` — env snapshot / flip / restore (replaces "hard step at end" convention)
- `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md` — produced during execution

(Removed from prior revision: `apps/pa-host/src/tokens.css` — see §4.2 rationale)

**Modified files (expected):**
- `apps/colign-frontend/tailwind.config.js` — add fluid scale tokens per §4.2
- `apps/colign-frontend/src/index.css` — `@layer base` `:root` CSS custom properties + import `responsive.css`
- `apps/colign-frontend/src/main.tsx` (or app root) — import the responsive stylesheet
- `apps/colign-frontend/src/components/ui/Button.tsx` — update `SIZES` map so coarse-pointer minimum height ≥ 44 px (component-level token change — padding alone can't lift fixed heights)
- `apps/colign-frontend/src/components/ui/Drawer.tsx` — close button ≥ 44×44 on coarse; back-arrow variant for full-screen mode
- `apps/colign-frontend/src/components/TeamRollupTable.tsx` — container query + card view per §5.1
- `apps/colign-frontend/src/components/IcDrillDrawer.tsx` — container query + full-screen mode for coarse+narrow + back affordance + resize behavior
- `apps/colign-frontend/src/components/AppShell.tsx` — hamburger target ≥ 44×44
- Each of the 9 user-journey screens — fixes applied per audit findings
- `apps/colign-backend` `SecurityConfig` (or new `MockAuthGuard`) — startup assertion: **fail-fast if `SPRING_PROFILES_ACTIVE` ∈ {`prod`, `staging`} AND `colign.auth.mode` resolves to `mock`**. Addresses the pre-existing default-to-mock issue surfaced by the security review; small additive change while we're in this area

(Removed from prior revision: `apps/pa-host/src/HostHome.tsx` refactor — already compliant with the contract; refactor would not change rendered behavior)

---

## 8. Definition of done

- All 9 screens pass the 5-width matrix (no horizontal scroll, no clipped content, no touch target < 44×44 on coarse pointers except documented dense-control exceptions listed in §6.6)
- Cypress regression specs pass in CI **with the CI-preflight assertion present and exercised** (assert that running without `VITE_AUTH_MODE=mock` correctly aborts the suite)
- Token contract documented in `tailwind.config.js` with the concrete fluid clamp formulas from §4.2 — values match the table exactly
- Audit results document committed with before/after screenshots (or linked screenshot bundle; not committed to the public repo without PII/JWT redaction)
- Real auth mode restored in `.env.local` (frontend + backend) verified by post-audit `grep` against the `.env.local` files
- Backend startup guard added per §7; verified by running the backend with `SPRING_PROFILES_ACTIVE=prod` + mock auth and confirming startup aborts
- **Real-phone smoke test:** one human attempts the onboarding journey (HostHome → Login → OnboardingChoice → InviteTeammates → WeeklyPlan → first commit added) on an actual touch device and reports completion. Captured as a brief note in the results doc — converts "DoD is mechanical inspection" into "DoD includes a user-task outcome"
- Browser support matrix from §3 verified — the techniques used work in the named browser-floor versions

---

## 9. Strategic and pre-existing notes (flagged for explicit user decision)

These were surfaced by the 7-persona doc-review and merit explicit acknowledgement. They are NOT silently incorporated into spec scope — read and decide.

### 9.1 Opportunity cost vs. onboarding QA (product-lens, P1)

The user is actively QA-ing onboarding (per recent git activity on `OnboardingGate.tsx` and `InviteTeammatesPage.tsx`). This audit competes for the same attention. Strategic question: is responsiveness the right battery to drain before onboarding ships? The user-journey ordering in §6.4 at least front-loads the screens currently under QA, but the work is real and bounded — the user should still confirm sequencing is acceptable before execution starts.

### 9.2 1440 px ceiling (product-lens, P2)

Many modern laptops ship at 1512 / 1600 / 1728 and external monitors at 1920 / 2560+. The spec caps the design ceiling at 1440. Above 1440, layouts stay centered with existing `max-w-*` containers — desktop users get whitespace, not stretched layout. If the manager-on-monitor scenario warrants a wider ceiling, a follow-up audit can raise it.

### 9.3 Multi-input devices (adversarial, residual)

`(pointer: coarse)` is detected once per browsing session. Hybrid devices (Surface in laptop mode, iPad with Magic Keyboard) may report coarse OR change mid-session. The contract treats touch policy as the safer default; desktop users on a hybrid device may see chunkier chrome than strictly necessary. Acceptable tradeoff.

### 9.4 Pre-existing security findings — separate work (security-lens)

The security-lens reviewer surfaced three issues that exist in the codebase TODAY, not introduced by this spec, but the audit's mock-auth flipping pattern interacts with them:

- **P0 — Mock RS256 private key (`scripts/colign-mock-private.pem`) is committed to the public GitHub repository.** Anyone with read access can mint arbitrary JWTs accepted by any backend in mock mode. **Recommendation:** rotate the key pair, gitignore the new key, and rewrite git history to scrub the committed PEM. Separate PR; should land BEFORE any audit screenshot bundle is shared externally
- **P1 — `/__dev__/mint` Vite middleware shell-injection via `execSync` interpolation** in `apps/colign-frontend/vite.config.ts`. Replace `execSync` with `execFileSync` + argv array (no shell), or import the minter as a Node module. Separate PR
- **P0 — Backend `application.yml` defaults `colign.auth.mode` to `mock` when env var unset.** Partially addressed by the startup guard in §7 above (fail-fast on `prod` profile + mock mode), but the broader fix (flip the default to `real` and require explicit opt-in for mock) is a larger change worth its own discussion

These are flagged here rather than silently scope-creeped into the audit.

### 9.5 Container-query forward-looking rule (product-lens)

Established in §5: use container queries when the same component is composed in two contexts whose container widths can diverge by ≥1 breakpoint. Future PRs proposing new container-query usage should be reviewed against this rule.

### 9.6 Inversion check — what could ship and still feel broken

The most plausible failure modes that would survive all DoD checks:
- **iOS sticky-keyboard covering the CTA on form screens** — not caught by static screenshots; the real-phone smoke test (§8) is the catch
- **Layout regressions at 640 px (`sm`)** — this revision drops 640 from the screenshot matrix; trade-off accepted for cost proportionality, but a future audit may want to add it back
- **Flowbite-react modal/dropdown internals drift the touch-target policy** since rewriting them is out of scope — the audit can document Flowbite-specific gaps but won't fix them here

---

## Revision history

- **2026-05-31 r1** — initial spec, sections 1-3 approved interactively
- **2026-05-31 r2** — incorporates 7-persona ce-doc-review findings: drops `xs:` breakpoint (no-op in Tailwind), drops `pa-host/src/tokens.css` and HostHome refactor (no real consumer), drops Card primitive from container queries (premature abstraction), pins concrete fluid clamp formulas, adds card-view + full-drawer UX detail, reduces screenshot matrix from 7 to 5 widths, scopes Cypress assertion to `#colign-root`, adds CI preflight, adds backend startup guard, adds teardown script, adds real-phone smoke to DoD, adds browser support matrix, softens "over-index" framing, surfaces pre-existing security flags
