---
date: 2026-05-31
updated: 2026-06-01
branch: main (synced with origin/main, gauntlet/main)
focus: P0 security surface-area analysis + 5-stash triage; produced PR #6 (startup guard) + PR #7 (keypair rotation)
status: PRs #6 and #7 open and mergeable; PR A2 (history scrub) deferred until both land; stashes dropped
companion: docs/handoffs/2026-05-31-p0-security-runbook.md (the executable runbook this analysis underpinned), docs/handoffs/2026-06-01-responsive-ui-audit.md (source of the P0 flags)
prior handoff: docs/handoffs/2026-06-01-responsive-ui-audit.md
---

# Handoff — P0 security analysis + stash triage

This session was scoped to "zero-collision work" while another chat ran
parallel UX + DB changes. The intent was read-only or doc-only, but it
ultimately produced two shippable PRs:

- **PR [#6](https://github.com/jdijols/Colign/pull/6)** — `feat(auth): refuse to start with mock JWT mode under prod-like profile` (closes P0-B).
- **PR [#7](https://github.com/jdijols/Colign/pull/7)** — `chore(security): rotate mock JWT keypair + gitignore private key` (closes P0-A1).

The third action — the git-history scrub (**PR A2**) — is intentionally
deferred. It requires a force-push to `main` that would detach PRs #6
and #7 (and any other unmerged work). Schedule it as a coordinated
window once both PRs land. Detailed step-by-step in
[2026-05-31-p0-security-runbook.md](2026-05-31-p0-security-runbook.md).

## What this session changed

- Wrote and committed [docs/handoffs/2026-05-31-p0-security-runbook.md](2026-05-31-p0-security-runbook.md) on `main` (via commit `5f7ab77`). The runbook covers both PR A1 (rotation) and PR A2 (history scrub) end-to-end. PR B's patch lives in [#6](https://github.com/jdijols/Colign/pull/6) — runbook references it.
- Opened **PR #6** on branch `feat/auth-startup-guard`: `SecurityConfig.java` guard + 10-case `SecurityConfigStartupGuardTest`. `./mvnw test` → 33/33 pass. Manual prod-profile smoke deferred to a real prod-like env (DataSource init runs before `SecurityConfig` `@Bean` methods, so the guard's stack trace is masked locally unless Postgres is up).
- Opened **PR #7** on branch `chore/rotate-mock-jwt-keypair`: new RSA 2048 keypair, public key committed, private key gitignored, `scripts/README.md` policy updated. Pair-correctness verified via `openssl rsa -pubout` diff; end-to-end mint-and-verify cycle proven.
- Dropped all 5 stashes flagged in the triage table below.
- Parallel chat shipped PRs #1–#5 during this session: responsive-audit, hero copy, settings shell, landing copy handoff, two-line grayscale hero.

## Stash triage findings

All five stashes from `git stash list` were inspected read-only and
subsequently dropped. Every one was a recovery breadcrumb whose content
already lived in committed work — preserved here as a record:

| Stash | Branch | What it had | Where it lives now |
|--|--|--|--|
| `@{0}` | feat/settings-shell-invite | `HostHome.tsx` hero copy (Strategy → Short-term commitments) | Merged via PR #2 (`94f73df`) into main |
| `@{1}` | feat/settings-shell-invite | `cypress.config.ts` Cucumber preprocessor + `e2e.ts` `import "./commands"` | Already present on the branch (commit `0e22b61`) |
| `@{2}` | responsive-audit | `audit-teardown.sh` adds `HOST_ENV` for pa-host | Merged via PR #1 (`9b070e7`) into main |
| `@{3}` | main | Untracked-only: two `.cy.ts` files + 7 failure screenshots | Both `.cy.ts` files committed via PR #1; screenshots are gitignored debris |
| `@{4}` | responsive-audit | `e2e.ts` testing-library import + `responsive-assertions.ts` regex fix | Fix is on disk at `responsive-assertions.ts:21` (PR #1) |

## P0 security surface area (verified — file paths + line numbers)

### P0-A — Leaked mock JWT signing key

**Key file:** `scripts/colign-mock-private.pem` (RSA 2048, 1704 bytes,
unencrypted, NOT gitignored — verified with `git check-ignore`).

**Public counterpart:** `apps/colign-backend/src/main/resources/keys/colign-mock-public.pem`.

**In-repo references to the filename** (grep verified):

- `apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:47-48, 125` — docstring + the line that loads the public key into the mock decoder.
- `apps/pa-host/src/architecture/pages/AuthPage.tsx:79` — explanatory text only, no code change needed for rotation.
- `docs/AI-USAGE-LOG.md:90` — historical log.
- `docs/AUTH0_SETUP.md:4` — doc.
- `docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md:414` — the spec line that surfaced the P0.
- `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md:150` — the results doc that mentions the P0.
- `scripts/README.md:7, 9, 25, 38-39` — keygen instructions (already accurate, no change needed).
- `scripts/mock-jwt.mjs:6-7, 25` — reads the private key to mint demo JWTs.

**Git history:** first commit touching the pem under its current name is `ab74dd6` (the `wc → colign` rename). Per `--follow`, that's where the rename surfaces; the key may have lived as `scripts/wc-mock-private.pem` earlier. A history scrub needs to enumerate every historical path: `git log --all --diff-filter=A --name-only --pretty=format: -- '*-mock-private.pem' | sort -u`.

**Remotes that need force-push after a scrub:** `origin` (jdijols/Colign), `gauntlet`. Both currently in sync.

**Important caveat from the analysis:** the rotation is the real fix. Scrubbing history alone doesn't help — the old key is in GitHub Archive Program, BigQuery, third-party caches, and any fork. Rotation invalidates the old key against the live stack; scrubbing prevents fresh clones from re-leaking it.

**Blast radius for the force-push:** at the time of analysis, `feat/settings-shell-invite` was 28 commits ahead of stale local main. It has since been merged via PR #3. As of this handoff there are no obviously divergent unmerged branches, but verify before scrubbing.

### P0-B — Backend boots mock by default

**Where:** `apps/colign-backend/src/main/resources/application.yml:34` — `mode: ${COLIGN_AUTH_MODE:mock}`. Defaults to `mock` when env var is unset.

**Active profile resolution:** `apps/colign-backend/src/main/resources/application.yml:5` — `active: ${SPRING_PROFILES_ACTIVE:local}`. Production is activated via `apps/colign-backend/fly.toml:16` (`SPRING_PROFILES_ACTIVE = "prod"`).

**Where to add the guard:** `apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:99-112` — the `jwtDecoder()` `@Bean` method already centralises mode resolution. Throwing at the top fails Spring context refresh, which fails app startup with a loud stack trace.

**Recommended patch (drop in at line 99, replacing the existing method):**

```java
@Bean
JwtDecoder jwtDecoder(
        @Value("${colign.auth.mode}") String mode,
        @Value("${colign.auth.audience}") String audience,
        @Value("${colign.auth.real.issuer-uri:#{null}}") String issuerUri,
        @Value("${colign.auth.real.jwk-set-uri:#{null}}") String jwkSetUri,
        org.springframework.core.env.Environment env,
        ResourceLoader resourceLoader) throws Exception {

    String normalized = mode == null ? "" : mode.toLowerCase();

    if ("mock".equals(normalized) && isProdLikeProfile(env)) {
        throw new IllegalStateException(
            "REFUSING TO START: colign.auth.mode=mock under active profile(s) "
                + java.util.Arrays.toString(env.getActiveProfiles())
                + ". Mock auth accepts any JWT signed by the demo key in "
                + "scripts/colign-mock-private.pem. Set COLIGN_AUTH_MODE=real "
                + "(with COLIGN_AUTH0_ISSUER + COLIGN_AUTH0_JWKS) before booting.");
    }

    return switch (normalized) {
        case "real" -> buildRealDecoder(issuerUri, audience);
        case "mock" -> buildMockDecoder(resourceLoader, audience);
        default -> throw new IllegalStateException(
                "colign.auth.mode must be 'real' or 'mock' (got: " + mode + ")");
    };
}

private static boolean isProdLikeProfile(org.springframework.core.env.Environment env) {
    for (String p : env.getActiveProfiles()) {
        String t = p.toLowerCase();
        if (t.equals("prod") || t.equals("production")
                || t.equals("staging") || t.equals("stage")) {
            return true;
        }
    }
    return false;
}
```

**Why this shape:**

- `Environment.getActiveProfiles()` correctly merges `SPRING_PROFILES_ACTIVE` + `spring.profiles.include` and tolerates comma-separated lists.
- Throwing inside the `@Bean` method (vs `@PostConstruct` on a separate component) fails Spring's context refresh immediately — the error surfaces at `SpringApplication.run()`, before any handler binds.
- Mode normalization handles `MOCK` / `Mock` / `mock` consistently.
- The exception message names the env vars to set, so an oncall reading the Fly log knows the fix without grep.

**Test plan:** new file `apps/colign-backend/src/test/java/com/colign/config/security/SecurityConfigStartupGuardTest.java` with three cases:

1. `prod` profile + `mock` mode → `SpringApplicationBuilder.run()` throws `IllegalStateException` whose root-cause message contains `REFUSING TO START`.
2. `staging` profile + `mock` mode → same.
3. `local` profile + `mock` mode → context loads cleanly. Existing `application-test.yml` already exercises this implicitly; an explicit smoke test pins it.

**Existing context that confirms the guard won't false-positive:** `application-test.yml` runs with `mode: mock` + profile `test` — the guard's prod-like list (`prod`, `production`, `staging`, `stage`) doesn't include `test`, so existing tests stay green.

**Collision risk:** at session time, no commits to `SecurityConfig.java` in 3 days. The parallel chat was on workspace mgmt + frontend; backend DB changes the user mentioned are on different files. Verify recency before opening PR B: `git log --since="3 days ago" -- apps/colign-backend/src/main/java/com/colign/config/security/`.

## Remaining steps

1. **Merge PRs #6 and #7.** Both mergeable. Order doesn't matter — they touch disjoint files (#6 = `SecurityConfig.java` + test; #7 = `colign-mock-public.pem` + `.gitignore` + `scripts/README.md`). Fly + Vercel auto-deploy on each merge. After #7 deploys, the old leaked private key is invalidated against the live stack — that's the actual security win.
2. **After both #6 and #7 merge: execute PR A2** (git-history scrub). Use the runbook section "PR A → Step 5" verbatim. The blast radius is now bounded — no other unmerged work remains beyond #6 and #7 themselves. Pre-flight: confirm no new branches have appeared since this handoff was written.
3. **Post-merge dev-workflow update for everyone:** after pulling, run the `openssl genrsa` block from `scripts/README.md` to generate a fresh local private key. Any token minted with the pre-rotation private key is rejected against the deployed backend.
4. **Optional follow-up PR:** the `wc.auth.*` strings that the wc→colign rename missed — `SecurityConfig.java` lines 40, 44, 117, 146. Cosmetic; no behavioral impact.

## State at handoff (end of 2026-06-01 session)

- Branch: `main`. Tree clean. Up to date with `origin/main` and `gauntlet/main`.
- HEAD: `394e1be docs(handoff): preserve P0 security surface-area analysis from parallel chat`.
- Local branches kept (PRs open): `feat/auth-startup-guard` (PR #6), `chore/rotate-mock-jwt-keypair` (PR #7).
- Stashes: empty.
- TODOS.md: 47 lines, untouched (user reverted the security entry; covered by the runbook on disk instead).
- No production changes yet — both PRs await review + merge.

## Suggested skills for the next agent

- **`/context-restore`** — loads the most recent saved checkpoint. Confirms the security-flags provenance and the PR ordering.
- **`/code-review`** or **`/codex review`** — second opinion on PRs #6 and #7 before merging. PR #6's prod-profile detection is the kind of predicate where a missing variant (`prod-eu`, `prd`) silently fails open; worth a fresh pair of eyes.
- **`/careful`** — turn on before executing **PR A2** (history scrub). Touches `git filter-repo` + force-push to both remotes.
- **`/cso`** — STRIDE/OWASP pass over the broader auth surface if the user wants a wider sweep beyond the two P0 items.

Do NOT pre-emptively use `/autoplan` or `/spec` on these — the runbook is the spec, PR #6 and PR #7 are the deliverables, the only remaining work is review + merge + A2.

## References

- [docs/handoffs/2026-05-31-p0-security-runbook.md](2026-05-31-p0-security-runbook.md) — executable runbook for PR A1 + A2 + PR B.
- [docs/handoffs/2026-06-01-responsive-ui-audit.md](2026-06-01-responsive-ui-audit.md) — source of the P0 flags.
- [docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md:414](../superpowers/specs/2026-05-31-responsive-ui-audit-design.md) — spec line surfacing P0-A.
- [docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md:150](../superpowers/specs/2026-05-31-responsive-ui-audit-results.md) — results doc P0-A entry.
- [apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:99](../../apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java) — patch site for PR B (delivered as PR #6).
- [apps/colign-backend/src/main/resources/application.yml:34](../../apps/colign-backend/src/main/resources/application.yml) — the unsafe default that PR #6 closes.
- PR [#6](https://github.com/jdijols/Colign/pull/6) — startup guard.
- PR [#7](https://github.com/jdijols/Colign/pull/7) — keypair rotation.
