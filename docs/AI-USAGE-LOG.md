# AI Usage Log — Weekly Commit Module (ST6)

This log is a chronological, honest record of how AI tools (primarily Claude Code on Anthropic's Claude Opus 4.7, 1M-context) were used to plan, design, build, and verify the Weekly Commit Module submission for ST6. Each entry lists: AI tool/model, prompt summary, output summary, human judgment applied, and (where relevant) a pointer to the artifact in the repo.

Per the project brief, AI usage documentation is a required deliverable. The goal of this log is not just compliance — it's a faithful audit trail so a reviewer can see exactly where the AI added leverage and where human judgment overrode or directed it.

---

## 2026-05-30 (Saturday) — Day 0: Kickoff and research burst

### Decision 1 — Adopt a gated-handoff agent workflow over an 8-hour autonomous loop

- **AI tool:** Claude Code, Opus 4.7 (1M context), foreground conversation
- **Prompt summary:** Asked AI to evaluate a research-and-planning loop approach vs. autonomous unattended loop, given the ~36–40 hour window to Monday-morning submission.
- **AI output:** Recommended the gated-handoff pattern with a focused ≤2-hour parallel research burst gated by a `PLAN.md` review before any implementation. Flagged the "encyclopedia slop" risk of running open-ended autonomous research on a short, prescriptive brief.
- **Human judgment:** Accepted recommendation. Confirmed greenfield repo. Chose to keep the research burst tight (6 topics, ~25 min each) rather than expand to 4–8 hours.

### Decision 2 — Six parallel research agents dispatched (in background)

- **AI tool:** Claude Code Agent tool, dispatching three specialized subagent types from the compound-engineering pack:
  - `ce-web-researcher` × 1 — open-ended product research
  - `ce-best-practices-researcher` × 2 — design patterns and data modeling
  - `ce-framework-docs-researcher` × 3 — framework/library reference setup
- **Prompt summary:** Six self-contained research prompts:
  1. 15-Five weekly UX teardown (lifecycle, fields, pain points)
  2. RCDO + OKR data modeling (ERD, state machine, "chess layer" interpretation)
  3. Vite 5 Module Federation host/remote setup
  4. Spring Boot 3.3 + Auth0 + Flyway + Pageable reference stack
  5. Flowbite manager-dashboard patterns + reconciliation diff UI
  6. Cypress + Cucumber/Gherkin BDD on Vite/React minimal setup
- **AI output:** Pending. Each agent will return a 600–1600 word markdown brief with cited sources. Briefs will be saved to `research/*.md` and synthesized into `PLAN.md` at the planning gate.
- **Human judgment:** Approved the topic list as-is; explicitly excluded generic React/TypeScript best practices and Auth0 walkthroughs (handle inline) and the demo-video-quality research pass (storyboard ourselves once a real build exists).

### Decision 3 — Repo scaffolding initialized in parallel with research

- **AI tool:** Claude Code, Bash + Write tools
- **Prompt summary:** Initialize git, create `research/` and `docs/`, write `.gitignore` covering Node/Vite/Java/Spring/Cypress artifacts, and seed this `AI-USAGE-LOG.md`.
- **AI output:** Files created. No code committed yet — that happens after the planning gate.
- **Human judgment:** Authorized as durably-implied setup work.

### Surprise — subagent environment denied WebSearch / WebFetch / ctx7

- **AI tool:** Same agents from Decision 2 returning notifications.
- **Outcome:** Agent 1 (15-Five UX teardown) bailed out entirely — said it could not produce a credibly-sourced product teardown without live web access. Agents 2–6 fell back to training-data synthesis (Opus training cutoff: Jan 2026) and flagged the limitation explicitly at the top of their outputs.
- **Human judgment:** Accept the training-data-grounded synthesis for stable framework topics (Vite MF, OKR modeling, Spring Boot, Flowbite, Cypress — all stable, well-documented surfaces) because Opus 4.7's Jan-2026 cutoff is recent enough to be useful. For the *product-research* gap (15-Five UX), wrote the teardown by hand in the main context from training data with the same caveat banner, rather than spend a recovery pass on gstack's `/browse` — the *replacement* design only depends on workflow shape (well-known), not on exact field placement (would have needed live verification).

### All 6 research briefs saved

- **AI tool:** Subagents (briefs 2–6 verbatim with HTML-entity decoding) plus main-context hand-write (brief 1).
- **Artifacts:** `research/01-fifteen-five-ux.md`, `research/02-rcdo-data-model.md`, `research/03-vite-module-federation.md`, `research/04-spring-boot-stack.md`, `research/05-flowbite-dashboard.md`, `research/06-cypress-cucumber.md`. Each carries a sourcing-caveat banner at the top.
- **Token spend (research phase):** ~119k subagent tokens across 6 agents.

### Synthesis — PLAN.md written, ready for gate review

- **AI tool:** Claude Opus 4.7 (main context).
- **Input:** Project-Brief.md + Company-Info.md + research/01–06.
- **AI output:** `PLAN.md` — full data model, state machine, route inventory, scope (MUST / SHOULD / COULD cuts), Saturday-vs-Sunday-vs-Monday build order with timeboxes, demo storyboard, open questions for the user.
- **Human judgment:** Pending — this is the gate. User to review `PLAN.md` and approve/redirect before any code is written.

---

### Gate approved with redirects — Day 1 build authorized

- **AI tool:** Claude Opus 4.7 (main context, structured AskUserQuestion).
- **Input:** §10 open questions in `PLAN.md`.
- **AI output:** Tentative recommendations on Auth0 (mock), MF host (structure-only), chess layer (MUST), Cypress E2E breadth (one feature), seed-data scale (1 mgr + 5 ICs + 2 weeks).
- **Human judgment:** User overrode three of the tentatives, choosing the higher-fidelity path: **real Auth0 tenant** (not mocked), **stand up a separate PA host app** (not structure-only), and **promote carry-forward + seed-data aggressively** (multi-week storyline). User accepted the chess-layer-as-MUST recommendation. Scope edits → "plan is right, go."
- **AI follow-up:** Replanned to absorb the ~5 added hours by cutting: admin RCDO CRUD screen, the LOCKED→DRAFT unlock path, 2 of 4 Vitest component tests, and ESLint/Spotless/SpotBugs polish (deferred to "if time permits"). Added an Auth0 risk-mitigation block to the plan: dual-mode `SecurityConfig` (real issuer URI XOR hardcoded RS256 public key) so we can fall back if Auth0 setup blows the 2-hour timebox.
- **Artifacts updated:** `PLAN.md` §12 added (Gate decisions, cuts absorbed, Auth0 mitigation, revised build order); status flipped to ✅ approved.

---

## 2026-05-30 (Saturday) — Day 1: Build

### Slot 1 (~0:30) — Repo scaffold ✅

- **AI tool:** Claude Opus 4.7 main context, Bash + Write tools.
- **Output:** Created `apps/{wc-frontend,wc-backend,pa-host}` + `scripts/`, root `package.json` (Yarn Workspaces), `README.md`, initial git commit `65abcbf`.
- **Human judgment:** Pre-approved at the gate.

### Slot 2 (~1:30) — Backend bootstrap ✅

- **AI tool:** Claude Opus 4.7 main context. Decisions informed by `research/04-spring-boot-stack.md`.
- **Output:** `pom.xml` (Spring Boot 3.3.5, Java 21, JPA, Validation, Security, OAuth2-RS, Postgres, Flyway 10, Lombok, springdoc, Testcontainers, JaCoCo 0.8.12 with 80% line rule). `WcApplication`, `lombok.config`, `application.yml` (with `wc.auth.mode` switch), `application-local.example.yml`, `application-test.yml`. `V1__init.sql` with 9 tables (chess_tag seeded, FK chain in safe order, unique constraints on plan(user_id, week_start_date) + reconciliation(weekly_commit_id), outcome self-FK, **weekly_commit.outcome_id NOT NULL** — the structural-alignment guarantee). 9 entities (`User`, `Team`, `ChessTag`, `RallyCry`, `DefiningObjective`, `Outcome`, `Plan`, `WeeklyCommit`, `Reconciliation`) + 3 enums (`PlanState`, `CommitStatus`, `UserRole`). `AbstractAuditingEntity` with `@Version`, `AuditorAwareImpl` reading JWT email → sub → "system". Temporary permit-all `SecurityConfig` with real CORS. Commit `be59282`.
- **Human judgment:** Two decisions worth recording: (a) plain Long FK columns instead of `@ManyToOne` — predictable Hibernate behavior, no lazy-load surprises, DTO projection later; (b) chess_tag as a lookup table (not Postgres enum), seeded in the migration, so labels can be tuned per tenant without schema migration (per `research/02`).

### Slot 3 (~2:00) — Auth0 dual-mode SecurityConfig ✅

- **AI tool:** Claude Opus 4.7 main context. Decisions informed by `research/04-spring-boot-stack.md`.
- **Output:** Replaced the temporary permit-all `SecurityConfig` with a dual-mode `JwtDecoder`: `wc.auth.mode=real` builds from the Auth0 issuer URI (via `JwtDecoders.fromIssuerLocation` + 60s clock-skew leeway + audience validator + roles converter for the namespaced `https://wc/roles` claim); `wc.auth.mode=mock` parses `classpath:keys/wc-mock-public.pem` and validates RS256 against it. Shared `JwtAuthenticationConverter` reads roles + scopes. `CurrentUser` static helper for controllers (`email()`, `sub()`, `roles()`, `hasRole()`). Generated a real RSA 2048 keypair via `openssl`; public key is at `apps/wc-backend/src/main/resources/keys/wc-mock-public.pem`, private key at `scripts/wc-mock-private.pem` — both committed deliberately, marked DEMO-ONLY in `scripts/README.md`. Wrote `scripts/mock-jwt.mjs` (dep-free Node script using built-in `crypto` + RS256) — mints tokens with configurable email/role/ttl. Wrote `docs/AUTH0_SETUP.md` for the user's one-time Auth0 dashboard configuration when flipping to `mode=real`. Added H2 test dep + `open-in-view: false` + Maven Wrapper for portability. Test fixed: lowercase schema name, dropped a moved Spring Boot 3.3 class reference.
- **Verification:** `./mvnw test` passes — Flyway migrated V1 against H2-Postgres mode, Hibernate validated all 9 entities against the schema, Spring context loaded in 3.4s. `node scripts/mock-jwt.mjs` mints a valid 777-char JWT with the expected `email`, `https://wc/roles`, and `scope` claims.
- **Human judgment:** The user's choice in §12 was real Auth0 tenant; the AI built dual-mode + documented the dashboard setup so the user can switch via a single config flag once their tenant is ready. The 2-hour timebox in `PLAN.md` is preserved: if real-tenant setup blocks Saturday's progress, the mock path remains live for the demo. The committed mock private key is a deliberate trade-off — it lets a reviewer run the demo immediately without setting up Auth0, and the file is plastered with DEMO-ONLY warnings in code, README, and PEM-adjacent docs.

### Slot 4 (~1:00) — Repositories + Controllers + DTOs ✅

- **AI tool:** Claude Opus 4.7 main context.
- **Output:** 8 JPA repository interfaces (`User`, `Plan`, `WeeklyCommit`, `Outcome`, `ChessTag`, `Reconciliation`, `RallyCry`, `DefiningObjective`). 8 DTOs as Java 21 records (`PlanDto` with nested `AlignmentSummary`, `WeeklyCommitDto`, `OutcomeRefDto`, `ChessTagDto`, `CreatePlanRequest`, `AddCommitRequest`, `UpdateCommitRequest`). 2 services (`PlanService` owns get-or-create + state-machine transitions + DTO hydration with no-N+1 bulk lookups; `UserResolver` lazy-provisions a `User` from the JWT principal). 4 REST controllers (`PlanController`: GET /current, POST, GET /{id}, PATCH /{id}/lock; `WeeklyCommitController`: POST /plans/{planId}/commits, PATCH /commits/{id}, DELETE /commits/{id}; `OutcomeController`: paginated GET with hydrated parent labels; `ChessTagController`: GET all). 3 exception classes + `GlobalExceptionHandler` that returns RFC 7807 `ProblemDetail` for NotFound (404), IllegalTransition (409), validation (400). Centralized "current week = Monday-of-this-week, UTC" in `PlanService.currentWeekStart()`.
- **Verification:** `./mvnw test` clean — Spring context loads in 3.7s, 8 repositories registered, Flyway migrates, Hibernate validates entities, smoke test passes. Initial wiring bug caught and fixed inline: `OutcomeController` was constructor-injecting raw `JpaRepository<DefiningObjective, Long>` without concrete repo interfaces, so Spring had no bean — added `DefiningObjectiveRepository` + `RallyCryRepository`.
- **Human judgment:** Two judgment calls worth recording: (a) lazy-provision the domain `User` from JWT on first hit rather than requiring pre-seeded users (faster demo, documented as production-harden item in `UserResolver` Javadoc); (b) hydrate FK names (`outcomeTitle`, `chessTagCode`, etc.) into commit DTOs in bulk via `Map<Long, Entity>` lookups, not per-row `@ManyToOne` fetches — predictable N+1-free behavior, and the FE gets everything it needs in one round-trip.

### Slot 5 (~1:30) — Frontend bootstrap (wc-frontend) ✅

- **AI tool:** Claude Opus 4.7 main context.
- **Output:** Full Vite 5 + React 18 + RTK Query + Flowbite + Tailwind scaffold for `apps/wc-frontend` exposed as MF remote on :5174. 4 RTK Query slices wired (plans, commits, outcomes, chessTags). Auth slice with localStorage persistence. Login page mints a dev JWT via a Vite middleware (`/__dev__/mint` that shells out to `scripts/mock-jwt.mjs`). Pages: WeeklyPlanPage (querying GET /plans/current), Reconcile + Manager placeholders for Sunday. AppShell with Navbar (role-conditional Team link).
- **Verification:** `tsc --noEmit` clean. `vite` boots on :5174 in 674 ms. `/__dev__/mint` returns a valid 777-char JWT. `curl GET /plans/current` returns full DTO with audit columns.
- **Wiring fixes inline:**
  - Dropped Tailwind `prefix: "wc-"` and stripped `wc-` from every class — Tailwind utility prefix would have broken flowbite-react's internal class names. Kept `important: "#wc-root"` for host-isolation specificity.
  - Yarn 1.22 wasn't installed (no global yarn binary). Installed via `npm install -g yarn`. Earlier "yarn install" had silently exited 0 because of `... | tail -25` shell-pipe masking the failure.
  - TypeScript project-reference setup was wrong — `vite.config.ts` was in main tsconfig's include + the .node tsconfig had `noEmit:true` (illegal for composite). Simplified to two independent tsconfigs.
- **Human judgment:** Built the dev-mint flow as a Vite middleware (shells out to the Node script) rather than (a) a Spring `/dev/mint` endpoint that would have duplicated the JWT signing logic in Java, or (b) pre-minted tokens with short TTLs. The middleware-based flow keeps the private key only in `scripts/`, mirrors the real Auth0 redirect pattern (call → get token), and supports any email/role/ttl combo without code changes.

### Slot 6 (~1:30) — PA host bootstrap (apps/pa-host) ✅

- **AI tool:** Claude Opus 4.7 main context.
- **Output:** Minimal Vite + React app at `apps/pa-host` that consumes the WC remote at runtime via `@module-federation/vite` host config. No compile-time dep on wc-frontend. Lazy-imports `wc/WeeklyCommitApp` under `/weekly-commit/*`. Plain CSS-in-JS for host chrome (no Tailwind to avoid double Tailwind output). Mirrored the `/__dev__/mint` middleware so the WC remote's LoginPage works when running inside the host origin. `WeeklyCommitApp` now self-contains its Redux Provider so the host doesn't have to know about the WC store — host only owns BrowserRouter for shared URL/history context.
- **Verification:** `tsc --noEmit` clean. Vite boots on :4173 in 1012 ms. MF "Federated types extraction completed" — wc/WeeklyCommitApp type contract was emitted by the remote and consumed by the host. Host HTML includes the MF runtime entry tag. `/__dev__/mint` works on host origin. WC remoteEntry.js reachable with CORS allow.
- **Wiring fixes inline:**
  - Port 5173 was squatted by another project ("React Pong") — moved PA host to :4173. Added :4173 to backend CORS allowed origins.
  - WC remote's routes used leading-slash absolute paths (`/login`, `/manager`, `/reconcile`). Those would have matched at the host's root, not under `/weekly-commit/`. Switched all paths + Link `to=` + `navigate()` calls + Navigate `to=` props to relative form (`login`, `manager`, `..`, `..` etc.). Standalone case (where BrowserRouter mounts at /) is unchanged because relative resolves the same. Hosted case (mounted at /weekly-commit/) now resolves correctly too.
  - WeeklyCommitApp's `<Provider>` moved out of `main.tsx` and into the exposed component, so the host doesn't need to set up its own Redux store. Tradeoff documented: shared state between host and remote is not supported under this layout — fine for the demo, would need shared scope plumbing for production.
- **Human judgment:** Made the PA host deliberately minimal — plain CSS-in-JS, no Tailwind, single HostHome page + remote mount route. Demo emphasis is on "the WC remote can be embedded without modification", not on a polished host UI. The host's worth in the submission is the architecture proof, not its own visual surface.

### Slot 7 (~2:00) — My Weekly Plan UI ✅

- **AI tool:** Claude Opus 4.7 main context.
- **Output:** `V2__demo_seed.sql` migration (1 Team, 1 RallyCry, 2 DefiningObjectives, 5 Outcomes spanning P0/P1/P2 priorities). Full WeeklyPlanPage rewrite with CommitForm, CommitRow, PlanStatePill, AlignmentBar components. CommitForm groups outcomes by RallyCry → DefiningObjective in an `<optgroup>` so the IC sees the strategy chain when picking. Chess-tag selector is a three-button radio group with semantic colors (OFFENSE = green, DEFENSE = amber, MAINTENANCE = gray). AlignmentBar renders the same tier coloring (green ≥70, amber 40–69, red <40) recommended in `research/05`. Lock button is disabled until ≥1 commit exists; empty-state messaging tells the IC why each commit must link to an Outcome.
- **Verification (live, end-to-end against running backend + frontend):**
  - Mint IC JWT → GET /plans/current auto-creates plan (id=1) for week 2026-05-25, state=DRAFT, alignment 0%.
  - POST commit with P0 outcome + OFFENSE tag → alignment 100% (1/1 on P0/P1).
  - POST second commit with P2 outcome + DEFENSE tag → alignment 50% (1/2 on P0/P1). Recomputed correctly.
  - PATCH /plans/1/lock → state=LOCKED, lockedAt timestamp written.
  - PATCH /plans/1/lock (again) → 409 Conflict with `{"type":"about:blank","title":"Conflict","status":409,"detail":"Illegal plan transition LOCKED -> LOCKED: lock only valid from DRAFT", "instance":"/api/v1/plans/1/lock", "timestamp":"2026-05-30T17:38:52.383630Z"}`. RFC 7807 ProblemDetail from `GlobalExceptionHandler` works exactly as designed.
- **TypeScript wiring fix inline:** Initial `CommitForm` used a clever conditional type `typeof outcomesPage extends { content: infer A } ? ...` to derive the grouped-outcome shape. TS narrowed it to `never`. Replaced with explicit `Map<string, OutcomeRefDto[]>`.
- **Human judgment:** Two pragmatic shape calls: (a) `<optgroup>` UX in plain HTML rather than a fancy combobox library (saves a dep, the strategy chain is what matters), (b) optional chess tag and effort hours instead of required — required-everything friction would have made the demo recording slower without adding signal.

### Sunday Slot — Reconciliation + Carry-forward ✅ (pulled forward from Sunday)

- **AI tool:** Claude Opus 4.7 main context.
- **Backend:**
  - `ReconciliationService` owns the LOCKED → RECONCILING → RECONCILED transitions plus the carry-forward step that materializes next week's plan with `status=CARRIED` clones of any MISSED commits (linked via `carried_from_commit_id` for lineage).
  - `ReconciliationController`: PATCH /plans/{id}/start-reconciliation, POST /commits/{id}/reconciliation, GET /commits/{id}/reconciliation, PATCH /plans/{id}/finalize-reconciliation.
  - `ReconciliationDto` + `ReconcileCommitRequest` (with bean-validation `@Pattern` on `actualStatus`).
  - `PlanService.toDto` updated to bulk-fetch reconciliations into the commit DTOs (no N+1).
- **Frontend:**
  - `reconciliations` RTK Query slice with `useReconcileCommitMutation`.
  - `plans` slice extended with `useStartReconciliationMutation` + `useFinalizeReconciliationMutation`.
  - `ReconcilePage` rewrite: rendering depends on state (DRAFT shows "lock first" hint, LOCKED shows Start button, RECONCILING shows the diff list, RECONCILED shows success banner). Per-commit row expands inline into a 4-button status radio (DONE/PARTIAL/MISSED/DROPPED) + actual hours + outcome note. Submit only enabled once every commit has a reconciliation row.
- **Verification (live, end-to-end through running backend):**
  - Plan id=1 created, 2 commits added (P0 + P2), alignment 50%.
  - Lock → LOCKED. Start reconciliation → RECONCILING.
  - Reconcile commit 1 as DONE with note "Shipped on time", commit 2 as MISSED with note "Blocked by infra outage".
  - Finalize → state=RECONCILED, reconciledAt timestamp.
  - **Carry-forward**: GET next week's plan (week=2026-06-01) returned a brand-new plan id=2 in DRAFT containing 1 commit titled "Tune auth cache hit rate" with `status=CARRIED` and `carriedFromCommitId=2`. This is the product's headline narrative — verified working end-to-end.
- **Human judgment:** Decided to **keep commits referencing the ORIGINAL outcome on carry-forward** rather than re-prompting the IC to re-pick. Rationale: the strategic context (which outcome it supports) is the part that doesn't change between weeks; the IC may want to re-prioritize but the alignment FK should persist. Also: PARTIAL maps to commit.status=MISSED in the denormalized status mirror (because part-done = not-done from a carry-forward perspective). Logged so a reviewer can argue with the choice.

### Slot 8 — Day-1 polish + Sunday slots

(In progress at next AI turn — Manager dashboard next.)
