# Brand — colign

Open source weekly planning where every commit links to a strategic outcome.

The brand exists in service of one positioning claim: **structural alignment between weekly commits and the strategic outcomes they roll up to**. Every brand decision below earns its keep by clarifying that idea or staying out of its way.

## Name

**colign** (always lowercase, never capitalized — including at the start of sentences).

Origin: portmanteau of `co-` (together / collective) + `align`. Reads as both a noun (the practice of co-aligning) and a verb (to colign your team). Pronounced "ko-LINE."

Domain: [colign.org](https://colign.org). The `.org` TLD is load-bearing: it telegraphs "open source / mission-driven" up front, which matches the actual licensing posture (MIT) and frees the brand from looking like a SaaS-with-a-paywall.

## Tagline

Primary: **"Aligned weeks. Visible strategy."**

Long form, when context allows: **"Open source weekly planning where every commit links to a strategic outcome."**

Avoid: "the better 15-Five" or any framing that defines the product by what it's not. The brief frames colign as the *category-redefining* alternative, not a feature-parity-plus-one replacement.

## Logomark

Three left-aligned horizontal bars of decreasing length, stored as a single SVG. Visualizes both:

- **The RCDO hierarchy** — Rally Cry (longest, broadest) → Defining Objective → Outcome (shortest, most specific).
- **The act of alignment itself** — things lining up to a common left edge.

Source: `apps/wc-frontend/src/components/Brand.tsx` (React component) and `apps/{wc-frontend,pa-host}/public/favicon.svg` (favicon variant with rounded square background).

The mark uses `currentColor` so it inherits the text color of its parent — no separate light/dark variants needed in product UI. The favicon embeds a `prefers-color-scheme` media query so it adapts in browser tabs too.

## Wordmark

`colign` lowercase, Inter (system fallback) at `font-weight: 600`, `letter-spacing: -0.025em` on display sizes, `-0.01em` on body sizes. Pair with the logomark at a 2× gap.

```tsx
<ColignBrand size="lg" />   // hero contexts
<ColignBrand size="md" />   // navbar
<ColignBrand size="sm" />   // footer / chips
```

## Color system

Monochrome. The product is the discipline; the discipline is the point. No brand-color accents — restraint signals confidence.

### Greyscale (Tailwind `neutral`)

| Role | Light mode | Dark mode |
|-|-|-|
| Canvas | `neutral-50` / `white` | `neutral-950` |
| Surface (cards) | `white` | `neutral-900` |
| Border (hairlines) | `neutral-200` | `neutral-800` |
| Primary text | `neutral-900` | `neutral-50` |
| Secondary text | `neutral-600` | `neutral-400` |
| Tertiary / labels | `neutral-500` | `neutral-500` |

### Functional color (used only where it carries semantic meaning)

| Role | Light | Dark | Where it appears |
|-|-|-|-|
| Success | `emerald-500` | `emerald-400` | Alignment ≥70%, plan state `LOCKED` / `RECONCILED`, commit status `DONE` |
| Warning | `amber-500` | `amber-400` | Alignment 40–69%, reconciliation status `PARTIAL`, plan state `RECONCILING` |
| Destructive | `rose-500` | `rose-400` | Alignment <40%, commit status `MISSED`, delete confirms, errors |

Strictly forbidden in normal UI: `blue-*`, `indigo-*`, `violet-*`, `purple-*`, gradients, drop-shadows above `shadow-sm` (except for elevated dialogs).

## Buttons

| Style | Tailwind base | When |
|-|-|-|
| Primary | `bg-neutral-900 text-white dark:bg-white dark:text-neutral-900` | One per surface, the dominant CTA |
| Secondary | `border border-neutral-200 dark:border-neutral-800` | Alternative actions, "Cancel", "Create an account" |
| Tertiary (text) | `text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50` | Inline links, "Sign out", footer links |

All buttons: `rounded-md`, `px-4 py-2.5`, `text-sm font-medium`, `transition-colors`, focus ring `focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2`.

## Typography

- **Sans**: Inter (system fallback) — UI, body, headings.
- **Mono**: ui-monospace stack (`'SF Mono', Menlo, Consolas, monospace`) — code samples, emails, IDs, tabular data.
- **Letter-spacing**: `tracking-tight` (-0.025em) on display headings, `tracking-tight` (-0.01em) on subhead, default elsewhere.
- **Line-height**: 1.05 on display, 1.5 on body, 1.55 on long-form prose.

## Geometry

- **Corners**: `rounded-md` (6px) on buttons + inline elements, `rounded-lg` (8px) on cards, `rounded-2xl` (16px) max on full-screen sheets. Never `rounded-full` on buttons.
- **Borders**: 1px, single-color hairlines. No double borders, no dashed except for "empty state" placeholders.
- **Shadows**: avoid. Use border + spacing for elevation. `shadow-xl` exists only for floating dialogs.
- **Spacing**: `space-y-2` between siblings in a stack, `space-y-4` between sections, `space-y-6` between major regions.

## Density

Linear-like. Tight padding on tables (`py-2`), generous on landing (`py-12+`). Avoid Vercel-marketing white-space — colign reads as a tool, not a brochure.

## Tone of voice

Builder-to-builder. Concrete nouns. No hype words ("powerful", "robust", "comprehensive", "unlock"). State the function, name the trade-off, end with what to do.

Wrong: "colign unlocks unprecedented visibility into your team's strategic alignment."

Right: "Every weekly commit links to a leaf Outcome. Alignment % is computed from outcome priority tier."

## Off-limits

- Capitalized "Colign" — always lowercase.
- Blue / indigo / violet anywhere — even for "primary" actions. The primary is neutral-900 / white.
- Gradient text in hero headings (we already burned that down once).
- "Empower / enable / streamline / leverage" copy.
- Stock photography. Product UI screenshots only.
- Light + dark mode that aren't both first-class. If a surface looks wrong in dark mode, the design is wrong.
