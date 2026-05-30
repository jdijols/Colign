# Weekly Commit Module — Build Plan

**Author:** AI (Claude Opus 4.7) + human review
**Created:** 2026-05-30 (Saturday)
**Submission deadline:** 2026-06-01 (Monday morning)
**Status:** ✅ Gate approved 2026-05-30 (with redirects — see §12 below)

This is the synthesis from the research burst (`research/01–06.md`). It is the
**gate**: review it, redirect or approve, and only then does code get written.

---

## 1. Decision summary (what the research locked in)

| Question | Decision | Source |
| --- | --- | --- |
| Is RCDO a known public framework? | No. Treat as proprietary OKR variant. Model so labels can change without schema migration. | `research/02` |
| How does the IC weekly commit link to strategy? | **One FK on `WeeklyCommit.outcome_id` pointing at the most granular Outcome leaf**, never at RallyCry or DefiningObjective directly. Drill-up via joins. | `research/02` |
| What is "chess layer"? | **Offense / Defense / Maintenance** lookup table (not Postgres enum), joined by FK on `WeeklyCommit.chess_tag_id`. | `research/02` |
| How is reconciliation stored? | **Separate `reconciliation` table, 1:0..1 with `weekly_commit`**. Preserves locked plan-of-record verbatim. | `research/02` |
| Vite Module Federation plugin? | `@module-federation/vite` (official MF team plugin) — NOT `@originjs/vite-plugin-federation`. | `research/03` |
| How does the WC remote also run standalone? | `main.tsx` wraps `<Provider>` + `<BrowserRouter>` around the exposed `WeeklyCommitApp`. The exposed component itself ships no Provider or Router — host owns those. | `research/03` |
| Spring Security DSL? | Lambda-only (Spring Security 6.3 removed `and()` chaining). Use `requestMatchers`, not `antMatchers`. | `research/04` |
| Auth0 JWT clock skew? | Register `JwtTimestampValidator(Duration.ofSeconds(60))` in a `DelegatingOAuth2TokenValidator` — default leeway is zero. | `research/04` |
| Auditor identity source? | Auth0 JWT `email` claim, fallback to `sub`, fallback to `"system"`. | `research/04` |
| Manager dashboard drill-down UX? | **Right-anchored slide-over (Flowbite `Drawer` `position="right"`)** — not modal, not inline expand. Keeps team table in context. | `research/05` |
| Alignment indicator? | Inline thin progress bar + tiered % label (green ≥70, amber 40–69, red <40). | `research/05` |
| Cypress + Cucumber preprocessor? | `@badeball/cypress-cucumber-preprocessor@^21.0.3` + `@bahmutov/cypress-esbuild-preprocessor@^2.2.3` + `cypress@^14.5.0`. esbuild over webpack. | `research/06` |
| Test-coverage reporting? | Mochawesome HTML (humans) + `mocha-junit-reporter` XML (CI) via `cypress-multi-reporters`. JaCoCo XML alongside it. | `research/06` |

---

## 2. Scope (the only call that matters under a 36-hour clock)

The brief lists everything. Our 36-hour clock cannot deliver everything. Cuts
follow the principle: **submit a credible Gold-tier slice end-to-end, not a
fully-broad-but-fragile attempt at the whole brief.**

### MUST — non-negotiable to credibly "do the brief"
- Spring Boot 3.3 service with PostgreSQL + Flyway + JWT-protected REST API
- `AbstractAuditingEntity` extended by every domain entity
- Full data model: `RallyCry`, `DefiningObjective`, `Outcome` (self-FK), `Plan`, `WeeklyCommit`, `Reconciliation`, `ChessTag`
- Plan lifecycle state machine: `DRAFT → LOCKED → RECONCILING → RECONCILED → CARRIED_FORWARD`, plus the rare `LOCKED → DRAFT` unlock
- Vite 5 + React 18 + RTK Query + Flowbite + Tailwind frontend
- Single-route entry, structured as a Module Federation remote (`@module-federation/vite`), runnable standalone via `main.tsx` wrapper
- Three screens: **My Weekly Plan**, **Reconciliation**, **Manager Team Roll-up** (with drill-over)
- Strategic-alignment indicator (alignment % per commit + per plan)
- One Cypress + Cucumber happy-path E2E feature covering the full lifecycle
- Vitest unit coverage on at least state-machine + alignment-% + 2 components
- JaCoCo with the 80% rule wired (even if coverage starts under and we narrow scope)
- 5-minute demo video walking the happy path through both IC and manager views
- README + ARCHITECTURE.md + AI-USAGE-LOG.md

### SHOULD — strong-to-have if Sunday afternoon is on track
- Chess-layer (offense/defense/maintenance) badges on every commit + portfolio-balance widget in manager roll-up
- Pageable for manager team view (capped at 2000)
- Carry-forward of missed commits into next week's plan
- Optimistic UI on lock + reconcile mutations
- Seed data in `R__seed.sql` so the demo has 1 manager + 5 ICs + a couple of weeks of history
- ESLint 9 + Prettier 3.3 (frontend), Spotless + SpotBugs (backend) wired and passing

### COULD — skip without remorse
- Auth0 against a real tenant (use a hardcoded RS256-signed JWT for the demo; document the swap in README)
- Outlook Graph API integration (mention as a roadmap item, do not build)
- SQS / SNS / Kafka event publishing (the brief allows local-only for this assessment)
- CloudFront / S3 deployment (run locally; document the `base:` + `Cache-Control` strategy)
- Cypress E2E beyond one happy-path feature (one is enough to prove the BDD infra; broader coverage is not what wins this submission)
- Skip-level / multi-team manager view
- Comments / 1-on-1 / pulse — these are 15-Five surface area we are *deliberately not replicating* because the brief is about Weekly Commit specifically

### Explicitly out of scope
- LogRocket + Loki monitoring (brief says we don't need to replicate)
- Yarn Workspaces + Nx monorepo machinery (brief says same — we use a *light* monorepo with two top-level apps, not full Nx)
- Performance Reviews, Engagement Surveys, High-Fives (15-Five surfaces unrelated to weekly commit)

---

## 3. Data model (final)

See full ERD in `research/02-rcdo-data-model.md`. Key invariants to enforce
in DB + code:

- `WeeklyCommit.outcome_id` is `NOT NULL` — every commit links to a leaf Outcome (this is the structural-alignment guarantee the brief calls out as missing in 15-Five)
- `WeeklyCommit.plan_id` has a UNIQUE constraint with the commit ordinal so a plan can't have duplicate orderings (defer if time tight)
- `Reconciliation.weekly_commit_id` is UNIQUE (1:0..1 enforcement)
- `Plan` has a unique `(user_id, week_start_date)` constraint — one plan per IC per week
- Every entity extends `AbstractAuditingEntity`; `@Version` for optimistic locking on `Plan` and `WeeklyCommit`

---

## 4. State machine (final)

```
DRAFT ──submit──▶ LOCKED ──auto-Friday-5pm──▶ RECONCILING ──IC+mgr sign──▶ RECONCILED ──▶ CARRIED_FORWARD
  ▲                  │                                                          │                  │
  └──unlock─audited──┘                                                          └──no missed──▶ [end]
```

- DRAFT→LOCKED: IC-initiated; gated on every commit having an `outcome_id`
- LOCKED→RECONCILING: scheduled cron at week close, OR IC-initiated early
- RECONCILING→RECONCILED: requires IC submission AND manager sign-off (two-actor rule, both recorded on `Reconciliation`)
- RECONCILED→CARRIED_FORWARD: system action that clones any `MISSED` commits into the next week's plan with `carried_from_commit_id` set
- LOCKED→DRAFT (unlock): manager-only, audited

For the demo we can short-circuit the cron and make LOCKED→RECONCILING user-triggered.

---

## 5. Route / screen inventory

Single `/weekly-commit/*` route from the host's perspective. Internal routes
in the remote:

| Path (inside remote) | Screen | Audience | Priority |
| --- | --- | --- | --- |
| `/` | **My Weekly Plan** — current week's plan, add/edit/delete commits, link to Outcome via combobox, set chess tag, lock | IC | MUST |
| `/reconcile` | **Reconciliation** — planned-vs-actual diff (table from `research/05`), mark each commit done/partial/dropped, optionally add unplanned, submit for manager sign | IC | MUST |
| `/manager` | **Manager Team Roll-up** — sortable, paginated team table with alignment %, reconciled %, "needs review" badge | Manager | MUST |
| `/manager/ic/:userId` (drawer) | **IC drill-over** — same as reconciliation but read-only with approve / request-changes / comment | Manager | MUST |
| `/admin/rcdo` | **RCDO catalog** — list of Rally Cries → Defining Objectives → Outcomes with simple CRUD | Admin | SHOULD |

All screens lazy-imported via `React.lazy` for sub-second initial render.

---

## 6. Tech stack — final pins

### Frontend (`apps/wc-frontend`)
| Package | Version |
| --- | --- |
| `vite` | `^5.4.0` |
| `@vitejs/plugin-react` | `^4.3.0` |
| `@module-federation/vite` | `^1.5.0` |
| `react` / `react-dom` | `^18.3.1` |
| `react-router-dom` | `^6.26.0` |
| `@reduxjs/toolkit` + `react-redux` | `^2.2.7` / `^9.1.2` |
| `flowbite-react` + `flowbite` | `^0.10.x` + `^2.5.x` |
| `tailwindcss` + `@tailwindcss/forms` | `^3.4.x` |
| `typescript` | `^5.6.3` |
| `vitest` + `@testing-library/react` + `@testing-library/jest-dom` | latest stable |
| `cypress` | `^14.5.0` |
| `@badeball/cypress-cucumber-preprocessor` | `^21.0.3` |
| `@bahmutov/cypress-esbuild-preprocessor` | `^2.2.3` |
| `eslint` + `prettier` | `^9.x` + `^3.3.x` |

### Backend (`apps/wc-backend`)
| Package | Version |
| --- | --- |
| `spring-boot` | `3.3.x` |
| `java` | `21` (LTS) |
| `postgresql` (driver) | `42.7.x` |
| `flyway-core` + `flyway-database-postgresql` | `10.x` |
| `lombok` | `1.18.34` |
| `jacoco-maven-plugin` | `0.8.12` |
| `spotless-maven-plugin` | `2.43.0` |
| `spotbugs-maven-plugin` + `findsecbugs-plugin` | `4.8.6.2` + `1.13.0` |

### Repo
- Light monorepo, NOT Nx. Two top-level apps:
  - `apps/wc-frontend/` (Vite + React)
  - `apps/wc-backend/` (Spring Boot + Maven)
- Root `package.json` with Yarn Workspaces just so the FE deps live in one tree.
- Single top-level `README.md` covers both; per-app READMEs for run instructions.

---

## 7. Build order — Saturday / Sunday / Monday

All timeboxes assume one human + one AI working as a pair. Slip means cut a SHOULD or COULD, not extend.

### Saturday afternoon → evening (~10 hr, 14:00–24:00)

| Slot | Block | Done means |
| --- | --- | --- |
| 0:30 | Repo scaffold | Yarn workspaces root, `apps/wc-frontend` and `apps/wc-backend` directories created, `.gitignore` already done, first commit |
| 1:30 | Backend bootstrap | `spring init` (web, data-jpa, postgres, flyway, lombok, validation, oauth2-resource-server), `AbstractAuditingEntity` + 7 entities + `application.yml` + first Flyway V1 migration runs locally |
| 1:00 | Auditor + SecurityConfig | `AuditorAwareImpl` wired, `SecurityConfig` exists with a stub JWT decoder against a hardcoded RS256 public key for the demo |
| 1:00 | Repositories + 1 controller | `WeeklyCommitRepository` + `PlanRepository` + `PlanController` with create/get-current/lock endpoints; verified via curl |
| 2:00 | Frontend bootstrap | `npm create vite@latest`, Tailwind + Flowbite installed, RTK + RTK Query configured, MF plugin wired, Routes scaffold, `WeeklyCommitApp` exposed module exists, `main.tsx` wraps it for standalone, `yarn dev` opens the empty shell on :5174 |
| 2:00 | My Weekly Plan screen | Add/edit/delete commits, outcome-linker combobox calls real API, lock button hits real `/lock` endpoint, state pill updates |
| 1:30 | Day-1 polish | Toast on success/error, basic empty-state, dark-mode toggle (Flowbite gives it free), commit + push |
| **10:00** | **End of Sat** | IC can draft, edit, and lock a real plan end-to-end with real DB persistence. Not pretty yet. |

### Sunday morning → night (~12 hr, 09:00–21:00)

| Slot | Block | Done means |
| --- | --- | --- |
| 2:30 | Reconciliation screen | Diff layout from `research/05`, per-commit done/partial/dropped radio, "submit for manager sign" calls API, state transitions to RECONCILED |
| 3:00 | Manager dashboard | TeamRollupTable component (from `research/05`), server-side Pageable wired, alignment % calculated, "needs review" badge |
| 1:30 | Manager drill-over | Flowbite `Drawer` opens with IC's reconciliation read-only + Approve / Request-changes / Comment, mutations optimistic |
| 1:00 | State-machine carry-forward | When a week is reconciled, missed commits get cloned into next week's draft with `carried_from_commit_id` |
| 2:00 | Cypress + Cucumber setup | All files from `research/06`, smoke `.feature` running green locally |
| 1:00 | Vitest + JaCoCo | Vitest covers state-machine reducer + alignment-% util + 2 components. JaCoCo runs on backend, current % logged in README. Coverage gate set at 80% but allowed to fail if scope-cut forced it lower — record honestly. |
| 0:30 | Seed data | `R__seed.sql` so the demo has 1 manager + 5 ICs + 2 weeks of history |
| 0:30 | Docs | README has run instructions; ARCHITECTURE.md cross-links research briefs |
| **12:00** | **End of Sun** | Full happy-path works end-to-end across IC and manager. Tests run. Ready to record. |

### Monday early morning (~3 hr, 06:00–09:00)

| Slot | Block | Done means |
| --- | --- | --- |
| 1:00 | Demo video | 5-minute screen recording walking through: scaffold quick tour → IC drafts plan → IC locks → manager reviews → IC reconciles → manager approves → carry-forward demoed |
| 0:45 | AI-USAGE-LOG final pass | Every major decision since Saturday-kickoff logged. Honest about what AI wrote vs. what human edited. |
| 0:30 | Submission package | Zip / push to repo, attach README, demo link, test results report, AI usage log |
| 0:45 | Reserve | Bug-bash buffer |

---

## 8. Demo storyboard (~5 min, recorded Mon AM)

1. **0:00–0:30 — Hook.** Sentence: "15-Five lets you write priorities. It does not enforce a structural link from those priorities to strategic outcomes. This module does." Cut to data model diagram on screen.
2. **0:30–1:30 — IC plans the week.** Open the IC view, add 3 commits, each one *must* select an Outcome (show the required-field validation), pick a chess tag (Offense/Defense/Maintenance), lock the plan. Show the state pill flipping DRAFT → LOCKED.
3. **1:30–2:30 — Manager review.** Switch to manager account, open team roll-up, sort by alignment %, click into the lowest-aligned IC's row → slide-over opens → review their plan, add a comment.
4. **2:30–3:30 — Reconciliation.** Switch back to IC, open the week's reconciliation view, mark commits done/partial/dropped, add one unplanned item, submit. State flips RECONCILED.
5. **3:30–4:00 — Carry-forward.** Open next week's plan → missed commits are pre-populated with the "carried over" badge.
6. **4:00–4:45 — Tests + quality gates.** Show `cypress run` going green, JaCoCo report at ≥80%, Vitest summary.
7. **4:45–5:00 — Wrap.** Sentence: "Built in one weekend, with AI doing the legwork at every stage logged in AI-USAGE-LOG.md. Module Federation-ready, RTK Query throughout, Auth0 JWT on the API surface."

---

## 9. AI usage approach (continuous, not a final retrofit)

`docs/AI-USAGE-LOG.md` gets a new entry **at every decision gate**, not at the
end. Each entry: AI tool/model, prompt summary, output summary, **human
judgment applied**. The "human judgment applied" line is what makes the log
credible — it shows where the human steered, not just where the AI generated.

For code-generation passes during build, the log records: (a) which agent or
skill we ran, (b) what came back, (c) what we kept vs. discarded vs. edited,
(d) any tests added to verify correctness. Code commits land with body text
that points to the relevant log entry.

---

## 10. Open questions for the gate (please redirect any of these)

1. **Auth0 for the demo — real tenant or mock JWT?** Recommendation: mock JWT with a documented swap path. Real Auth0 setup is 30 min if smooth and 3 hr if not, and the brief grades the *integration shape*, not whether you have a real Auth0 tenant. ✅ tentative: mock.
2. **Cypress E2E breadth — one happy-path feature, or three (happy / unlock / carry-forward)?** Recommendation: one feature, broad enough to exercise both IC and manager screens and the full state machine. The Cucumber/Gherkin *infra* is what the brief asks for; comprehensive coverage is not. ✅ tentative: one feature.
3. **Module Federation — actually wire it up to a host, or just structure the WC remote correctly and document the host pattern?** Recommendation: structure correctly, expose `remoteEntry.js`, but skip standing up a separate host app. The standalone `main.tsx` wrapper proves the structure works. ✅ tentative: structure-only, no separate host app.
4. **Chess layer in MUST or SHOULD?** Recommendation: **promote to MUST**. It's the highest-leverage differentiator vs. 15-Five and the brief mentions it explicitly. Implementation cost is low (one lookup table + one badge component). ✅ tentative: MUST.
5. **Seed-data scale for demo.** 1 manager + 5 ICs + 2 weeks of history feels right. More than that is noise; less than that hides the manager-dashboard value. ✅ tentative: that exact shape.
6. **Anything you want me to *cut* that I have in MUST?** This is the most useful redirect — if anything in §2 MUST feels like over-build, say so before we start Sunday.

---

## 11. Risks the plan deliberately accepts

- **Auth0 mocked, not real.** Mitigation: documented in README + log; the `SecurityConfig` already targets the real Auth0 issuer URI behind config.
- **No separate host app.** Mitigation: documented in README; `main.tsx` wrapper proves the remote loads standalone, which is also exactly how a host would consume it.
- **JaCoCo may report under 80%** if Sunday cuts force feature work over test work. Mitigation: log the honest number rather than gaming exclusions; the brief asks for "minimum 80%" but a credibly-scoped 70% beats a gamed 80%.
- **Subagent web tools were denied** during research. Mitigation: every research brief carries a caveat banner; framework facts (Spring Boot DSL, Flowbite API, Cypress versions) are stable enough that training-data through Jan 2026 is reliable. Live verification can happen during the Day-1 install (`npm install` will fail loudly if pins are wrong).
- **One human reviewer.** Mitigation: this PLAN.md is the gate. Pre-build approval here costs minutes; mid-build pivot costs hours.

---

## 12. Gate decisions (resolved 2026-05-30)

The user reviewed §10 and chose the higher-fidelity path on three calls,
adding ~5 hr to the original schedule. The plan absorbs these by cutting
explicitly below.

| Question | Tentative | Chosen | Δ hours |
| --- | --- | --- | --- |
| Auth0 | Mock JWT | **Real Auth0 tenant** (timeboxed) | +2 hr |
| MF host | Structure-only | **Stand up PA host app too** | +2 hr |
| Carry-forward / seed | Standard | **Promoted — multi-week storyline** | +1 hr |
| MUST scope edits | Plan is right | Plan is right (no MUST cut) | 0 |

### Cuts absorbed to keep Monday-morning deadline

These move from MUST/SHOULD into "if time permits at Sunday evening":

- **Drop admin RCDO CRUD screen** entirely (was SHOULD). The RCDO catalog is seeded once via `R__seed.sql` and treated as fixed for the demo. Saves ~1.5 hr.
- **Drop the `LOCKED → DRAFT` unlock path.** State machine documents it; implementation deferred. The brief lists it as a rare manager-only flow; the demo doesn't exercise it. Saves ~0.5 hr.
- **Narrow Vitest to 2 utility tests** (state-machine reducer + alignment-% util only). The 2 component tests get cut. Saves ~1 hr.
- **Defer ESLint 9 / Prettier 3.3 / Spotless / SpotBugs wiring** to Sunday-evening polish. Linters configured but not gate-enforced. Saves ~1 hr.
- **Skip dark-mode toggle.** Flowbite ships it free but we don't surface a toggle for the demo. Saves ~0.25 hr.

Total absorbed: ~4.25 hr. Net schedule delta vs. original plan: +0.75 hr. Tight but inside the buffer.

### Auth0 risk mitigation

- **Build `SecurityConfig` to accept BOTH a real Auth0 issuer URI AND a hardcoded RS256 public key**, switched by a single `application.yml` profile flag. Mock-JWT generator script committed to the repo so anyone can test without an Auth0 tenant.
- **Timebox Auth0 setup at 2 hours.** Hard stop. If JWT validation against the real tenant doesn't pass a curl smoke test by Saturday 18:00, switch the profile flag to mock and log it. Real tenant becomes a `/follow-up` task documented in README.
- Use Auth0's pre-built Universal Login redirect (no custom auth UI). Frontend uses `@auth0/auth0-react` for the IC/manager session.

### Revised build order (replaces §7)

**Saturday (~11 hr, 14:00–01:00 next day):**
- 0:30 Repo scaffold (monorepo with 3 apps: wc-frontend, wc-backend, pa-host)
- 1:30 Backend bootstrap (Spring init, entities, V1 migration, runs locally)
- 2:00 **Auth0 setup + dual-mode SecurityConfig + curl smoke test** (timeboxed)
- 1:00 Repositories + PlanController create/get-current/lock
- 1:30 Frontend bootstrap (wc-frontend: Vite + Tailwind + Flowbite + RTK + MF remote config + standalone main.tsx)
- 1:30 **PA host bootstrap** (apps/pa-host: Vite + MF host config + lazy import wc remote, runs on :5173)
- 2:00 My Weekly Plan screen (real BE wiring, outcome combobox, lock button)
- 1:00 Day-1 polish + commit

**Sunday (~13 hr, 09:00–22:00):**
- 2:30 Reconciliation screen
- 3:00 Manager dashboard (team roll-up table + Pageable)
- 1:30 Manager drill-over (Flowbite Drawer)
- 2:00 **Aggressive carry-forward + multi-week seed (1 mgr + 5 ICs + 3 weeks)**
- 2:00 Cypress + Cucumber setup + smoke feature green
- 1:00 Vitest (narrowed) + JaCoCo wired (honest %)
- 1:00 ARCHITECTURE.md + READMEs

**Monday (~3 hr, 06:00–09:00):**
- 1:00 Demo video (5 min)
- 0:45 AI-USAGE-LOG final pass
- 0:30 Submission package
- 0:45 Buffer
