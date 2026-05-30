---
date: 2026-05-30
branch: main
focus: colign brand pivot, design system, Auth0 SDK integration
status: shipped (14 commits, working tree clean)
companion-handoff: docs/handoffs/2026-05-30-colign-architecture-site.md
prior-checkpoint: ~/.gstack/projects/ST6/checkpoints/20260530-181910-handoff-colign-design-system.md
---

# Handoff — colign brand + design system + Auth0

Sister doc to [2026-05-30-colign-architecture-site.md](./2026-05-30-colign-architecture-site.md). That one covers the in-pa-host Architecture sub-app written in a parallel chat. **This one covers everything else built this Saturday**: the brand pivot, the project-owned UI primitive library, the Auth0 integration, and the bug hunt that unblocked the redirect flow.

For wider session context (decisions, gotchas, file map), read the gstack checkpoint at `~/.gstack/projects/ST6/checkpoints/20260530-181910-handoff-colign-design-system.md`.

## What this session shipped

14 commits on `main`, no remote yet. Working tree clean as of this handoff. Run `git log --oneline | head -14` to see them; I won't duplicate the list here.

The five things worth knowing about:

1. **Brand pivot to colign.** Naming dialogue across ~6 AI proposals + 2 user counter-proposals; user landed on `colign` (portmanteau of co- + align) at colign.org, open source / MIT positioning. Mark + wordmark + tagline + full brand system in [docs/BRAND.md](../BRAND.md).
2. **Design system rollout.** Tailwind `neutral` greyscale only, functional emerald/amber/rose where it carries semantic meaning. Project-owned primitives at `apps/wc-frontend/src/components/ui/` (Button, Card, Badge, Alert, Input/Textarea/Select, Label/Field, Drawer, Spinner, Pagination, ThemeToggle, Table). Single source of truth for status-→-tone mapping at `apps/wc-frontend/src/lib/tokens.ts`. Theme management with light/dark/system at `apps/wc-frontend/src/lib/theme.ts`. All Flowbite components removed from IC/Manager/Reconcile surfaces.
3. **Auth0 integration.** `@auth0/auth0-react` SDK wired into wc-frontend + pa-host, both with the same dual-mode (`VITE_AUTH_MODE=real|mock`) pattern. Backend's existing `SecurityConfig` accepts both. Auth0 dashboard config for the user's tenant is documented in [docs/AUTH0_SETUP.md](../AUTH0_SETUP.md); Universal Login branding instructions in [docs/AUTH0_BRANDING.md](../AUTH0_BRANDING.md).
4. **Bug hunt: "buttons do nothing."** Root cause turned out to be Auth0's API → Application Access Policy = "Per-app authorization" (default for 2024+ tenants). The SPA had to be explicitly authorized to access the API. After user authorized it, redirect works. Caught upstream by using gstack `/browse` to inspect the network trace and decode the `?error=invalid_request&error_description=...` callback parameter Auth0 was bouncing back. Don't trust just the callback URL config when debugging this.
5. **Resolved the open issue from the Architecture handoff.** That doc flagged "undefined global tokens (`--fg`, `--bg`, `--muted`, `--border`, `--surface`) — host home renders with degraded styles." I added those CSS variables to [apps/pa-host/index.html](../../apps/pa-host/index.html) lines 8-13 with light + dark variants matching the colign brand. Architecture site's `var(--fg, fallback)` references now resolve to real tokens instead of falling back.

## What's NOT done (for the next session)

These are remaining for Sunday / Monday morning to hit the submission deadline:

| Item | Where | Effort |
|-|-|-|
| User applies Auth0 Universal Login branding | dashboard, per [docs/AUTH0_BRANDING.md](../AUTH0_BRANDING.md) | ~10 min user clicks |
| Cypress + Cucumber/Gherkin smoke E2E | new in `apps/wc-frontend/cypress/`, pin set in [research/06-cypress-cucumber.md](../../research/06-cypress-cucumber.md) | ~2 hr |
| Vitest unit tests | new in `apps/wc-frontend/src/**/*.test.ts(x)` — state machine reducer + alignmentTier util + 2 components | ~1 hr |
| JaCoCo coverage % honestly logged | `cd apps/wc-backend && ./mvnw verify` then log the % in README + the gate pass/fail | ~30 min |
| `docs/ARCHITECTURE.md` | new — cross-link the 6 research briefs, data model Mermaid, state machine, multi-tenant extension path | ~1 hr |
| Demo video (5 min) | OBS / Loom, follow [PLAN.md §8](../../PLAN.md) storyboard, use Auth0 sign-in for the redirect blip | ~1 hr |
| Architecture site polish (light + dark, alignment) | apps/pa-host/src/architecture/ — see the companion handoff | ~1 hr |
| Submission package | README polish + GitHub remote + tag + draft submission text | ~30 min |

## Sister handoff dependencies

The Architecture site handoff is largely complete but had **two open follow-ups** that this session resolved or partially resolved:

| From [Architecture handoff](./2026-05-30-colign-architecture-site.md) | Status after this session |
|-|-|
| "Undefined `--fg`/`--bg`/`--muted`/`--border`/`--surface` tokens" | ✅ Resolved — defined in `apps/pa-host/index.html` lines 8-13 with light + dark variants |
| "Nothing has been committed" | ✅ Resolved — all design system + brand work landed in commits `0f73a4a` through `7899906` |

Two items from that handoff are still TODO and should be picked up by a fresh agent:

- Run `/design-review` on the Architecture site pages — visual QA pass for spacing/contrast/alignment in light + dark
- Make `<FileRef>` paths actually link to source on GitHub once the repo has a remote

## Critical "don't redo" list

Don't repeat work that's already committed. Specifically:

- Don't re-propose brand names — colign is locked, see [docs/BRAND.md](../BRAND.md)
- Don't migrate wc-frontend pages off Flowbite again — done, see `apps/wc-frontend/src/components/ui/`
- Don't add a different dark-mode strategy — the `class`-strategy `ThemeToggle` at `apps/wc-frontend/src/components/ui/ThemeToggle.tsx` is wired and works
- Don't add Tailwind to pa-host — keep its inline-CSS-with-variables pattern
- Don't re-wire `@auth0/auth0-react` — it's done in both apps, behind `VITE_AUTH_MODE`
- Don't seed the Auth0 callback URLs again — user has applied them in the dashboard
- Don't second-guess the API → Application Access "Per-app authorization" fix — that's the resolution to the "buttons do nothing" bug, was correctly identified, user applied it

## Suggested skills for the next session

Pick the one that matches what the user asks for next:

| Skill | When to invoke |
|-|-|
| `/design-review` | When the user says "click around and tell me what's off" — runs a visual QA pass against `http://localhost:5174` and the Architecture site, catches contrast/spacing/alignment slips in both light + dark |
| `/qa` | For end-to-end happy-path verification of the IC + Manager flows after Auth0 sign-in. Uses gstack `/browse` headlessly |
| `compound-engineering:ce-test-browser` | Cypress + Cucumber scaffold — pins live in [research/06-cypress-cucumber.md](../../research/06-cypress-cucumber.md); follow that brief verbatim |
| `compound-engineering:ce-plan` | If the user adds scope beyond the brief (e.g. real multi-tenant org isolation, Stripe billing, Outlook Graph integration) — produce a plan before any code |
| `compound-engineering:ce-commit-push-pr` | When the work is ready to push — squashes the WIP-shaped commits if any, drafts the PR body |
| `/document-generate` | For the missing `docs/ARCHITECTURE.md` — cross-links research briefs + the data model Mermaid + state machine + multi-tenant extension path |
| `/find-docs` (or `ctx7`) | If touching Auth0 SDK v2, Spring Security 6.3, Hibernate 6 fetching strategies, Vite 5 Module Federation, react-router-dom v6 — verify against current docs, don't trust training data |
| `/code-review` | Pre-submission diff review across the whole branch, catches consistency issues with [docs/BRAND.md](../BRAND.md) before the user sees them |

Do NOT invoke `/brainstorming`, `/design-consultation`, `/design-shotgun`, or any naming-related skills — those decisions are settled and re-running them wastes time and risks regressing.

## Critical context the user is operating with

- **Deadline:** Monday 2026-06-01 morning, ST6 partnership submission
- **The user is a Gauntlet AI cohort member.** This submission is for a hiring engagement. Defaults to "ship, polish later" for any scope addition.
- **The user OWNS `colign.org`** and has paid for the domain. The brand is real, not a demo placeholder.
- **The user has the Auth0 tenant configured under their personal account** (`dev-xpbf6g232kcce8nc.us.auth0.com`). All sensitive credentials are in the user's Auth0 account, NOT in this repo. The mock JWT keypair at `scripts/wc-mock-*.pem` is DEMO-ONLY (clearly marked) and the only "secret" in the repo — and it's only usable against the local mock-mode `SecurityConfig`, not the real Auth0 path.
- **The user pivoted from `WCM` to `colign` mid-session.** Some files still have `wc-*` identifiers — that's intentional (file paths and module identifiers stayed; brand identity changed). See the Glossary callout planned for the Architecture site.

## Service boot reference

End of session, all three services were running. If you restart, use these env-var-overridden boot commands (the `SPRING_PROFILES_ACTIVE=h2` flag re-seeds the demo data on every boot):

```bash
# Backend (real Auth0 mode against H2 with seed data)
cd apps/wc-backend && \
  SPRING_PROFILES_ACTIVE=h2 \
  WC_AUTH_MODE=real \
  WC_AUTH0_ISSUER=https://dev-xpbf6g232kcce8nc.us.auth0.com/ \
  WC_AUTH0_JWKS=https://dev-xpbf6g232kcce8nc.us.auth0.com/.well-known/jwks.json \
  WC_AUTH_AUDIENCE=https://api.wc.local \
  JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
  PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH \
  ./mvnw spring-boot:run

# wc-frontend (real Auth0 mode)
cd apps/wc-frontend && ./node_modules/.bin/vite --port 5174

# pa-host (real Auth0 mode + hosts /weekly-commit/* federated remote + /architecture/* sub-app)
cd apps/pa-host && ./node_modules/.bin/vite --port 4173
```

To swap to mock mode (e.g. for headless QA), set `VITE_AUTH_MODE=mock` in the relevant `.env.local` and restart vite. Backend doesn't need restart if you also flip `WC_AUTH_MODE=mock`.

## TL;DR for a fresh agent

The brand, design system, and Auth0 work shipped clean — 14 commits, working tree clean, services running. Architecture site is largely shipped per the sister handoff. Remaining work is testing infra (Cypress, Vitest, JaCoCo), the missing `ARCHITECTURE.md`, Auth0 dashboard branding (user task), and the Monday-morning demo recording. **Pick up by asking the user which of those they want first** rather than guessing — the priority depends on what they want the reviewer to see in the demo video.
