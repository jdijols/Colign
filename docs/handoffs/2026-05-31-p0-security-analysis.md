---
date: 2026-05-31
branch: main (synced with origin/main, gauntlet/main)
focus: P0 security surface-area analysis + 5-stash triage; runbook was committed then dropped by user (intentional)
status: research complete; no code shipped; findings preserved here so PR B can be picked up cold next session
companion: docs/handoffs/2026-06-01-responsive-ui-audit.md (source of the P0 flags)
prior handoff: docs/handoffs/2026-06-01-responsive-ui-audit.md
---

# Handoff — P0 security analysis + stash triage

This session was scoped to "zero-collision work" while another chat ran
parallel UX + DB changes. Did three things, all read-only or doc-only:
stash triage, P0 security surface-area mapping, and a runbook draft. The
runbook landed as commit `0937d8a` then the user dropped it (the file
no longer exists in `main`; `TODOS.md` reverted). Findings preserved
below verbatim so a future agent doesn't have to redo the investigation.

The two P0 security flags themselves still exist as flagged in
[docs/handoffs/2026-06-01-responsive-ui-audit.md:46](../../docs/handoffs/2026-06-01-responsive-ui-audit.md).
Nothing in production changed.

## What this session changed (effectively: nothing)

- Wrote and committed a runbook + a TODOS.md "Security — P0" entry as
  commit `0937d8a` on `feat/settings-shell-invite`.
- User then merged feat → main via PR #3 (`92828b0`), which dropped that
  commit. Working tree on main is clean as of this handoff. Treat
  `0937d8a` as intentionally discarded.
- The parallel chat shipped UX work in PRs #1, #2, #3 during this
  session (responsive-audit, hero copy, settings shell).

## Stash triage findings

All five stashes from `git stash list` were inspected read-only. Every
one is a recovery breadcrumb whose content is already in committed
work. Safe to drop with `for i in 4 3 2 1 0; do git stash drop "stash@{$i}"; done`. None executed this session.

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

## Recommended next steps

In order of safety + value:

1. **Drop the 5 stashes.** Single command: `for i in 4 3 2 1 0; do git stash drop "stash@{$i}"; done`. Confirmed safe by the triage table above.
2. **Ship PR B (startup guard).** Small, isolated, one Java file + one test file. Mergeable today off current main. Patch + test plan are above; execute as-is or use the runbook commit `0937d8a` from reflog (`git show 0937d8a:docs/handoffs/2026-05-31-p0-security-runbook.md`) if you want the full version.
3. **Defer PR A (pem rotation + history scrub).** Schedule for a 30-min window when no unmerged branches exist. Recover the runbook from `0937d8a` via reflog before doing this — the step-by-step is detailed there.
4. **Decide what to do with the dropped runbook commit `0937d8a`.** Still in reflog (`git reflog` should show it). Three options: leave it dropped (current state), cherry-pick the runbook file only back onto main, or rewrite the runbook fresh.

## State at handoff

- Branch: `main`. Tree clean. Up to date with `origin/main` and `gauntlet/main`.
- HEAD: `92828b0 feat(settings): in-app workspace-settings route with invite entry (#3)`.
- Three PRs merged this session by the parallel chat: #1 (responsive-audit), #2 (hero copy), #3 (settings shell).
- TODOS.md: 47 lines, unchanged from start of session (user reverted my edit).
- Runbook file `docs/handoffs/2026-05-31-p0-security-runbook.md`: does not exist on main; lives only in the dropped commit `0937d8a` (still in reflog).
- 5 stashes still in `git stash list`. Not dropped.
- No production changes.

## Suggested skills for the next agent

- **`/context-restore`** — loads the most recent saved checkpoint (`20260531-232820-responsive-ui-audit-shipped-to-prod.md`). Confirms the parallel-chat picture and the security flags' provenance.
- **`/careful`** — turn on before any work touching `git filter-repo`, `git reset --hard`, or force-push (i.e. PR A).
- **`/codex review`** or **`/code-review`** — second opinion on the PR B Java patch before opening the PR; the prod-profile detection is the kind of thing where a wrong predicate (missing `prod-eu` etc.) silently fails open.
- **`/cso`** — if the user wants a STRIDE/OWASP pass over the broader auth surface before shipping PR A.
- **`/ship`** — once PR B is built, to push + open the PR with the right base branch and a clean message.

Do NOT pre-emptively use `/autoplan` or `/spec` on these — they're small mechanical fixes, not new features.

## References

- [docs/handoffs/2026-06-01-responsive-ui-audit.md](../../docs/handoffs/2026-06-01-responsive-ui-audit.md) — source of the P0 flags.
- [docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md:414](../../docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md) — spec line surfacing P0-A.
- [docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md:150](../../docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md) — results doc P0-A entry.
- [apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:99](../../apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java) — patch site for PR B.
- [apps/colign-backend/src/main/resources/application.yml:34](../../apps/colign-backend/src/main/resources/application.yml) — the unsafe default that PR B closes.
- Dropped commit `0937d8a` — still in reflog, contains the full runbook.
