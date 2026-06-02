# Colign — project conventions

Colign turns weekly commits into strategic alignment, with a manager roll-up.
Monorepo of three apps:

- `apps/colign-backend` — Spring Boot API (`:8080` local, `api.colign.org` prod)
- `apps/colign-frontend` — Vite + React Module Federation **remote** (`:5174`)
- `apps/pa-host` — Vite + React Module Federation **host** (`:4173` local, `colign.org` prod)

Locally you open the host (`:4173`); in prod the whole app is served at the root
of `colign.org`.

## Handoff docs (convention)

When running `/handoff`, or wrapping up any work session, **always write the
handoff to `docs/handoffs/YYYY-MM-DD-<focus>.md` and commit it** — not just a
temp dir. Match the frontmatter of the existing files in that folder (`date`,
`branch`, `focus`, `status`, `remotes`, `companion`). That folder is the
chronological trail of the project's work and chat history; keep it complete so
any future session can pick up from the repo alone.

If a skill defaults a handoff to a temp directory, copy it into `docs/handoffs/`
as well before finishing.

## Key references

- **Production:** `DEPLOY.md` (Fly + Vercel + Resend + Auth0 runbook — env vars
  per service, secrets, certs, rollback, known deploy gotchas).
- **Local dev + recurring gotchas:** the `colign-dev-runbook` project memory.
- **Session/work history:** `docs/handoffs/`.

## Design system

Always read **`docs/superpowers/design/DESIGN.md`** before making any visual or
UI decision. All font choices, colors, spacing, motion, depth, and the locked
signature pattern (left-rule cascade for the strategy → commits hierarchy) are
defined there. Do not deviate without explicit user approval.

The brand identity (logomark, wordmark, tagline, monochrome stance) lives in
`docs/BRAND.md`. DESIGN.md is its technical implementation — they must stay
consistent.

Tone: consumer-friendly (Notion-adjacent), not enterprise/engineering. Full
words over abbreviations (Objective/Outcome/Commit, never DO·1/O2/WC). Priority
surfaces as **High / Medium / Low** even though the internal codes remain
P0/P1/P2 — translate at the UI layer via `lib/tokens.ts`.
