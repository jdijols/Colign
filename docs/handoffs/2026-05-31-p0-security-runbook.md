---
date: 2026-05-31
branch: feat/settings-shell-invite (drafted from)
focus: runbook for the two P0 security flags surfaced by the responsive-audit; not executed
status: draft — both PRs blocked on parallel-chat work landing first; PR B is mergeable as soon as the working tree is clean, PR A requires coordinated force-push
companion: docs/handoffs/2026-06-01-responsive-ui-audit.md (source of the P0 flags)
prior handoff: docs/handoffs/2026-06-01-responsive-ui-audit.md
---

# Runbook — P0 security flags from responsive-audit

Two P0 items were surfaced as deferred follow-ups in the responsive-audit
handoff ([docs/handoffs/2026-06-01-responsive-ui-audit.md:46](2026-06-01-responsive-ui-audit.md)):

- **P0-A:** `scripts/colign-mock-private.pem` is committed to the public
  repo. Anyone can mint JWTs accepted by any backend running in mock mode.
- **P0-B:** Backend `application.yml` defaults `colign.auth.mode` to `mock`
  when the env var is unset. A `prod`-profile boot with the env var
  accidentally unset would silently accept demo-signed JWTs.

This doc breaks each into a PR-shaped plan with pre-flight, patch, verify,
rollback. **Nothing here has been executed.** PR B can ship cleanly today;
PR A is blocked on coordination because the history scrub force-pushes
main.

---

## Ordering, blockers, and why now

| | PR A — rotate pem + scrub history | PR B — backend mock-mode startup guard |
|--|--|--|
| Touches | `scripts/`, `apps/colign-backend/src/main/resources/keys/`, `.gitignore`, then a global force-push to `origin` + `gauntlet` | One file: `SecurityConfig.java`. One test file. |
| Collision risk with parallel chat | **HIGH** — force-push to main detaches every unmerged branch. `feat/settings-shell-invite` is currently 28 commits ahead of stale local main. | **LOW** — no commits to `SecurityConfig.java` in the last 3 days; parallel chat is on workspace mgmt + frontend UX. |
| Blocked on | (1) Parallel chat lands `feat/settings-shell-invite`. (2) Stash list cleared. (3) `copy/hero-commitments-alignment` decision (merge or drop). (4) Pre-announce to anyone with a clone. | (1) Clean working tree before opening the PR. Otherwise unblocked. |
| Real fix or hygiene? | **Real fix is the rotation.** The old key is already in GitHub Archive Program, BigQuery, third-party caches, and any fork. Scrubbing history prevents *future* leaks; it does not retract the key. Rotation invalidates the old key everywhere. | Real fix. Closes the silent-mock-in-prod failure mode. |
| Effort | ~2 hours (key gen + replace + verify) + ~30 min (filter-repo + force-push + comms) | ~30 min (patch + test) |

**Recommended sequencing:**

1. Land PR B as a normal small PR off current main. No coordination needed.
2. After parallel chat's branch lands and `copy/hero-commitments-alignment` is resolved, execute PR A. Schedule a 30-min window, announce to anyone with a clone, run filter-repo, force-push, ask everyone to re-clone or hard-reset.

---

## Pre-flight blockers (current state, 2026-05-31)

These must be true before either PR opens. Status as of this snapshot:

- [ ] **Working tree clean.** Currently NOT clean:
      `apps/colign-frontend/src/WeeklyCommitApp.tsx` modified plus untracked
      `WorkspaceSettingsPage.tsx` + test. This is parallel-chat WIP, not
      ours. PR B requires a clean tree on a different branch; PR A requires
      a clean tree everywhere.
- [ ] **All 5 stashes triaged.** Done as of this runbook: all 5 are
      recovery breadcrumbs whose content is already in committed work. Safe
      to `git stash drop` on all 5 after a final user check. See "Stash
      audit" section below.
- [ ] **`copy/hero-commitments-alignment` resolved.** Commit `94f73df`
      (new hero copy) is on this branch and on `origin` but NOT merged to
      main. Either merge it (PR) or `git branch -D`. **Required for
      PR A** because the force-push will leave it dangling.
- [ ] **Local main fetched.** Local `main` is 22 commits behind
      `origin/main`. Run `git fetch --all && git checkout main && git reset --hard origin/main` before touching either PR.
- [ ] **Both remotes accounted for.** `origin` (jdijols/Colign) and
      `gauntlet`. Force-push must hit both, in sync.
- [ ] **Pre-announce.** Anyone with a local clone (the parallel chat,
      any other agent, any teammate) needs to know a force-push is coming.

---

## Stash audit — feeds the pre-flight

All five entries from `git stash list` were inspected read-only and
cross-referenced against committed work. Summary:

| Stash | Branch | Content | Status |
|--|--|--|--|
| `@{0}` | feat/settings-shell-invite | `HostHome.tsx` hero copy (Strategy → Short-term commitments) | **Redundant — committed as `94f73df` on branch `copy/hero-commitments-alignment` + pushed to origin.** Drop. |
| `@{1}` | feat/settings-shell-invite | `cypress.config.ts` Cucumber preprocessor + e2e.ts `import "./commands"` | **Redundant — already present on `feat/settings-shell-invite` (commit `0e22b61`).** Drop. |
| `@{2}` | responsive-audit | `audit-teardown.sh` adds `HOST_ENV` for pa-host | **Redundant — already merged to main via PR #1 (responsive-audit).** Drop. |
| `@{3}` | main | Untracked-only: `responsive-narrow.cy.ts`, `responsive-wide.cy.ts`, 7 failure screenshots | **Redundant — both `.cy.ts` files exist in `apps/colign-frontend/cypress/e2e/` (PR #1).** Screenshots are gitignored debris. Drop. |
| `@{4}` | responsive-audit | `e2e.ts` testing-library import + `responsive-assertions.ts` regex fix | **Redundant — regex fix is on disk at `responsive-assertions.ts:21` (PR #1).** Drop. |

**Recommended single command (after user confirms):**

```sh
for i in 4 3 2 1 0; do git stash drop "stash@{$i}"; done
```

(Drop from highest index down so the indices stay stable mid-loop.)

---

## PR A — Rotate the mock JWT key + scrub history

**Goal:** invalidate the leaked private key everywhere by generating a new
one and deploying it; scrub git history so the old key isn't re-leaked
to fresh clones.

### Surface area (verified read-only)

- `scripts/colign-mock-private.pem` — the leaked key (1704 bytes, RSA 2048)
- `apps/colign-backend/src/main/resources/keys/colign-mock-public.pem` —
  paired public key, loaded by [SecurityConfig.java:125](apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:125)
- `scripts/mock-jwt.mjs` — reads the private key to mint demo JWTs
- `scripts/README.md` — documents the keygen invocation (already accurate)
- `apps/pa-host/src/architecture/pages/AuthPage.tsx:79` — explanatory text,
  no code change needed
- `docs/AUTH0_SETUP.md`, `docs/AI-USAGE-LOG.md` — historical references,
  no change

The pem first entered the repo before the `wc → colign` rename
(commit `ab74dd6`). The filter-repo invocation needs to scrub both the
current path AND the pre-rename path. **Action item: before running
filter-repo, run `git log --all --diff-filter=A --name-only --pretty=format: -- '*-mock-private.pem' | sort -u` to enumerate every historical path the key has lived at.**

### Plan

**Step 1 — generate new keypair, gitignore the private side**

```sh
# From repo root
openssl genrsa -out scripts/colign-mock-private.pem 2048
openssl rsa -in scripts/colign-mock-private.pem -pubout \
    -out apps/colign-backend/src/main/resources/keys/colign-mock-public.pem
chmod 600 scripts/colign-mock-private.pem

# Make sure the private key never enters another commit
echo 'scripts/colign-mock-private.pem' >> .gitignore
```

**Step 2 — ship a `.example` private key so onboarding still works**

The current onboarding instructions in `scripts/README.md` say "the
private key is committed deliberately." After rotation that's no longer
true. Two options:

- A) Drop the committed private key entirely; document the openssl
     command in `scripts/README.md`. Demo users regenerate locally.
- B) Ship `scripts/colign-mock-private.example.pem` with a clearly-marked
     throwaway key, keep `colign-mock-private.pem` gitignored, document
     a one-line `cp` step.

Recommend (A) — fewer moving parts and forces fresh demo users to think
about the key once.

**Step 3 — verify backend boots and minting still works**

```sh
# In one shell — boot backend with mock mode
cd apps/colign-backend
SPRING_PROFILES_ACTIVE=h2 COLIGN_AUTH_MODE=mock ./mvnw spring-boot:run

# In another — mint a token, hit a protected endpoint
node scripts/mock-jwt.mjs --email demo@colign.dev --role IC > /tmp/jwt
curl -H "Authorization: Bearer $(cat /tmp/jwt)" http://localhost:8080/api/v1/me
# Expect 200 with the demo user payload, NOT 401.
```

**Step 4 — open PR A as a normal PR** (NOT yet force-pushing history)

Commits:
1. `chore(security): rotate mock JWT keypair`
2. `chore(security): gitignore mock private key`
3. `docs: update scripts/README.md keygen instructions`

Merge normally. **Once merged, the old key still works against any deploy
running the old public key** — that's fine because we haven't deployed
yet. Trigger the Fly/Vercel deploy after merge; backends + frontends
both pick up the new public key, and the old private key becomes
useless against the live stack.

**Step 5 — scrub history (AFTER PR A merged + parallel work landed)**

```sh
# Install if needed:  brew install git-filter-repo

# Backup first, this is destructive:
git clone --mirror . /tmp/colign-prescrub-backup.git

# Enumerate every path the key has lived at, write into a file:
git log --all --diff-filter=A --name-only --pretty=format: \
    -- '*-mock-private.pem' | sort -u > /tmp/pem-paths.txt
cat /tmp/pem-paths.txt
# Expect at minimum: scripts/colign-mock-private.pem
# Possibly also: scripts/wc-mock-private.pem (pre-rename)

# Run filter-repo against each historical path:
git filter-repo --force \
    --path scripts/colign-mock-private.pem --invert-paths
# Repeat for any other historical paths surfaced above.
```

**Step 6 — force-push both remotes**

```sh
git push --force origin --all
git push --force origin --tags
git push --force gauntlet --all
git push --force gauntlet --tags
```

**Step 7 — comms**

- Tell every active clone holder (parallel chat, teammates) to either
  re-clone or `git fetch origin && git reset --hard origin/<branch>`
- GitHub PR comment + `gh secret list` audit for any CI secret derived
  from the old key
- Note: GitHub Archive Program + GH BigQuery + any fork still has the
  old key. **The rotation in Step 1 is what protects you; the scrub is
  hygiene.**

### Verification

- [ ] `git log --all -- scripts/colign-mock-private.pem` returns empty
- [ ] `git log --all -- scripts/wc-mock-private.pem` returns empty
      (if it ever existed)
- [ ] Old `mock-jwt.mjs` signed token returns 401 against the rotated
      backend
- [ ] New token (signed with the new private key) returns 200
- [ ] `.gitignore` includes `scripts/colign-mock-private.pem`
- [ ] Fly + Vercel deploys triggered, both green

### Rollback

If anything goes sideways:

```sh
# Restore from the prescrub backup
cd /tmp/colign-prescrub-backup.git
git push --force origin --mirror
git push --force gauntlet --mirror
```

The old (compromised) private key is back, but that's the same level of
exposure you had before — net neutral while you regroup.

---

## PR B — Backend mock-mode startup guard

**Goal:** refuse to start the backend if `colign.auth.mode=mock` (or the
default falls through to mock) AND an active Spring profile is
`prod`/`production`/`staging`/`stage`.

### Surface area (verified read-only)

- One source file: [apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:99-112](apps/colign-backend/src/main/java/com/colign/config/security/SecurityConfig.java:99)
  — the `jwtDecoder()` `@Bean` method already centralises mode
  resolution. Adding the guard at the top of that method means the
  bean refuses to build, which means the Spring context fails to
  refresh, which means the app refuses to start with a loud stack
  trace. Clean and minimal.
- One test file: `apps/colign-backend/src/test/java/com/colign/config/security/SecurityConfigStartupGuardTest.java` (new)
- `application-prod.yml` — no change needed; the guard reads
  `Environment.getActiveProfiles()` at construction time.

### Patch

Add `Environment` to the bean signature, run the guard, then existing
switch unchanged:

```java
// SecurityConfig.java — replace the existing jwtDecoder @Bean method

@Bean
JwtDecoder jwtDecoder(
        @Value("${colign.auth.mode}") String mode,
        @Value("${colign.auth.audience}") String audience,
        @Value("${colign.auth.real.issuer-uri:#{null}}") String issuerUri,
        @Value("${colign.auth.real.jwk-set-uri:#{null}}") String jwkSetUri,
        org.springframework.core.env.Environment env,
        ResourceLoader resourceLoader) throws Exception {

    String normalized = mode == null ? "" : mode.toLowerCase();

    // P0 guard: never accept demo-signed JWTs under a prod-like profile.
    // application.yml defaults colign.auth.mode to "mock" when the env var
    // is unset, so a prod deploy that forgets COLIGN_AUTH_MODE=real would
    // silently accept any token signed by scripts/colign-mock-private.pem.
    // Refusing to build the bean fails the context refresh — the app
    // cannot start, instead of starting in a vulnerable state.
    if ("mock".equals(normalized) && isProdLikeProfile(env)) {
        throw new IllegalStateException(
            "REFUSING TO START: colign.auth.mode=mock under active profile(s) "
                + java.util.Arrays.toString(env.getActiveProfiles())
                + ". Mock auth accepts any JWT signed by the demo key in "
                + "scripts/colign-mock-private.pem. Set COLIGN_AUTH_MODE=real "
                + "(with COLIGN_AUTH0_ISSUER + COLIGN_AUTH0_JWKS) before booting "
                + "this profile.");
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

Why this shape:

- `Environment.getActiveProfiles()` correctly merges
  `SPRING_PROFILES_ACTIVE` + `spring.profiles.include` and tolerates
  comma-separated lists. Cleaner than parsing `@Value("${spring.profiles.active}")` ourselves.
- Throwing inside the `@Bean` method (vs `@PostConstruct` on a separate
  component) means Spring's context refresh fails immediately. The
  error surfaces at `SpringApplication.run()` startup, before any
  request handler binds.
- Mode normalization handles `MOCK` / `Mock` / `mock` consistently.
- The exception message names the env vars to set, so an oncall reading
  the Fly log knows the fix without grep.

### Test plan

Three new tests in `SecurityConfigStartupGuardTest`:

```java
package com.colign.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityConfigStartupGuardTest {

    @Test
    void prodProfileWithMockModeFailsToStart() {
        assertThatThrownBy(() -> new org.springframework.boot.SpringApplicationBuilder(
                ColignBackendApplication.class)
                .properties("spring.profiles.active=prod",
                            "colign.auth.mode=mock",
                            // satisfy CORS bean
                            "colign.cors.allowed-origins=https://colign.org")
                .run())
            .hasRootCauseInstanceOf(IllegalStateException.class)
            .hasRootCauseMessage(message -> message.contains("REFUSING TO START")
                && message.contains("colign.auth.mode=mock"));
    }

    @Test
    void stagingProfileWithMockModeFailsToStart() {
        // Same shape, profile=staging — confirms the prod-like list catches it.
    }

    @Test
    void localProfileWithMockModeStartsFine() {
        // Existing @SpringBootTest harness already exercises this path.
        // Add an explicit smoke test confirming context loads under
        // profile=local + mode=mock.
    }
}
```

Existing `application-test.yml` already runs with `mode=mock` + profile
`test` — that confirms the guard doesn't false-positive against the test
profile. Verify with `./mvnw test` after the change.

### Verification

- [ ] `./mvnw test` green (existing tests still pass)
- [ ] New `SecurityConfigStartupGuardTest` all green
- [ ] Manual: `SPRING_PROFILES_ACTIVE=prod COLIGN_AUTH_MODE=mock ./mvnw spring-boot:run` produces a startup failure with the exact message text from the patch
- [ ] Manual: `SPRING_PROFILES_ACTIVE=prod COLIGN_AUTH_MODE=real COLIGN_AUTH0_ISSUER=... ./mvnw spring-boot:run` starts cleanly (or at least fails for a different reason — config completeness, not the guard)
- [ ] Fly preview deploy: set `COLIGN_AUTH_MODE=mock` in `fly.toml` `[env]` temporarily, deploy → expect boot failure. Revert.

### Rollback

Pure revert of one file + delete one test file. Zero data impact. No
schema, no migration.

---

## What gets added to TODOS.md

A new section pointing to this runbook so the parking lot reflects
current high-priority deferred work. See companion edit to
[TODOS.md](../../TODOS.md).

---

## Open questions for the user before executing

1. **PR A timing.** When does the parallel chat expect to land
   `feat/settings-shell-invite`? PR A's force-push needs that
   branch (or any branch with unpushed local commits) to be merged
   or pushed first, otherwise the rebase pain is high.
2. **`copy/hero-commitments-alignment` disposition.** Merge it into
   main as a normal small PR before the scrub, or drop the branch?
3. **`scripts/colign-mock-private.pem` post-rotation policy.** Stay
   gitignored with a documented `openssl genrsa` invocation
   (recommended), or commit a `.example.pem` placeholder for
   one-line setup?
4. **Audit results doc external sharing.** The responsive-audit
   results doc names the leaked key path. Is that doc already
   shared externally, or is it still internal? Affects urgency of
   PR A.
