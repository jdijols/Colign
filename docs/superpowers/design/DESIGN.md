# colign — Design System

**Status:** v0.1 — initial system, anchor for the overnight design loop ([spec](../specs/2026-06-02-overnight-design-loop-design.md))
**Date:** 2026-06-02
**Companion:** [`docs/BRAND.md`](../../BRAND.md) — brand identity (logomark, wordmark, tagline). DESIGN.md is its technical implementation.

> **Read me first.** This doc IS the source of truth for visual decisions in colign. Always read DESIGN.md before making any visual or UI change. Do not deviate without explicit user approval. The autonomous design loop's critic/designer/verifier agents reference this doc as their ground truth.

---

## 1. Product context

- **What it is:** Open source weekly planning where every weekly commit links structurally to a strategic Outcome.
- **Who it's for:** Small teams and individual users who want strategic alignment without enterprise weight. Notion-adjacent in feel — consumer-approachable, not engineering-jargon-heavy.
- **The thing to remember:** **Every commit is structurally aligned to strategy.** The product makes the WHY behind weekly work visible. Every design decision below earns its keep by serving that idea — or staying out of its way.

## 2. Aesthetic direction

**"Disciplined editorial."** Monochrome by deliberate brand choice (per BRAND.md). Calm, restrained, never busy. Reads as "serious software for serious work" without becoming corporate.

Energy comes from **type, space, motion, and depth** — never from color. The peers we channel: Linear (B2B SaaS confidence), Granola (editorial calm), Things (type + space mastery), Vercel (rationed color).

**Posture:** consumer-friendly tone (think Notion), not enterprise/engineering tone (don't think Jira / Salesforce). Full words over abbreviations. Plain language over taxonomy. A small team should feel at home opening this app.

**Decoration level:** Minimal-with-intentional-structure. Hairlines and single-tint backgrounds for hierarchy. No texture, gradients, decorative blobs, illustrations, or stock imagery.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Display / Hero | **Cabinet Grotesk** | Geometric grotesque (Indian Type Foundry, free via Fontshare). Weight 500 for headers, weight 300 (Thin) for hero numerals. Pairs cleanly with Geist. Carries personality at display sizes that Geist alone doesn't. |
| Body / UI | **Geist** | Already in the codebase. Weights 400 / 500 / 600 in regular use. Modern, geometric, legible. |
| Data / Tabular | **Geist** with `font-variant-numeric: tabular-nums` | Same family. Use Geist Thin (300) for very large numerals — e.g., the Alignment % display, week counts. |
| Code | **Geist Mono** | Already in the codebase. Inline code, log output, file paths. |
| Loading | Self-hosted preferred; Google Fonts acceptable for Geist + Geist Mono. Cabinet Grotesk via Fontshare CDN (`https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@300,400,500,700,800&display=swap`). |

### Type scale

Use existing fluid scale (`apps/colign-frontend/tailwind.config.js`) as the floor. Add display-tier sizes:

```css
--t-eyebrow: 0.6875rem; /* 11px, uppercase, tracking-wider 0.12em */
--t-xs: 0.75rem;
--t-sm: 0.8125rem;
--t-base: 0.9375rem;
--t-md: 1rem;
--t-lg: 1.125rem;
--t-xl: 1.375rem;
--t-2xl: 1.75rem;
--t-display-sm: clamp(2rem, 1.5rem + 2vw, 2.75rem);
--t-display:    clamp(2.75rem, 1.8rem + 4vw, 4.5rem);
--t-display-lg: clamp(3.75rem, 2.5rem + 5vw, 6rem);
```

### Eyebrow pattern

Section eyebrows are 11px, uppercase, `tracking-wider` (0.12em), weight 500, `--text-soft`. Always lead with eyebrow → display heading → optional supporting line.

Examples specific to colign:
- "Aiming for" → Rally Cry title
- "My weekly plan" → "Week of June 1"
- "This week" → Alignment number
- "Manager dashboard" → display heading

## 4. Color

**Monochrome scale + semantic-only color.** No brand accent. (BRAND.md is the source of truth on the no-accent decision.)

### Surfaces & text (light mode)

| Token | Hex | Role |
|---|---|---|
| `--canvas` | `#f8f8f7` | Warm off-white; app background |
| `--surface` | `#ffffff` | Card / panel |
| `--surface-tint` | `#f4f4f3` | Single-tint background for grouped content (e.g., Outcome blocks) |
| `--hairline` | `#e5e5e5` | Default border / divider |
| `--hairline-strong` | `#d4d4d4` | Strong rule (Objective left rule, sidebar dividers) |
| `--text` | `#171717` | Primary text |
| `--text-soft` | `#525252` | Secondary text / labels |
| `--text-mute` | `#737373` | Tertiary text |
| `--text-faint` | `#a3a3a3` | Disabled / placeholder |

### Dark mode

Dark mode is its own design pass — out of scope for this DESIGN.md v0.1 unless explicitly requested. Layout regressions in dark are in scope; visual polish in dark is not.

When dark mode tokens are needed during this scope: invert the neutral scale (`--canvas` becomes `#0a0a0a`, `--text` becomes `#fafafa`) and dim semantic shades 10–20%.

### Semantic colors

Used **only** where they carry meaning. Never decoratively. Tuned away from Tailwind defaults — quieter, less candy:

| Token | Hex | Where it appears |
|---|---|---|
| `--success` | `#1a9659` | Alignment ≥ 70%, plan state `Submitted` / `Reconciled`, commit status `Done` |
| `--warning` | `#c4831d` | Alignment 40–69%, plan state `Reconciling`, commit status `Partial` |
| `--destructive` | `#c8334a` | Alignment < 40%, commit status `Missed`, delete confirms, errors |

**Priority colors** (consumer-friendly mapping — see §10):

| UI label | Internal code | Dot color | Text color |
|---|---|---|---|
| **High** | P0 | `--destructive` | `--text` |
| **Medium** | P1 | `--warning` | `--text-soft` |
| **Low** | P2 | `--text-faint` | `--text-mute` |

### Strictly forbidden

Per BRAND.md, in any normal UI: `blue-*`, `indigo-*`, `violet-*`, `purple-*`, gradients, drop-shadows above `shadow-sm`, decorative color of any kind.

## 5. Spacing

**Base unit: 4px.** Density: **comfortable, not compact.** This is the biggest visible change from current "boring/flat" state — cards and lists should breathe.

```css
--s-2xs: 0.25rem; /* 4px */
--s-xs:  0.5rem;  /* 8px */
--s-sm:  0.75rem; /* 12px */
--s-md:  1rem;    /* 16px */
--s-lg:  1.5rem;  /* 24px */
--s-xl:  2rem;    /* 32px */
--s-2xl: 3rem;    /* 48px */
--s-3xl: 4rem;    /* 64px */
--s-pillar: clamp(3rem, 1.5rem + 4vw, 6rem); /* major section breaks */
```

### Vertical rhythm

Major sections (eyebrow → hero → primary content → secondary content) separated by `--s-pillar` (48–96px). Within sections, `--s-xl` (32px) between blocks. Within a card, `--s-md` (16px) between elements.

Generous over tight when in doubt — the brand says calm.

## 6. Depth

**No shadows above `shadow-sm`** (per BRAND.md). Depth comes from **layered surfaces with hairline borders**, not elevation effects.

4-level system:

| Level | Treatment | Use |
|---|---|---|
| `e0` — canvas | `--canvas` background, no border | App background |
| `e1` — surface | `--surface` background, no border | Cards in flow |
| `e2` — elevated | `--surface` background + `1px solid --hairline`, **no shadow** | Cards that need to register as "elevated" |
| `e3` — popover | `--surface` + `1px solid --hairline` + `shadow-sm` | Popovers, drawers, modals (the **one** allowed shadow level) |

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | Expo-out, confident. One easing for everything. |
| `--motion-micro` | `120ms` | Hover, color shifts |
| `--motion-state` | `240ms` | Modal open, drawer slide, fade |
| `--motion-layout` | `400ms` | Page transition, panel resize, week-view shift |

**Respect `prefers-reduced-motion: reduce`** — disable all animations under that media query.

## 8. Layout

**Hybrid.** Strict grid for data-dense surfaces (Goals, Commits, Manager rollup). Editorial cascade on first-impression surfaces (WeeklyPlanPage, Dashboard above-the-fold).

- Max content width: `max-w-5xl` (80rem ≈ 1280px)
- Sidebar: 240px width, fixed (existing pattern OK)
- Mobile: sidebar collapses to drawer at `<md` (already fixed in [`SidebarShell.tsx`](../../../apps/colign-frontend/src/components/SidebarShell.tsx) — `flex flex-col md:flex-row`)

### Border radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | `4px` | Inline elements (badges, small inputs) |
| `--r-md` | `6px` | Buttons, nav items |
| `--r-lg` | `8px` | Cards |
| `--r-xl` | `12px` | App-shell containers, surface mockup wrapper |
| `--r-pill` | `9999px` | Pills, the alignment bar, tags |

Not overly rounded. No bubble border-radius.

## 9. The signature pattern — strategy ↔ commits hierarchy

The strategy → commit cascade is colign's most distinctive UI element. It appears on the Weekly Plan page (in the "this week" temporal slice) and informs the Goals and Manager surfaces.

### Locked pattern: **Left-rule cascade** (minimal-first, consumer-friendly)

```
Aiming for                                  ← eyebrow, --text-soft, --t-eyebrow
Ship faster, support stronger.              ← Cabinet Grotesk 500, --t-2xl

│ Halve the median time from idea to ship   ← Objective, Cabinet Grotesk 500, --t-xl
│                                              with 2px solid --text left rule + 18px padding-left
│  │ Reduce week-1 churn from new users     ← Outcome, Geist 500, --t-base
│  │                                            with 1px solid --hairline-strong left rule + 16px padding-left
│  │   ☐ Ship onboarding wizard v2  ● High  ← Commit: checkbox + title + priority dot+label
│  │   ☐ Instrument funnel events    ● High
│  │
│  │ Cut deploy lead-time to under 30 min
│  │   ☐ Cache npm install in CI     ● Medium
│  │
│  │ Backlog grooming cadence
│  │   ☐ Tune auth cache hit rate    ● Low
│
│ Lift CSAT to 92+ by Q3
│  │ Cut median support ticket to <24h
│  │   ☑ Build runbook (done — strikethrough)  ● Medium
│  │   + Add a commit to this outcome         ← ghost button, dashed circle plus
```

**Rules:**

- **Objectives** anchor a **2px solid `--text`** left rule with `padding-left: 18px`. Display font, weight 500.
- **Outcomes** anchor a **1px solid `--hairline-strong`** left rule with `padding-left: 16px`. Body font, weight 500.
- **Commits** are list rows: 14px checkbox + title + priority indicator. No estimated hours, no chess posture tags, no priority codes (P0/P1/P2) — those live one layer deep on click.
- **Done commits** show a filled `--success` checkbox + strikethrough title in `--text-mute`.
- **Add-commit affordance:** ghost button "Add a commit to this outcome" — dashed-border circle plus icon, faint text. Inline under the last commit of each Outcome.
- **No card boxing.** No background tints. Containment comes from the rule weights alone.
- **No abbreviations.** Never "DO·1", "O2", "P0" in user-facing UI. Full words (Objective, Outcome) — and only if a label is even needed (preferred: just use the names).

### Adjacent: week navigation pattern

Week navigation is **inline** with the page header — `←` arrow button + "Week of June 1" + `→` arrow button on one line. **No pill row** of recent weeks. **No "week 23 · 2026"** label. Arrows are 36×36 square buttons with hairline border, hover into `--canvas`.

```
My weekly plan              ← eyebrow
[←]  Week of June 1  [→]    ← Cabinet Grotesk 500, --t-display
```

When the user navigates to a different week, the entire strategy cascade re-renders for that temporal slice. The strategy may also shift over time — week N might show different active Outcomes than week N+1.

### Alignment instrument

The "high-priority alignment %" is colign's signature data viz. **Do NOT render it on the Weekly Plan page** (per minimal-first decision — it's noise for the IC's own daily-use surface). It belongs on:

- **Manager Dashboard** — instrument-panel sized, hero placement
- **Dashboard** — compact summary above the fold
- (Optionally) inline on the team rollup table

When rendered, the spec is in [`SidebarShell.tsx` + Alignment bar component design from v1 preview]:

- Horizontal bar 0–100%
- Tick marks at 40% (warning threshold) and 70% (success threshold)
- Current value as a large Geist Thin number (`font-weight: 300`, `font-variant-numeric: tabular-nums`)
- Supporting label below: "N/M commits on P0/P1" using internal codes (internal-facing OK), or "N/M commits on high-priority outcomes" for user-facing
- Bar fills with `--success` if ≥70%, `--warning` if 40–69%, `--destructive` if <40%
- Animates from 0 on mount over 600ms with `--ease`

## 10. Consumer-friendly tone

colign is for small teams and individuals — Notion-adjacent, not enterprise. Tone matters everywhere copy lives:

| Use this | Not this |
|---|---|
| **High / Medium / Low** | P0 / P1 / P2 |
| **Objective**, **Outcome**, **Commit** | DO·1 / O2 / WC |
| **Aiming for** (eyebrow) | "Strategic context" |
| **Done**, **In progress**, **Planned** | Status codes |
| **Submit plan**, **Add commit** | "Lock", "Persist" |
| Full sentences in Objectives / Outcomes / Rally Cry | Abbreviated phrases |
| Plain language ("Ship faster, support stronger") | Internal jargon ("Velocity uplift initiative") |

**Internal-facing data names (API, DB, code)** can keep technical codes (P0/P1/P2, plan states LOCKED/RECONCILED). The UI layer translates.

### Translation helpers (codebase needs)

A user-facing UI layer should map:

```ts
priorityLabel(p: "P0" | "P1" | "P2"): "High" | "Medium" | "Low"
priorityTone(p): "high" | "med" | "low"   // for the priority dot class
```

These live in [`apps/colign-frontend/src/lib/tokens.ts`](../../../apps/colign-frontend/src/lib/tokens.ts) (extend existing `priorityTone`).

## 11. Components — the signature primitives

### Buttons

| Style | Treatment | When |
|---|---|---|
| Primary | `bg-text text-canvas`, `rounded-md` | Dominant CTA per surface |
| Secondary | `bg-surface border border-hairline text-text` | Alternative actions |
| Ghost | Transparent, `text-soft → text on hover` | Inline links, dismiss, "Add commit" |

Sizes: `sm` (32px high), `md` (40px high, default), `lg` (48px high). Per `responsive.css`: `lg` is a hard 44px floor on coarse pointers regardless.

### Pills (plan state, status)

`inline-flex`, `1px solid --hairline`, `--surface` background, `rounded-pill`, `--t-xs`, weight 500. Colored dot prefix (6px). Color by state:

- `draft` → `--text-soft` dot
- `submitted` → `--success` dot
- `reconciling` → `--warning` dot
- `missed` → `--destructive` dot

### Priority indicator

Not a pill — a **tiny inline `.priority`** element: 7px colored dot + text label, no border, no background. Smallest, quietest signal.

```html
<span class="priority high"><span class="priority-dot"></span>High</span>
```

### Strategy anchor (top-of-page breadcrumb)

`inline-flex`, hairline border, pill-shaped, `--surface` background. Shows "Aiming for · {Rally Cry}". On hover, can expand to show the full strategy tree as a popover.

## 12. Anti-patterns — never ship these

From general AI-slop list + colign-specific:

- Purple / violet / blue gradients
- 3-column icon-grid feature blocks
- Centered-everything layouts
- Uniform bubble border-radius (`rounded-2xl` everywhere)
- Gradient CTA buttons
- Drop-shadow on cards (only e3 popovers get `shadow-sm`)
- Decorative blobs, abstract illustrations, stock photo backgrounds
- system-ui / -apple-system as a display font (the "I gave up on typography" signal)
- Inter as a primary font (used in BRAND.md as fallback only — Geist is what's actually deployed; do NOT recommend Inter as the primary in any new context)
- "Built for X" / "Designed for Y" marketing-speak copy patterns
- **Boxes nested in boxes** for the strategy cascade — the locked left-rule pattern is the answer; do not regress to nested cards
- **Estimated hours / chess-posture / P0-P1-P2 codes** in the default Weekly Plan view — those go one layer deep
- **Alignment instrument on the Weekly Plan page** — IC's daily-use surface stays minimal; the instrument lives on Manager / Dashboard

## 13. Surfaces in scope for the overnight loop

Per [spec](../specs/2026-06-02-overnight-design-loop-design.md):

1. **Weekly plan** (`/`) — landing surface; locked signature pattern applies here. Hero week-of header, Rally Cry eyebrow, left-rule cascade, NO alignment instrument.
2. **Dashboard** (`/dashboard`) — strategy anchor + compact alignment instrument + this week's quick view
3. **Goals** (`/goals`) — manager-friendly strategy tree editor; left-rule cascade pattern applies
4. **Commits** (`/commits`) — week-navigable commits list; same priority/status treatment
5. **Reconcile** (`/reconcile`) — week-end view comparing planned vs actual
6. **Manager dashboard** (`/manager`) — alignment instrument as hero, team rollup table

Shared foundation owns: tokens (`tailwind.config.js`), `responsive.css` (motion/depth additions), and 5 shared components (AppShell, SidebarShell, NavRail, IcDrillDrawer, ConfirmDialog).

## 14. Mockups & artifacts

- **v1 preview (full system):** [`/tmp/colign-design-preview.html`](/tmp/colign-design-preview.html) — hero, color, type, alignment instrument, full WeeklyPlanPage mockup, containment idiom, primitives
- **v2 signature iteration (locked):** [`/tmp/colign-signature-options.html`](/tmp/colign-signature-options.html) — Option B (left-rule cascade) is the locked direction
- **Peer research:** `/tmp/design-research/{linear,granola,things,vercel,stripe}-home.png`

## 15. Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-02 | Honor BRAND.md monochrome stance; dynamism via type/space/motion/depth, not color | User picked option A on the brand-stance question. BRAND.md says restraint IS the brand. |
| 2026-06-02 | Cabinet Grotesk for display + Geist for body | Editorial pairing carries personality at display sizes Geist alone can't; both geometric grotesques, harmonious. |
| 2026-06-02 | Locked signature: left-rule cascade (Option B v2) | User picked B after explicit minimal-first iteration. 2px rule for Objectives, 1px for Outcomes — containment visible without nested boxes. |
| 2026-06-02 | Priority surfaces as High / Medium / Low (not P0 / P1 / P2) | Consumer-friendly tone (Notion-adjacent, not enterprise). Internal data model unchanged; UI translates via `priorityLabel()`. |
| 2026-06-02 | Inline week nav: `← Week of June 1 →` | User wanted minimal-first. No week pills, no week-of-year subscript. Arrows immediately adjacent to title. |
| 2026-06-02 | Alignment instrument hidden on Weekly Plan page | Noise on the IC's daily-use surface. Lives on Dashboard / Manager instead. |
| 2026-06-02 | Chess tags + hour estimates hidden in default commit view | Go one layer deep on click. Minimal-first surface only shows: title + priority. |
| 2026-06-02 | Memorable thing the design serves: "Every commit is structurally aligned to strategy" | User picked this on the memorable-thing question. The signature cascade pattern is the proof. |
