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

### Slot 1 (~0:30) — Repo scaffold

(In progress at time of this log entry.)
