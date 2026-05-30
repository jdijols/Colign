# Handoff — colign architecture/onboarding site

**Date:** 2026-05-30 (Saturday afternoon, ST6 submission weekend — deadline Monday AM 2026-06-01)
**Repo:** `/Users/jasondijols/Documents/Code-Projects/ST6`
**Branch:** `main` (uncommitted — see "What's not committed yet" below)
**Working app:** http://localhost:4173/architecture/ (served by pa-host)

---

## What was built

A self-contained onboarding/architecture site that lives **inside** `apps/pa-host` at the `/architecture/*` route. Eight pages with sidebar nav, Mermaid diagrams, and prose grounded in the real WC source files. Intended audience: a new engineer joining the team.

The user originally framed it as a "separate web off the production site"; we explored three shapes via the brainstorming skill (separate Vite/React app, Docusaurus-style static, in-pa-host route) and the user chose **in-pa-host route** for simplicity (no separate deploy lifecycle).

### Page inventory
1. Overview (`/architecture`)
2. People & Permissions (`/architecture/people`)
3. Data Model (`/architecture/data`)
4. The Weekly Lifecycle (`/architecture/lifecycle`)
5. Routes & Screens (`/architecture/routes`)
6. Auth Flow (`/architecture/auth`)
7. Stack & Module Federation (`/architecture/stack`)
8. Glossary & Where to Start (`/architecture/glossary`)

All eight render correctly with Mermaid diagrams. Verified end-to-end via gstack `/browse` headless. Screenshots in `/tmp/arch-*-v2.png` (light theme) if you want a visual baseline.

### Files added (all under `apps/pa-host/src/architecture/`)
- `ArchitectureSite.tsx` — `/architecture/*` root, owns internal `<Routes>`
- `Sidebar.tsx` — numbered nav + ColignMark logo + Resources section
- `Mermaid.tsx` — client-side renderer with colign-theme palette (light + dark)
- `nav.ts` — section list + neighbor helpers (drives both Sidebar and per-page prev/next)
- `styles.css` — full handwritten CSS scoped under `.arch-site`, pulls colign tokens with fallbacks
- `components/` — `FileRef.tsx`, `Callout.tsx`, `Code.tsx`, `PageFooter.tsx`
- `pages/` — eight `*Page.tsx` files

### Files modified
- `apps/pa-host/src/App.tsx` — added `/architecture/*` lazy route + "Architecture" nav link (note: this file was further restyled by the user/other chat with the colign brand — ColignMark + NavLinkPlain helpers, sticky 56px nav)
- `apps/pa-host/src/HostHome.tsx` — added discoverability card (also restyled by user/other chat — full colign hero + tag chips + two-card grid)
- `apps/pa-host/package.json` — added `mermaid@^11.15.0` dependency

---

## Mid-conversation pivot: the colign rebrand

While the architecture site was being built, the user (or a parallel chat) restyled `App.tsx` and `HostHome.tsx` with new colign branding:
- Product name shifted from "Weekly Commit Module" / "WC" → **colign**
- New visual identity: `ColignMark` (three descending horizontal bars SVG), Inter at weight 600, tight letter-spacing, monochromatic palette
- New tagline: "Aligned weeks. Visible strategy."
- Tag chips: Spring Boot 3.3, Vite Module Federation, Auth0 OIDC, PostgreSQL 16, MIT
- External brand URL: colign.org (MIT-licensed standalone project)

The user then asked me to update the architecture site to match. I did, in three passes:
1. **`styles.css` rewrite** — switched all internal `--arch-*` tokens to `var(--fg/--bg/--muted/--border/--surface, <fallback>)`, dropped colored accents, weight 700→600, tighter letter-spacing, lighter borders.
2. **Sidebar** — added ColignMark, "colign / architecture" branding, numbered nav (01-08), Resources section with internal app link + external colign.org link.
3. **Mermaid theme** — full palette override to monochromatic surface/border/muted, with `prefers-color-scheme: dark` variant.
4. **Terminology pass** — page titles lowercased with trailing period ("Data model.", "People & permissions.", etc.); body prose refers to "colign" for the product, keeps "wc-*" for file paths and module identifiers; new Overview callout + new Glossary entry explain the split.

---

## ⚠️ Outstanding issue: undefined global tokens

`HostHome.tsx` and `App.tsx` reference `var(--fg)`, `var(--bg)`, `var(--muted)`, `var(--border)`, `var(--surface)` but **no one has defined them anywhere in the repo yet** (grepped repo-wide for `--fg:` etc., no matches in any `.css` / `.html` / `.ts` / `.tsx`). Pa-host's `index.html` still has the original hard-coded body styles from before the rebrand.

Effect:
- **Architecture site** renders cleanly because every reference in `styles.css` uses `var(--fg, #0f172a)` with literal fallbacks.
- **Host home** renders with degraded styles — primary buttons lose their background fill, card surfaces fall back to transparent, etc. (Compare screenshot `/tmp/host-current.png` vs the visual intent of the new HostHome code.)

**Suggested fix (when whoever owns this comes back):** add a `:root { --fg: ...; --bg: ...; --muted: ...; --border: ...; --surface: ...; }` block (plus a dark variant) to `apps/pa-host/index.html`. Recommended literal values that match what `styles.css` falls back to:

```
Light:                          Dark:
--fg: #0f172a;                  --fg: #f1f5f9;
--bg: #f9fafb;                  --bg: #030712;
--surface: #ffffff;             --surface: #0b1220;
--border: #e5e7eb;              --border: #1f2937;
--muted: #64748b;               --muted: #94a3b8;
```

The architecture site is forward-compatible — when these land, its fallbacks yield silently to the real tokens.

I deliberately did NOT add these to `index.html` because (a) the user only asked me to update the architecture page, and (b) the other chat may already have a plan for token definitions. If a fresh agent confirms with the user, this is a 5-line edit.

---

## What's not committed yet

Nothing has been committed. `git status` returned clean output at the start of the conversation but I've added/modified ~16 files since. Run `git status` first thing to see what's staged-vs-modified.

When committing, the message should mention:
- new architecture/onboarding site at `/architecture/*`
- 8 pages with Mermaid ERD/state/sequence/flowchart diagrams
- adopts colign brand tokens with fallbacks
- mermaid dependency added to `apps/pa-host`

---

## Verification harness

To re-verify after any change:

```bash
# Pa-host is already running on :4173 (and wc-frontend on :5174, backend on :8080)
# from a parallel chat session — confirm with: lsof -ti:4173 :5174 :8080
B=~/.claude/skills/gstack/browse/dist/browse
for path in "" people data lifecycle routes auth stack glossary; do
  $B goto "http://localhost:4173/architecture/$path" 2>&1 | tail -1
  $B wait --networkidle 2>&1 | tail -1
  $B screenshot "/tmp/arch-${path:-overview}-check.png" 2>&1 | tail -1
done
```

Then `Read` each PNG via the Read tool to eyeball it. All eight should render without the "Syntax error in text" Mermaid sad-face icon. (One was caught and fixed during build — the Stack page had `import('wc/WeeklyCommitApp')` in a diagram label; parens inside quoted Mermaid node labels choke the parser. Fixed by simplifying the label text.)

---

## Repository context (don't re-derive)

- **Top-level docs:** [README.md](README.md), [PLAN.md](PLAN.md) (gate-approved build plan), [Project-Brief.md](Project-Brief.md), [Company-Info.md](Company-Info.md)
- **AI audit log (required by submission):** [docs/AI-USAGE-LOG.md](docs/AI-USAGE-LOG.md) — append a new entry covering the architecture site work + the colign restyle pass
- **Auth setup guide:** [docs/AUTH0_SETUP.md](docs/AUTH0_SETUP.md)
- **Architecture (entities, lifecycle, route inventory):** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — should reference this new site, currently doesn't

---

## What the architecture site itself covers (no need to re-explain to the user)

If the next agent needs to extend the docs, the prose is already grounded in these real source files:

| Page | Key files referenced |
|------|----------------------|
| Overview | the three apps in `apps/`, system flowchart |
| People & Permissions | `User.java`, `Team.java`, `UserRole.java`, `ManagerController.java:51`, `UserResolver.java`, `V3__seed_users.sql` |
| Data Model | `V1__init.sql`, all 9 entities under `com.wc.domain`, `PlanService.java:142` (alignment %) |
| Lifecycle | `PlanState.java`, `PlanService.java:83-97`, `ReconciliationService.java:47, 98, 144` |
| Routes & Screens | `WeeklyCommitApp.tsx`, all 5 controllers under `com.wc.controller`, `api/baseApi.ts` |
| Auth Flow | `SecurityConfig.java`, `UserResolver.java`, `mock-jwt.mjs`, `AUTH0_SETUP.md` |
| Stack & MF | `pa-host/vite.config.ts`, `wc-frontend/vite.config.ts`, the `main.tsx` of each app |
| Glossary | RCDO terms, chess layer, lifecycle, RTK Query tags + 5 "good first contribution" tasks |

---

## Suggested skills for the next session

- **`/design-review`** — Designer's-eye visual QA on `http://localhost:4173/architecture/*`. The site is functionally correct but hasn't had a polish pass for spacing rhythm, alignment, dark-mode contrast, or "AI slop" patterns.
- **`/ce-commit`** — Single commit for the new architecture site + mermaid dep, separate from any colign-rebrand commits the other chat creates. Keep them atomic.
- **`/ship`** — When ready: bump VERSION, update CHANGELOG, commit, push, PR. The PLAN.md timeline has buffer Sunday evening; this site is bonus scope beyond the brief but ships cleanly.
- **`/codex review`** — Optional second-opinion pass on the architecture site's CSS/component shape. Lightweight, mostly defensive.
- **`/document-release`** — Post-merge doc sync — specifically, `docs/ARCHITECTURE.md` should link to the new `/architecture/*` site as the "live" version of itself, and the README should mention it in the "Documentation" section.

**Do NOT invoke:**
- `/brainstorming` again — the design was already brainstormed and the user explicitly pivoted to "skip ahead and build" mid-flow.
- `/ce-plan` for this scope — too small, already executed.

---

## Anything the next agent should be careful about

1. **Don't add Tailwind to pa-host.** The architecture site uses hand-written CSS scoped to `.arch-site` specifically to avoid bleeding into the WC MF remote (which carries its own Tailwind/Flowbite tree). Adding Tailwind to pa-host risks global-reset conflicts.
2. **Don't make `ArchitectureSite` a federated remote.** It's a normal lazy-imported sub-app inside pa-host on purpose — docs don't need their own deploy lifecycle.
3. **The `--arch-site` cascade is isolated from the host's HostHome inline styles AND the WC remote.** Adding any global element selectors to `styles.css` would break that. Keep all new rules nested under `.arch-site`.
4. **The Mermaid theme is initialized once globally** (`mermaidInitPromise` singleton). Changing theme post-init requires a page reload. If dark-mode toggle becomes interactive, the renderer needs reinit logic.
5. **`FileRef` paths are decorative text — they don't link anywhere yet.** The Glossary's Sidebar references "View source (soon)" as a deliberate follow-up. Wiring real GitHub/source URLs is on the future-work list.
6. **The user is on a submission deadline of Monday morning (2026-06-01).** Any scope addition here competes with the MUST items in [PLAN.md §2](PLAN.md). Default to "ship as-is, polish later" for this site.

---

## TL;DR for a fresh agent

The architecture/onboarding site at `/architecture/*` in pa-host is **built, restyled to the colign brand, and verified working**. The user's most recent message was acknowledging the restyle landed. Nothing is broken. The next move depends on what the user asks for — likely either (a) committing the changes, (b) polishing a specific page, or (c) extending coverage to a topic the site doesn't cover yet (Cypress/Cucumber, RTK Query tag map, deploy topology — these gaps are listed at the bottom of the Glossary page).
