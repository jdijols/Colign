# Responsive UI Audit & System — Design Spec

**Date:** 2026-05-31
**Status:** Approved (sections 1-3) — ready for implementation plan
**Owner:** Jason Dijols
**Scope:** `apps/pa-host` + `apps/colign-frontend` user-facing surfaces

---

## 1. Goal

Make every end-user-facing screen of Colign responsive and input-aware from **320px (iPhone SE 1st gen / foldable inner) up to 1440px (desktop target)**, with explicit handling of the cursor/keyboard ↔ touch input switch. Over-index on responsiveness: codify a contract that future code can't drift past, and verify the result with a screenshot matrix at seven viewport widths.

## 2. Non-goals

- The architecture documentation site (`pa-host/src/architecture/*`) — for engineering reference only
- Rewriting `flowbite-react` components — explicit user call; we audit and adapt around them
- Automated visual regression infrastructure (Percy / Chromatic) — future project
- Dark-mode QA beyond incidental catches during the audit
- Core Web Vitals / performance work — separate effort, use `/benchmark`

## 3. Standards we are anchoring on

Multiple authorities converge on the same numerical guidance. Summary:

### Touch target sizes

| Source | Minimum | Notes |
|---|---|---|
| WCAG 2.2 AA (2.5.8 Target Size Minimum) | 24×24 CSS px | Inline / spacing / UA exceptions allowed |
| WCAG 2.1 AAA (2.5.5 Target Size Enhanced) | 44×44 CSS px | Stricter, fewer exceptions |
| Apple Human Interface Guidelines | 44×44 pt | iOS / iPadOS minimum |
| Material Design 3 | 48×48 dp | Plus 8 dp spacing between targets |

**Our adopted floor:** primary interactive elements = **44×44 CSS px**. Dense inline controls (sort headers, pagination arrows inside a row) may be **24×24** *if* spacing between adjacent targets ≥ 24px. This overshoots WCAG AA and matches Apple HIG.

### Breakpoint conventions

| System | Values (px) |
|---|---|
| Tailwind 3 (in use) | 640 / 768 / 1024 / 1280 / 1536 |
| Material Design 3 window classes | <600 / 600-839 / 840-1199 / 1200+ |
| Bootstrap 5 | 576 / 768 / 992 / 1200 / 1400 |

**Our adopted contract:** Tailwind defaults **plus an explicit `xs: 320px`** floor. `md: 768px` is treated as the cursor↔touch crossover — above it, we render desktop-class regardless of pointer type.

### Real-device viewport floor in 2026

- 360px and 375px dominate (>50% of mobile traffic combined)
- 320px is the practical stress test — older budget devices and foldables (inner panel)
- We design AT 320px so 360 / 375 / 414 / 430 are comfortable by inheritance

### Modern CSS techniques to standardize

- `clamp(min-rem, preferred-vw, max-rem)` for fluid type and spacing — rem in min/max respects user zoom (accessibility-critical)
- `100dvh` instead of `100vh` — already used in `HostHome`, propagate everywhere
- `env(safe-area-inset-bottom)` for floating bottom elements (iPhone)
- `text-wrap: balance` on headlines (already used in `HostHome`)
- `(pointer: coarse)` and `(hover: hover)` media queries — never hide functionality behind hover on touch devices

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

Additive on top of Tailwind defaults — existing utilities keep working without change.

| Token | Min width | Purpose |
|---|---|---|
| `xs` (new) | **320 px** | Narrow floor — iPhone SE 1st gen, foldable inner |
| (default) | base | Mobile-first base — no prefix |
| `sm` | 640 px | Large phone / small tablet portrait |
| `md` | **768 px** | Tablet / cursor crossover — desktop layout begins |
| `lg` | 1024 px | Small laptop |
| `xl` | 1280 px | Standard laptop |
| `2xl` | 1536 px | Large desktop (above our 1440 target) |

### 4.2 Design tokens — added once, consumed everywhere

**`colign-frontend`** — extend `tailwind.config.js`:
- `theme.screens` gains `xs: '320px'`
- `theme.extend.fontSize` gains a fluid scale: `fluid-sm`, `fluid-base`, `fluid-lg`, `fluid-xl`, `fluid-2xl`, `fluid-3xl` — each defined via `clamp()` with `rem` bounds
- `theme.extend.spacing` gains `fluid-section` for major vertical rhythm
- A new `src/index.css` `@layer base` block sets `:root` CSS custom properties matching the Tailwind tokens — so non-Tailwind contexts (or pa-host) can read them

**`pa-host`** — a new `src/tokens.css` file:
- Defines `--space-*`, `--font-*`, `--bp-*` CSS custom properties with the **same numerical values** as colign-frontend's Tailwind theme
- `HostHome.tsx` refactors from inline literals (`fontSize: "clamp(44px, 8.5vw, 108px)"`) to reading `var(--font-headline-fluid)` etc.
- This is the bridge between the two apps' styling systems — one numerical contract, two consumption mechanisms

Both files document the same numerical contract; they are touched in the same PR so they stay in sync.

### 4.3 Touch & pointer policy

A new global stylesheet — `colign-frontend/src/responsive.css`, imported once at app root — applies these rules without requiring per-component `coarse:` variants:

- Default minimum tap target = **44×44 px** for: primary buttons, links acting as buttons, icon-only buttons, form controls (input, select, checkbox, radio), nav items
- Dense inline controls (sort headers inside a TH, pagination digit buttons inside a row) may be **24×24** *if and only if* adjacent-target spacing is ≥ 24px (WCAG 2.2 AA exception)
- `@media (pointer: coarse)` block enlarges padding on standard interactive elements automatically — e.g., the `Button` component gets `padding: 0.75rem 1.25rem` on coarse pointers vs `0.5rem 1rem` on fine
- `@media (hover: hover)` gates any hover-only affordance — we audit and either (a) tap-to-reveal on coarse pointers or (b) always-visible
- `100dvh` replaces `100vh` everywhere it appears
- `env(safe-area-inset-bottom)` added to any sticky/fixed bottom element (login CTA, plan action bar)

### 4.4 Tailwind specificity gotcha (colign-frontend)

`colign-frontend/tailwind.config.js` uses `important: "#colign-root"` to scope utilities for Module Federation consumption. This means `<button class="px-4 py-2">` compiles to `#colign-root .px-4 { padding: 0 1rem }` — high specificity. A naive `responsive.css` rule like `@media (pointer: coarse) { button { padding: 0.75rem 1.25rem } }` will **lose** against the Tailwind utility.

Resolution: write `responsive.css` rules either
1. Scoped to `#colign-root` with matched-or-higher specificity (e.g., `#colign-root button.colign-touch-target`), OR
2. Authored as Tailwind layers / variants via `@layer utilities` and `@media` blocks in `src/index.css` so they compete on equal footing

Implementation plan (writing-plans step) picks one; both are valid. The contract is: **the policy must apply, not just be declared**.

---

## 5. Container queries — targeted, not everywhere

Container queries are used only where the same component renders at different container widths regardless of viewport. Used everywhere they become noise.

### 5.1 Where container queries go

**`TeamRollupTable`** — primary win. Today it wraps in `TableScroller` and force-scrolls horizontally on narrow viewports.
- Container becomes `container-type: inline-size`
- Container ≥ 640px → table layout (current desktop view)
- Container < 640px → **card view**: each row becomes a stacked card with name+avatar on top, status pill + alignment bar + commit count on a metadata row, Review button as a full-width tap target
- Bonus: makes the table reusable inside `IcDrillDrawer` if ever embedded there

**`IcDrillDrawer`** — already container-sensitive.
- Drawer content area becomes a container
- Container ≥ 480px → current sectioned layout
- Container < 480px → commit list collapses to single-column with looser line-height for touch
- Additional viewport rule: on `(pointer: coarse) AND viewport < md (768px)` the drawer renders **full-screen** instead of side-anchored — the touch convention

**`Card` primitive (`components/ui/Card.tsx`)** — minor.
- Container queries reduce internal padding when embedded in a narrow context, so consumers don't need to know

### 5.2 Where container queries do NOT go

- Page-level layout — use viewport breakpoints (that's what they're for)
- `AppShell` header — always full viewport width, viewport breakpoint is correct
- `HostHome` landing — single column, already fluid via `clamp()`
- Form components (`CommitForm`, invite forms) — single column at all sizes, no value
- Architecture docs site — out of scope per agreed coverage

### 5.3 Browser support

Container queries are baseline 2023 — full support in current Chrome / Safari / Firefox / Edge. No polyfill, no legacy gating.

---

## 6. Visual testing workflow

### 6.1 Tool

The gstack `/browse` skill — fast headless Chromium with stealth + cookie management. Per the global rule in `~/.claude/CLAUDE.md`: **never** use `mcp__claude-in-chrome__*` tools directly.

### 6.2 Viewport matrix

Seven widths per screen, capturing in both light and dark mode (catch issues in either):

| Width | Rationale |
|---|---|
| **320 px** | iPhone SE 1st gen / foldable inner — narrow stress test |
| **375 px** | iPhone 13 mini / Pixel 4a — most common small phone |
| **640 px** | `sm` breakpoint boundary |
| **768 px** | `md` boundary — cursor↔touch crossover |
| **1024 px** | `lg` — small laptop |
| **1280 px** | `xl` — standard laptop |
| **1440 px** | Stated desktop target |

### 6.3 Auth strategy (critical gotcha — from project memory)

Real Auth0 cannot be driven headlessly because of Google federation. Procedure for any authenticated screen:

1. Flip `.env.local` + backend to `COLIGN_AUTH_MODE=mock` / `VITE_AUTH_MODE=mock`
2. Mint two JWTs via `node scripts/mock-jwt.mjs --email <addr> --role <IC|MANAGER>` — one for IC screens, one for MANAGER screens
3. Inject under `colign_jwt` / `colign_email` / `colign_role` localStorage keys before navigating
4. **Restore real auth mode after** — hard step at end of workflow, NOT optional. Documented gotcha per [colign-dev-runbook](../../../memory/colign-dev-runbook.md).

### 6.4 Per-screen audit loop (ordered by user journey)

1. **HostHome** (`pa-host`) — public, no auth
2. **LoginPage** (`colign-frontend`) — public
3. **OnboardingChoicePage** — IC mock, fresh user state
4. **InviteTeammatesPage** — manager flow during onboarding
5. **InviteAcceptPage** — public, takes a token URL
6. **WeeklyPlanPage** — primary IC screen
7. **ReconcilePage** — IC follow-on
8. **ManagerDashboardPage** + **TeamRollupTable** — manager primary
9. **IcDrillDrawer** — opens from #8

For each screen:
1. **Baseline matrix** — capture 7 widths × 2 modes = 14 screenshots
2. **Issue identification** — log against three buckets: WCAG-fail (must fix), broken-on-mobile (must fix), polish (nice to have)
3. **Apply fixes** — touch targets, breakpoints, container queries, fluid type, hover gating
4. **After matrix** — re-capture same 14 screenshots
5. **Side-by-side diff** — record in the audit report

### 6.5 Screenshot storage

`tmp/responsive-audit/<screen-name>/{before,after}/<width>-<mode>.png` — gitignored. The final audit report (`docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md`) embeds them via relative path, with the directory delivered via `SendUserFile` if you want a zipped artifact.

### 6.6 Regression layer

Two Cypress specs added to `colign-frontend/cypress/e2e/`:
- `responsive-narrow.cy.ts` — drives `HostHome → Login (mock) → OnboardingChoice → InviteTeammates → WeeklyPlan` at **viewport 320×568**
- `responsive-wide.cy.ts` — same journey at **viewport 1440×900**

Both assert:
- `document.body.scrollWidth <= window.innerWidth` (no horizontal scroll)
- No interactive element has `getBoundingClientRect()` smaller than 44×44 on the narrow run, **except** elements matching the documented dense-control exception list (see below)

**Dense-control exception selector list** (these may be 24×24 with ≥24px adjacent spacing):
- `th button` — sort header activators inside `<TableScroller>` tables
- `nav[aria-label="Pagination"] button` — pagination digit buttons
- `[data-dense-control="true"]` — opt-in for future cases (escape hatch)

The Cypress assertion walks `document.querySelectorAll('a, button, input, select, [role="button"]')` and applies the exception list before checking the 44×44 floor.

These prevent future PRs from regressing the journey.

---

## 7. Files touched (preview — exact list comes from writing-plans)

**New files:**
- `apps/colign-frontend/src/responsive.css` — touch/pointer policy stylesheet
- `apps/pa-host/src/tokens.css` — design token CSS custom properties
- `apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`
- `apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts`
- `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md` — produced during execution

**Modified files (expected):**
- `apps/colign-frontend/tailwind.config.js` — add `xs` breakpoint + fluid scale tokens
- `apps/colign-frontend/src/index.css` — `@layer base` CSS custom properties + import `responsive.css`
- `apps/colign-frontend/src/main.tsx` (or app root) — import the responsive stylesheet
- `apps/pa-host/src/main.tsx` — import `tokens.css`
- `apps/pa-host/src/HostHome.tsx` — refactor inline literals to read from CSS vars
- Each of the 9 user-journey screens — fixes applied per audit findings
- `apps/colign-frontend/src/components/ui/Card.tsx` — container query rules
- `apps/colign-frontend/src/components/TeamRollupTable.tsx` — container query + card view
- `apps/colign-frontend/src/components/IcDrillDrawer.tsx` — container query + full-screen mode for coarse+narrow
- `apps/colign-frontend/src/components/AppShell.tsx` — hamburger target ≥ 44×44

The fix list per screen will be enumerated during execution (the audit is what discovers them). The writing-plans step that follows this spec produces the ordered, isolated unit-of-work plan.

---

## 8. Definition of done

- All 9 screens pass the viewport matrix (no horizontal scroll, no clipped content, no touch target < 44×44 except documented dense-control exceptions)
- Cypress regression specs pass in CI
- Token contract documented in both `tailwind.config.js` and `pa-host/src/tokens.css` with matching numerical values
- Audit results document (`2026-05-31-responsive-ui-audit-results.md`) committed with before/after screenshots (or linked screenshot bundle)
- Real auth mode restored in `.env.local` and backend env
