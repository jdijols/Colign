# colign

> **Aligned weeks. Visible strategy.**
> Open source weekly planning where every commit links to a strategic outcome.

[![License: MIT](https://img.shields.io/badge/License-MIT-neutral.svg)](#license) ![Spring Boot 3.3](https://img.shields.io/badge/Spring_Boot-3.3-neutral) ![Vite 5 Module Federation](https://img.shields.io/badge/Vite_5-Module_Federation-neutral) ![Auth0 OIDC](https://img.shields.io/badge/Auth-Auth0_OIDC-neutral) ![PostgreSQL 16](https://img.shields.io/badge/Postgres-16-neutral)

**colign** is an open source weekly-planning tool that makes structural alignment a precondition, not an afterthought. Every weekly commit a person makes has to link to a leaf Outcome in the team's strategy tree (Rally Cry → Defining Objective → Outcome). Managers see a **high-priority alignment %** per direct report — the share of that week's commits linked to a P0/P1 Outcome. Drift becomes visible the moment it happens, not three quarters later.

This repository was originally built as the **Weekly Commit Module** submission for the ST6 Partners gauntlet brief — see [Project-Brief.md](Project-Brief.md). The brief asked for "a production-ready micro-frontend module that replaces 15-Five." Rather than ship it as a one-off submission, we kept going and opened it up at [colign.org](https://colign.org) as a standalone project anyone can run.

**Status:** Active development. Submission flavour is preserved (the WC module is a Module Federation remote consumed by a "PA host" shell, per the brief), and the open-source flavour is added on top (custom brand, MIT license, run-it-yourself docs). The two coexist without contradiction.

## What this is

Today, weekly planning in many orgs happens in 15-Five and is disconnected from strategic execution. Employees fill out plans with no enforced link to company objectives; managers review them without knowing whether the work actually supports the right priorities. colign fixes that by making every individual weekly commitment carry a structural foreign key to a granular Outcome leaf in the RCDO hierarchy — and by giving managers a roll-up view with a **high-priority alignment %** (share of commits linked to a P0/P1 Outcome) per IC and per team.

The brand identity (mark, wordmark, color system, typography, voice) lives in [docs/BRAND.md](docs/BRAND.md). It's deliberately monochrome — the discipline is the point.

Built end-to-end with Claude Opus 4.7 in the loop. Every AI decision is logged in [docs/AI-USAGE-LOG.md](docs/AI-USAGE-LOG.md), per the brief's AI Usage Documentation requirement.

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

Requires Node 20+, Yarn 1.22+, Java 21. The Maven Wrapper (`./mvnw`) handles Maven for you. For the backend, you have two options:

- **Quick start (H2 in-memory, no Postgres setup):** `SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run`
- **Production-shaped (Postgres 16 — what the brief specifies):** install/start Postgres, create db `wc` + user `wc`, run `./mvnw spring-boot:run`

### Auth modes

By default the backend runs in `wc.auth.mode=mock` and validates demo RS256 JWTs signed by the keypair in `scripts/`. Mint a token via `node scripts/mock-jwt.mjs --email ada@st6.dev --role IC`. For real Auth0 tenant setup, see [docs/AUTH0_SETUP.md](docs/AUTH0_SETUP.md).

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
cd apps/wc-backend && ./mvnw verify    # runs unit tests + JaCoCo gate

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
