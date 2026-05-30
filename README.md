# Weekly Commit Module (WC)

> Production-ready replacement for 15-Five weekly planning, with structural
> RCDO (Rally Cries → Defining Objectives → Outcomes) alignment enforced at
> the data model layer. Submission for ST6 Partners (Gold-tier, AI-Accelerated).

**Status:** 🔨 In active build — submission due 2026-06-01 (Monday morning).

## What this is

Today, weekly planning in many orgs happens in 15-Five and is disconnected from strategic execution. Employees fill out plans with no enforced link to company objectives; managers review them without knowing whether the work actually supports the right priorities. The Weekly Commit Module (WC) fixes that by making every individual weekly commitment carry a structural foreign key to a granular Outcome leaf in the RCDO hierarchy — and by giving managers a roll-up view with an alignment % per IC and per team.

Built in one weekend, end-to-end, with Claude Opus 4.7 doing the legwork at every stage. Every AI decision is logged in [docs/AI-USAGE-LOG.md](docs/AI-USAGE-LOG.md).

## Repo layout

```
ST6/
├── apps/
│   ├── wc-frontend/       Vite 5 + React 18 + RTK Query + Flowbite — MF remote (port 5174)
│   ├── pa-host/           Vite 5 — MF host shell consuming the WC remote (port 5173)
│   └── wc-backend/        Spring Boot 3.3 + Java 21 + Postgres 16 + Auth0 JWT
├── docs/
│   ├── AI-USAGE-LOG.md    Chronological AI decision log (required deliverable)
│   └── ARCHITECTURE.md    Data model, state machine, route inventory
├── research/              6 cited research briefs that seeded the build
├── scripts/               Demo seed data, mock-JWT generator, etc.
├── PLAN.md                The plan that was approved at the gate
├── Project-Brief.md       The original ST6 brief
└── Company-Info.md        ST6 company context
```

## Quick start

Requires Node 20+, Yarn 1.22+, Java 21, Maven 3.9+, and Postgres 16 running locally.

```bash
# 1. Backend
cd apps/wc-backend
cp src/main/resources/application-local.example.yml src/main/resources/application-local.yml
# (edit Auth0 issuer + DB creds, or set AUTH_MODE=mock for the bundled mock-JWT path)
./mvnw spring-boot:run            # → http://localhost:8080

# 2. WC remote (in a separate terminal)
cd apps/wc-frontend
yarn install
yarn dev                          # → http://localhost:5174 (standalone)

# 3. PA host (in a separate terminal)
cd apps/pa-host
yarn install
yarn dev                          # → http://localhost:5173 (consumes wc remote)
```

## Tests

```bash
# Backend unit + JaCoCo
cd apps/wc-backend && ./mvnw verify

# Frontend unit (Vitest)
yarn workspace wc-frontend test

# E2E (Cypress + Cucumber)
yarn workspace wc-frontend cy:run
```

## Documentation

- [PLAN.md](PLAN.md) — the approved build plan, including scope decisions and cut/keep calls
- [docs/AI-USAGE-LOG.md](docs/AI-USAGE-LOG.md) — every AI decision, prompt, and human judgment
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, state machine, key invariants (to be written Sunday evening)
- [research/](research/) — 6 cited briefs (15-Five UX, RCDO modeling, Vite MF, Spring Boot stack, Flowbite patterns, Cypress+Cucumber)

## AI usage policy

Per the project brief, this submission requires an AI Usage Log. See [docs/AI-USAGE-LOG.md](docs/AI-USAGE-LOG.md). The log records every meaningful AI prompt, output, and the human judgment applied. Where the AI was wrong, the log says so.
