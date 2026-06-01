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
