# Responsive UI Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the responsiveness contract from the design spec across `apps/colign-frontend` + `apps/pa-host`, audit and fix 9 user-facing screens at 5 viewport widths × 2 color modes, and add a CI regression layer so future PRs can't drift.

**Architecture:** Phase A lands the foundation contract (Tailwind tokens + touch policy CSS + component size bumps). Phase B adds tooling — env teardown + Vite middleware hardening. Phase C audits screens in user-journey order, with the heavier refactors (TeamRollupTable card view, IcDrillDrawer full-screen on coarse+narrow) folded into their screen tasks. Phase D scaffolds Cypress (no config exists today), authors two regression specs, and finalizes the results doc. Backend changes and the committed-mock-key rotation are deferred per spec §9.4.

**Tech Stack:** React 18 + Vite 5 + Tailwind 3 + Flowbite-react (colign-frontend); Vite 5 + plain CSS (pa-host); Vitest + Testing Library (unit); Cypress 13 (E2E); gstack `/browse` skill (screenshots).

**Source spec:** [docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md](../specs/2026-05-31-responsive-ui-audit-design.md)

**Revision note (2026-05-31, r2):** plan revised in response to 5-persona ce-doc-review findings. Dropped A2 (CSS custom properties with zero consumers — same anti-pattern the spec rejected for pa-host). Simplified A5 (Drawer primitive stays untouched; full-screen logic moves inside IcDrillDrawer). Fixed Drawer prop name (`width`, not `size`) and icon import (`HiX`, not `HiOutlineX`). Replaced JS hook with CSS `@media` for drawer full-screen. Switched Cypress preflight from blocklist to allowlist regex. Added explicit `trap` registration step + JWT TTL bump to 14400. Fixed `audit-teardown.sh` env-file logic to append-or-replace (current backend `.env.local` has no `COLIGN_AUTH_MODE` line, so the old `sed` would silently no-op). Added D0 Cypress scaffold task (no config exists today). Removed leftover `@[640px]:` Tailwind variants in C8 (no plugin installed). Fixed `Button variant="outline"` → `variant="secondary"` in C8. Added Phase B Vite middleware shell-injection fix before Phase C actively exercises the surface. Restated spec §4.2 asymmetry in C1 (touch policy doesn't reach pa-host; HostHome is in scope but already compliant).

---

## Phase A — Foundation contract

### Task A1: Add fluid type + spacing tokens to Tailwind config

**Files:**
- Modify: `apps/colign-frontend/tailwind.config.js`
- Create: `apps/colign-frontend/src/lib/tokens.test.ts`

- [ ] **Step 1: Write failing test** — `apps/colign-frontend/src/lib/tokens.test.ts`

```ts
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config.js";

describe("Tailwind fluid token contract (spec §4.2)", () => {
  it("exposes the fluid type scale", () => {
    const fontSize = tailwindConfig.theme.extend.fontSize as Record<string, string>;
    expect(fontSize["fluid-sm"]).toBe("clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)");
    expect(fontSize["fluid-base"]).toBe("clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)");
    expect(fontSize["fluid-lg"]).toBe("clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)");
    expect(fontSize["fluid-xl"]).toBe("clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)");
    expect(fontSize["fluid-2xl"]).toBe("clamp(1.5rem, 1.36rem + 0.71vw, 2rem)");
    expect(fontSize["fluid-3xl"]).toBe("clamp(1.875rem, 1.55rem + 1.61vw, 3rem)");
  });
  it("exposes section-fluid spacing", () => {
    const spacing = tailwindConfig.theme.extend.spacing as Record<string, string>;
    expect(spacing["section-fluid"]).toBe("clamp(1.5rem, 1.0rem + 2.5vw, 4rem)");
  });
});
```

- [ ] **Step 2: Verify it fails** — `cd apps/colign-frontend && yarn vitest run src/lib/tokens.test.ts` → FAIL.

- [ ] **Step 3: Add tokens to `tailwind.config.js`** — extend `theme.extend`:

```js
fontSize: {
  "fluid-sm": "clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)",
  "fluid-base": "clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)",
  "fluid-lg": "clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)",
  "fluid-xl": "clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)",
  "fluid-2xl": "clamp(1.5rem, 1.36rem + 0.71vw, 2rem)",
  "fluid-3xl": "clamp(1.875rem, 1.55rem + 1.61vw, 3rem)",
},
spacing: {
  "section-fluid": "clamp(1.5rem, 1.0rem + 2.5vw, 4rem)",
},
```

- [ ] **Step 4: Verify it passes** — `yarn vitest run src/lib/tokens.test.ts` → PASS.

- [ ] **Step 5: Rebuild CSS + verify on disk** — `yarn build:css` then `grep -c "fluid-base" src/colign-compiled.css` → ≥ 1 (per dev-runbook gotcha #1).

- [ ] **Step 6: Commit**

```bash
git add apps/colign-frontend/tailwind.config.js \
        apps/colign-frontend/src/lib/tokens.test.ts \
        apps/colign-frontend/src/colign-compiled.css
git commit -m "feat(responsive): add fluid type + spacing tokens per spec §4.2"
```

---

### Task A2: Create the touch & pointer policy stylesheet

(Note: prior r1 had a "mirror tokens as :root CSS custom properties" task here — dropped in r2. The properties had zero current consumers and would have repeated the same sync-tax anti-pattern the spec rejected for pa-host. If a non-Tailwind context ever needs a fluid value, add the custom property at that point with a concrete consumer.)

**Files:**
- Create: `apps/colign-frontend/src/responsive.css`
- Modify: `apps/colign-frontend/src/main.tsx`

**Scope reminder:** this stylesheet is scoped to `#colign-root` to match the specificity of Tailwind utilities under `important: "#colign-root"`. It DOES NOT reach `pa-host` (which mounts under `#pa-root` and has no Tailwind). Per spec §4.2, that asymmetry is intentional — HostHome already meets the contract via inline styles, and no token bridge is needed.

- [ ] **Step 1: Create `responsive.css`** at `apps/colign-frontend/src/responsive.css`:

```css
/*
 * Responsive UI touch & pointer policy — implements spec §4.3.
 * Scoped to #colign-root to compete with Tailwind utilities compiled
 * under important: "#colign-root" (spec §4.4).
 *
 * This file ALSO holds component-scoped container-query rules added in
 * Phase C (TeamRollupTable card view, IcDrillDrawer full-screen). Each
 * such block is fenced with a section header for navigability.
 */

/* === Section A3: global touch & pointer policy === */
@layer utilities {
  /* Coarse pointers (touch): primary interactive elements ≥ 44×44 */
  @media (pointer: coarse) {
    #colign-root button:not([data-dense-control="true"]):not(th button):not([aria-label*="agination" i]):not([data-testid*="pagination"]),
    #colign-root a[role="button"]:not([data-dense-control="true"]),
    #colign-root input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
    #colign-root select,
    #colign-root [role="button"]:not([data-dense-control="true"]) {
      min-height: 44px;
      min-width: 44px;
    }
    /* Label-wrapped checkboxes/radios get the hit-target via the label */
    #colign-root label:has(input[type="checkbox"]),
    #colign-root label:has(input[type="radio"]) {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }
  /* Fine pointers (cursor): denser desktop layouts allowed */
  @media (pointer: fine) {
    #colign-root button:not([data-dense-control="true"]):not(th button) {
      min-height: 32px;
    }
  }
  /* Hover gating — always-visible on touch */
  @media (hover: none) {
    #colign-root [data-hover-only="true"] {
      opacity: 1 !important;
      visibility: visible !important;
    }
  }
}
```

- [ ] **Step 2: Import `responsive.css` from `main.tsx`** — after the existing `./index.css` import, add:

```tsx
import "./responsive.css";
```

- [ ] **Step 3: Build + verify on disk** — `yarn build` then `grep -n "responsive.css" src/main.tsx` → 1 match.

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/src/responsive.css apps/colign-frontend/src/main.tsx
git commit -m "feat(responsive): add touch & pointer policy stylesheet"
```

---

### Task A3: Update `Button` SIZES so coarse pointers meet the 44px floor

**Files:**
- Modify: `apps/colign-frontend/src/components/ui/Button.tsx`
- Create: `apps/colign-frontend/src/components/ui/Button.test.tsx`

Existing Button uses fixed-height utilities (`h-7`/`h-9`/`h-10` = 28/36/40 px). Padding-only overrides cannot lift these. We bump sizes so that on coarse pointers the runtime `min-height: 44px` from responsive.css applies cleanly, and on fine pointers the larger compile-time floor is still ergonomic.

**Cascade caveat (design-lens):** the bump touches every Button consumer (~21 call sites). After the change, manually screenshot one dense row (e.g., ReconcileRow at 1440) before committing to verify no visual breakage.

- [ ] **Step 1: Inspect current SIZES** — `grep -n "h-7\|h-9\|h-10\|SIZES" apps/colign-frontend/src/components/ui/Button.tsx`.

- [ ] **Step 2: Write failing test** — `apps/colign-frontend/src/components/ui/Button.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button size contract (spec §4.3 + responsive.css)", () => {
  it("size=sm → h-8 (32px) meets pointer:fine floor", () => {
    render(<Button size="sm">Tap</Button>);
    expect(screen.getByRole("button", { name: "Tap" }).className).toMatch(/\bh-8\b/);
  });
  it("size=md → h-10 (40px); coarse pointers lift to 44 via responsive.css", () => {
    render(<Button size="md">Tap</Button>);
    expect(screen.getByRole("button", { name: "Tap" }).className).toMatch(/\bh-10\b/);
  });
  it("size=lg → h-11 (44px) meets coarse floor at compile time", () => {
    render(<Button size="lg">Tap</Button>);
    expect(screen.getByRole("button", { name: "Tap" }).className).toMatch(/\bh-11\b/);
  });
});
```

- [ ] **Step 3: Verify failures** — `yarn vitest run src/components/ui/Button.test.tsx` → 2 of 3 fail.

- [ ] **Step 4: Update SIZES** in `Button.tsx`:

```tsx
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1",
  md: "h-10 px-4 text-sm gap-1.5",
  lg: "h-11 px-5 text-sm gap-2",
};
```

- [ ] **Step 5: Verify passes + full build** — `yarn vitest run && yarn build` → all green.

- [ ] **Step 6: Visual regression spot-check** — boot the stack (mock auth not needed here — login screens don't render Button-primitive buttons). Open `http://localhost:4173/` after a login, navigate to a dense screen (ReconcilePage if available, else WeeklyPlanPage at 1440 width) via `/browse screenshot --viewport-width 1440 --viewport-height 900 --output tmp/a3-cascade-check.png`. Visually verify dense rows don't break.

- [ ] **Step 7: Commit**

```bash
git add apps/colign-frontend/src/components/ui/Button.tsx \
        apps/colign-frontend/src/components/ui/Button.test.tsx
git commit -m "feat(responsive): bump Button sizes — md=h-10, lg=h-11 for 44px touch floor"
```

---

### Task A4: Update `Drawer` close button to ≥44×44 + add `closeAffordance` prop ONLY

**Files:**
- Modify: `apps/colign-frontend/src/components/ui/Drawer.tsx`

**Critical correction from r1:** existing Drawer uses prop name `width` (not `size`) and imports `HiX` (not `HiOutlineX`). We KEEP the `width` prop name unchanged to avoid breaking IcDrillDrawer (the only consumer, which passes `width="xl"`). The `fullScreen` mode lives INSIDE IcDrillDrawer (Task C9), not as a Drawer primitive concern.

The only change to the Drawer primitive is:
1. Bump close button h-10 → h-11 (`HiX` icon stays)
2. Add a new `closeAffordance?: "x" | "back"` prop with default `"x"`. When `"back"`, swap icon to `HiArrowLeft` and aria-label to "Back to team list" (per spec §5.1)

- [ ] **Step 1: Locate close button** — `grep -n "HiX\|h-10\|width\|aria-label.*Close" apps/colign-frontend/src/components/ui/Drawer.tsx`.

- [ ] **Step 2: Update close button + add `closeAffordance`**

In `Drawer.tsx`:

1. Update the imports — keep the existing `HiX` import and add `HiArrowLeft`:

```tsx
import { HiX, HiArrowLeft } from "react-icons/hi";
```

2. Add `closeAffordance` to the props interface (immediately under `width`):

```tsx
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";       // EXISTING — DO NOT RENAME
  closeAffordance?: "x" | "back";    // NEW — default "x"
  title?: string;
  description?: string;
}

export function Drawer({
  open,
  onClose,
  children,
  width = "md",
  closeAffordance = "x",
  title,
  description,
}: DrawerProps) {
  // ... existing body unchanged ...
}
```

3. In the close-button JSX block, replace the existing button's `className` and inner `<HiX>` with:

```tsx
<button
  type="button"
  onClick={onClose}
  aria-label={closeAffordance === "back" ? "Back to team list" : "Close"}
  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
>
  {closeAffordance === "back" ? (
    <HiArrowLeft className="h-5 w-5" />
  ) : (
    <HiX className="h-4 w-4" />
  )}
</button>
```

- [ ] **Step 3: Build + run existing tests** — `yarn vitest run --reporter=basic | grep -i drawer` then `yarn build` → all pass.

- [ ] **Step 4: Verify on disk** — `grep -n "h-11 w-11\|closeAffordance\|HiArrowLeft" apps/colign-frontend/src/components/ui/Drawer.tsx` → 3+ matches.

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/src/components/ui/Drawer.tsx
git commit -m "feat(responsive): Drawer close ≥44×44 + closeAffordance prop"
```

---

### Task A5: Bump `AppShell` hamburger to ≥44×44

**Files:**
- Modify: `apps/colign-frontend/src/components/AppShell.tsx`

- [ ] **Step 1: Locate** — `grep -n "h-10 w-10\|HiOutlineMenu" apps/colign-frontend/src/components/AppShell.tsx`.

- [ ] **Step 2: Update** — replace `h-10 w-10` with `h-11 w-11` in the hamburger button's className.

- [ ] **Step 3: Verify + build** — `grep -n "h-11 w-11" apps/colign-frontend/src/components/AppShell.tsx` → 1 match; `yarn build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/src/components/AppShell.tsx
git commit -m "feat(responsive): AppShell hamburger ≥44×44 (h-11 w-11)"
```

---

## Phase B — Tooling

### Task B1: Create `scripts/audit-teardown.sh` (append-or-replace)

**Files:**
- Create: `scripts/audit-teardown.sh`
- Modify: `.gitignore`

**Critical fix from r1:** the current backend `.env.local` has NO `COLIGN_AUTH_MODE` line. A naive `sed 's/^X=.*/X=mock/'` would silently no-op and the `echo "✓ flipped"` would lie. The script below APPENDS the line when absent, REPLACES when present.

- [ ] **Step 1: Write the script** — `scripts/audit-teardown.sh`:

```bash
#!/usr/bin/env bash
# scripts/audit-teardown.sh — implements spec §6.3 mechanical env restore.
#
# Usage:
#   trap 'scripts/audit-teardown.sh restore' EXIT INT TERM   # MUST be registered
#   scripts/audit-teardown.sh flip
#   # ... audit work ...
#   scripts/audit-teardown.sh restore   # also runs via trap on early exit

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_DIR="$REPO_ROOT/.audit-snapshot"
FRONTEND_ENV="$REPO_ROOT/apps/colign-frontend/.env.local"
BACKEND_ENV="$REPO_ROOT/apps/colign-backend/.env.local"

# Append-or-replace a KEY=VALUE line in a .env file.
# Avoids the sed-only-replaces footgun when KEY is absent.
set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  if [ ! -f "$file" ]; then
    echo "WARNING: $file does not exist; skipping $key flip"
    return 0
  fi
  if grep -q "^${key}=" "$file"; then
    # Replace in place. The sed -i.bak portable workaround keeps macOS + GNU consistent.
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
    rm -f "$file.bak"
    echo "  ✓ $key replaced in $(basename "$(dirname "$file")")/.env.local"
  else
    echo "" >> "$file"  # ensure newline before append
    echo "${key}=${value}" >> "$file"
    echo "  ✓ $key appended to $(basename "$(dirname "$file")")/.env.local"
  fi
}

cmd_flip() {
  if [ -d "$SNAPSHOT_DIR" ]; then
    echo "ERROR: $SNAPSHOT_DIR already exists. Run 'restore' or remove it manually." >&2
    exit 1
  fi
  mkdir -p "$SNAPSHOT_DIR"
  [ -f "$FRONTEND_ENV" ] && cp "$FRONTEND_ENV" "$SNAPSHOT_DIR/frontend.env.local"
  [ -f "$BACKEND_ENV" ] && cp "$BACKEND_ENV" "$SNAPSHOT_DIR/backend.env.local"
  echo "Snapshot stored at $SNAPSHOT_DIR — DO NOT delete until 'restore' runs."
  echo "Flipping to mock auth mode..."
  set_env_var "$FRONTEND_ENV" "VITE_AUTH_MODE" "mock"
  set_env_var "$BACKEND_ENV" "COLIGN_AUTH_MODE" "mock"
  echo "✓ Flipped. Register the trap NOW if you haven't:"
  echo "    trap 'scripts/audit-teardown.sh restore' EXIT INT TERM"
}

cmd_restore() {
  if [ ! -d "$SNAPSHOT_DIR" ]; then
    echo "No snapshot at $SNAPSHOT_DIR — nothing to restore."
    return 0
  fi
  [ -f "$SNAPSHOT_DIR/frontend.env.local" ] && cp "$SNAPSHOT_DIR/frontend.env.local" "$FRONTEND_ENV" && echo "  ✓ Frontend env restored"
  [ -f "$SNAPSHOT_DIR/backend.env.local" ]  && cp "$SNAPSHOT_DIR/backend.env.local"  "$BACKEND_ENV"  && echo "  ✓ Backend env restored"
  rm -rf "$SNAPSHOT_DIR"
  echo "✓ Snapshot removed. Auth mode restored."
}

case "${1:-}" in
  flip) cmd_flip ;;
  restore) cmd_restore ;;
  *) echo "Usage: $0 {flip|restore}"; exit 64 ;;
esac
```

- [ ] **Step 2: Make executable** — `chmod +x scripts/audit-teardown.sh`.

- [ ] **Step 3: Add `.audit-snapshot/` to `.gitignore`** — `grep -q "^.audit-snapshot/" .gitignore || echo ".audit-snapshot/" >> .gitignore`.

- [ ] **Step 4: Smoke-test (does NOT flip)** —

  - `scripts/audit-teardown.sh restore` → "No snapshot... nothing to restore." (exit 0)
  - `scripts/audit-teardown.sh badcommand` → usage message, exit 64
  - Real flip happens in Phase C pre-checks.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-teardown.sh .gitignore
git commit -m "feat(responsive): audit-teardown.sh — append-or-replace env flip per spec §6.3"
```

---

### Task B2: Harden the Vite `/__dev__/mint` middleware (shell injection)

**Files:**
- Modify: `apps/colign-frontend/vite.config.ts`

Spec §9.4 flags this as P1 pre-existing. The autonomous-loop rail allows `vite.config.ts` edits (only the shared-singleton list is off-limits). Since Phase C will actively exercise this middleware throughout the audit (every JWT mint goes through it implicitly), fixing it before C is the right time. The fix is small: swap `execSync` (shell string) for `execFileSync` (argv array — no shell).

- [ ] **Step 1: Inspect the middleware** — `grep -n "execSync\|__dev__/mint" apps/colign-frontend/vite.config.ts`.

- [ ] **Step 2: Replace `execSync` with `execFileSync`** — change the imports:

```ts
import { execFileSync } from "node:child_process";
```

And replace the call site (currently `execSync(\`node "${scriptPath}" --email "${email}" ...\`)`) with:

```ts
const stdout = execFileSync(
  "node",
  [scriptPath, "--email", email, "--role", role, "--ttl", String(ttl), "--audience", audience],
  { encoding: "utf8" }
);
```

(Argv passes arguments to Node directly. No shell, no interpolation, no injection surface — regardless of what characters the query params contain.)

- [ ] **Step 3: Remove the now-unused `execSync` import** if it was imported separately. Verify with `grep -n "execSync" vite.config.ts` → 0 matches.

- [ ] **Step 4: Smoke-test the middleware** — boot frontend (`./node_modules/.bin/vite --port 5174`); in another terminal run:

```bash
curl -sS "http://localhost:5174/__dev__/mint?email=audit-ic@colign.test&role=IC&ttl=3600&audience=https%3A%2F%2Fapi.colign.org"
```

Expected: JSON response containing a 3-segment JWT. (If this fails, do NOT proceed — diagnose first.)

Then verify the shell-injection branch is closed by attempting a payload that would have executed previously:

```bash
curl -sS "http://localhost:5174/__dev__/mint?email=audit-ic@colign.test%22%24(touch+%2Ftmp%2Fpwned)%22&role=IC&ttl=3600&audience=test"
ls /tmp/pwned 2>&1   # should report "No such file or directory"
```

Expected: the second curl either returns a JWT minted with a literal weird email, or a backend reject — but `/tmp/pwned` MUST NOT exist.

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/vite.config.ts
git commit -m "fix(security): replace execSync with execFileSync in /__dev__/mint middleware"
```

---

## Phase C — Per-screen audit

### Pre-Phase-C startup checklist (RUN ONCE, in order)

- [ ] **Verify mock JWT minting works** —

```bash
node scripts/mock-jwt.mjs --email audit-ic@colign.test --role IC --ttl 14400
```

Expected: outputs a 3-segment JWT. If this fails, STOP.

(Spec §6.3 precondition. TTL 14400 = 4 hours, matches the Vite middleware default and covers the full audit window.)

- [ ] **Capture-hygiene reminder** — confirm we'll use audit-only emails for the entire audit:
  - IC: `audit-ic@colign.test`
  - MANAGER: `audit-mgr@colign.test`
  - Never use a real user's email during the audit. Screenshots will display `me?.email` in AppShell on every authenticated screen.

- [ ] **Flip to audit mode + register restore trap** —

In the SAME shell that will run the audit:

```bash
scripts/audit-teardown.sh flip
trap 'scripts/audit-teardown.sh restore' EXIT INT TERM
```

The trap MUST be registered in the same shell process; opening a new terminal for backend/frontend/host afterwards is fine.

(Verify with `trap -p` → at least one entry for EXIT INT TERM.)

- [ ] **Boot the three-service stack** —

Terminal 1 (backend, mock mode):
```bash
cd apps/colign-backend && set -a && source .env.local && set +a && SPRING_PROFILES_ACTIVE=h2 COLIGN_AUTH_MODE=mock JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw spring-boot:run
```

Terminal 2 (frontend remote): `cd apps/colign-frontend && ./node_modules/.bin/vite --port 5174`

Terminal 3 (host): `cd apps/pa-host && ./node_modules/.bin/vite --port 4173`

Per dev runbook: user opens `:4173`, NOT `:5174`.

- [ ] **Initialize results doc** —

Create `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md`:

```markdown
# Responsive UI Audit Results

**Audit date:** 2026-05-31
**Spec:** [2026-05-31-responsive-ui-audit-design.md](2026-05-31-responsive-ui-audit-design.md)
**Plan:** [docs/superpowers/plans/2026-05-31-responsive-ui-audit.md](../plans/2026-05-31-responsive-ui-audit.md)

Per-screen findings appended below.

---
```

Commit: `docs(audit): initialize results doc`.

---

### Task C1: Audit `HostHome` (pa-host landing)

**Files:**
- Capture: `tmp/responsive-audit/HostHome/{before,after}/*.png`
- Modify (if issues found): `apps/pa-host/src/HostHome.tsx`
- Append to results doc

**Asymmetry reminder (spec §4.2 / r2 review):** the `responsive.css` touch policy from Phase A does NOT reach HostHome — pa-host mounts under `#pa-root` and has no Tailwind. HostHome's CTA already uses `minHeight: 44`; footer links use `colign-caption-link` (≥24×24 tap zone). So HostHome is in scope for the visual audit but already satisfies the contract via inline styles. Do NOT modify the headline `clamp(44px, 8.5vw, 108px)` formula unless the screenshot reveals an actual rendering defect — the formula was deliberately chosen for brand intent and the math (`8.5vw` at 320 = 27.2px, clamped up to 44px min) confirms it never overflows.

- [ ] **Step 1: Capture baseline (5×2 = 10 shots)** — via `/browse screenshot http://localhost:4173/ --viewport-width <W> --viewport-height 900 --output tmp/responsive-audit/HostHome/before/<W>-<mode>.png --color-scheme <mode>` for {320,375,768,1024,1440} × {light,dark}.

- [ ] **Step 2: Review against checklist** —
  - ☐ No horizontal scroll on `<body>` at any width
  - ☐ No text clipping or overlap
  - ☐ Get started CTA fully tappable, ≥44×44
  - ☐ Footer links don't collide with brand/CTA; wrap correctly at 320
  - ☐ Headline `text-wrap: balance` not producing awkward breaks at 320
  - ☐ Dark mode layout matches light (color-only differences are out of scope)

Log findings to results doc under `## HostHome`, organized by WCAG-fail / broken-on-mobile / polish.

- [ ] **Step 3: Apply fixes ONLY for WCAG-fail or broken-on-mobile issues** — likely culprits if any:
  - Footer wrap at 320: add `flex-wrap` to the footer container
  - Skip link tap area: increase padding on `.sr-only` focus state
  - Do NOT modify the headline clamp formula (see asymmetry reminder above)

Per dev-runbook gotcha #1: `grep -c <marker>` the file on disk after every edit before committing.

- [ ] **Step 4: Capture after-matrix** — same 10 widths × modes into `.../after/`.

- [ ] **Step 5: Append findings to results doc** (template):

```markdown
## HostHome (pa-host landing)
**Audited at:** 320 / 375 / 768 / 1024 / 1440 px × light + dark

**Findings:** WCAG-fail: <list or "none">. Broken-on-mobile: <list>. Polish: <list>.

**Fixes applied:** <bullet list with file paths>

**Screenshots:** `tmp/responsive-audit/HostHome/{before,after}/`
```

- [ ] **Step 6: Commit** — code commit if changes applied, doc-only commit otherwise.

- [ ] **Step 7: Onboarding-journey smoke check** at 320 + 1440 via /browse — confirm HostHome → Login still navigates. STOP if anything broke.

---

### Task C2: Audit `LoginPage`

Same shape as C1. Public, no auth.

- [ ] **Step 1: Determine LoginPage route** — `grep -n "LoginPage\|/login" apps/colign-frontend/src/main.tsx` or App routing config.
- [ ] **Step 2: Capture baseline (10 shots)**
- [ ] **Step 3: Checklist review** — Auth0 redirect button ≥44×44, Continue-with-Google button no overflow at 320, sign-in form padding, sticky CTA with `env(safe-area-inset-bottom)` if applicable
- [ ] **Step 4: Apply fixes if needed** in `apps/colign-frontend/src/pages/LoginPage.tsx`
- [ ] **Step 5: Capture after** + **Step 6: Append + commit** + **Step 7: Smoke check**

---

### Task C3: Audit `OnboardingChoicePage`

**Pre-step:** mint IC JWT and inject into localStorage. Use `/browse evaluate` on the open page:

```js
localStorage.setItem('colign_jwt', '<paste-jwt-here>');
localStorage.setItem('colign_email', 'audit-ic@colign.test');
localStorage.setItem('colign_role', 'IC');
location.reload();   // MUST reload — authSlice initializes from localStorage at module load only
```

(The `location.reload()` is critical — without it the Redux store stays at unauthenticated state even though localStorage is updated.)

- [ ] **Step 1: Navigate to `/` and verify OnboardingChoicePage renders** (the IC user with no team lands here)
- [ ] **Step 2: Capture baseline (10 shots)**
- [ ] **Step 3: Checklist** — IC choice buttons ≥44×44, no text clipping on the choice card descriptions
- [ ] **Step 4: Apply fixes** in `apps/colign-frontend/src/pages/OnboardingChoicePage.tsx` if needed
- [ ] **Step 5-7:** capture after + append + commit + smoke check

---

### Task C4: Audit `InviteTeammatesPage` (special: handle dense copy-link button)

**Pre-step:** From OnboardingChoicePage choose "Create a team" → land on InviteTeammatesPage.

**Important — copy-link button (design-lens review):** `InviteRow` renders a copy-link button styled `px-2 py-1.5 text-xs` (≈ 28×28 px), which fails the 44×44 floor at narrow viewports and will fail the Cypress assertion in D1. Two valid resolutions during this task — pick ONE before C4's after-capture:

1. **Convert to Button primitive** at `size="sm"`. Post-A3 that's h-8 (32px) + responsive.css lifts to 44 on coarse. **Preferred** for visual consistency.
2. **Add `data-dense-control="true"` to the copy-link button**, plus a PR-description note justifying it. Use only if the visual design REQUIRES the smaller pill shape.

Either way, document the choice in the results doc.

- [ ] **Step 1: Capture baseline (10 shots)**
- [ ] **Step 2: Checklist** — email-input chip widths at 320, "Send invites" CTA ≥44×44, "Skip" link tap area ≥24 with spacing, copy-link button per the resolution above
- [ ] **Step 3: Apply fixes** including the copy-link decision in `apps/colign-frontend/src/pages/InviteTeammatesPage.tsx` (and `InviteRow` if it's a separate component)
- [ ] **Step 4-7:** capture after + append + commit + smoke check

---

### Task C5: Audit `InviteAcceptPage`

Public screen reached via an invitation token URL.

- [ ] **Pre-step:** generate a real invitation token via the InviteTeammatesPage flow; copy the URL.
- [ ] **Step 1-7:** same shape as C1 — capture, checklist (accept CTA ≥44, team name no overflow at 320), apply, capture, append, commit, smoke.

---

### Task C6: Audit `WeeklyPlanPage`

Primary IC screen.

- [ ] **Step 1-7:** same shape. Checklist focuses: commit row touch targets, Add commit CTA, Lock plan / Lock & reconcile CTA pair at 320 (likely needs stacking), edit/delete icons inside commit rows. Fix files: `pages/WeeklyPlanPage.tsx` + possibly `CommitRow.tsx` + `CommitForm.tsx`.

---

### Task C7: Audit `ReconcilePage`

Reached from WeeklyPlanPage via "Lock & reconcile".

- [ ] **Step 1-7:** same shape. Checklist focuses: reconcile-row controls, "Mark complete" / "Mark dropped" buttons, status pills, summary banner at 320. Fix files: `pages/ReconcilePage.tsx` + `ReconcileRow.tsx`.

---

### Task C8: Audit `ManagerDashboardPage` + refactor `TeamRollupTable` (container query + card view)

**Pre-step:** mint MANAGER JWT and inject (note the `location.reload()`):

```bash
node scripts/mock-jwt.mjs --email audit-mgr@colign.test --role MANAGER --ttl 14400
```

Use `/browse evaluate`:

```js
localStorage.setItem('colign_jwt', '<jwt>');
localStorage.setItem('colign_email', 'audit-mgr@colign.test');
localStorage.setItem('colign_role', 'MANAGER');
location.reload();
```

Navigate to the manager dashboard route (verify via grep on the manager route).

- [ ] **Step 1: Capture baseline (10 shots)** — expect horizontal scroll on table at 320; that's the issue the card view solves.

- [ ] **Step 2: Implement card view in `TeamRollupTable.tsx`**

The plan commits to **raw CSS @container** (no `@tailwindcss/container-queries` plugin). DO NOT use `@[640px]:hidden` / `@[640px]:block` — those Tailwind variants require a plugin not installed in this PR.

Add to `apps/colign-frontend/src/responsive.css` (appended after the global policy section):

```css
/* === Section C8: TeamRollupTable container query === */
@layer components {
  .team-rollup-container {
    container-type: inline-size;
  }
  .team-rollup-table-view { display: block; }
  .team-rollup-card-view { display: none; }
  .team-rollup-card-view-controls { display: none; }
  @container (max-width: 639.98px) {
    .team-rollup-table-view { display: none; }
    .team-rollup-card-view { display: flex; flex-direction: column; gap: 0.5rem; }
    .team-rollup-card-view-controls { display: flex; flex-direction: row; gap: 0.5rem; margin-bottom: 0.5rem; }
  }
}
```

In `TeamRollupTable.tsx`, restructure the return:

```tsx
return (
  <div className="space-y-3 team-rollup-container">
    {/* sort-chip row — visible only in card mode via responsive.css */}
    <div className="team-rollup-card-view-controls">
      <button
        type="button"
        onClick={() => toggleSort("displayName")}
        className={cn(
          "rounded-full px-4 py-2 text-xs font-medium border min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
          sort === "displayName"
            ? "bg-neutral-900 text-neutral-50 border-neutral-900 dark:bg-white dark:text-neutral-900"
            : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
        )}
      >
        Name {sort === "displayName" ? (dir === "asc" ? "↑" : "↓") : ""}
      </button>
      <button
        type="button"
        onClick={() => toggleSort("weekStartDate")}
        className={cn(
          "rounded-full px-4 py-2 text-xs font-medium border min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
          sort === "weekStartDate"
            ? "bg-neutral-900 text-neutral-50 border-neutral-900 dark:bg-white dark:text-neutral-900"
            : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
        )}
      >
        Week {sort === "weekStartDate" ? (dir === "asc" ? "↑" : "↓") : ""}
      </button>
    </div>

    {/* Table view */}
    <div className="team-rollup-table-view">
      <TableScroller>
        <Table>
          {/* existing THead+TBody — add data-clickable="true" to every <TR onClick={...}> */}
        </Table>
      </TableScroller>
    </div>

    {/* Card view */}
    <div className="team-rollup-card-view">
      {(data?.content ?? []).map((m) => (
        <TeamRollupCard key={m.userId} member={m} onSelect={onSelectMember} />
      ))}
    </div>

    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
      {/* existing Showing X-Y of Z + Pagination */}
    </div>
  </div>
);
```

In the existing `<TR onClick={...}>` inside the THead+TBody block, add `data-clickable="true"`. This wires the row into the Cypress 44×44 assertion's selector set (which already includes `tr[data-clickable="true"]`).

Add the `TeamRollupCard` sub-component (inline in the same file):

```tsx
function TeamRollupCard({
  member,
  onSelect,
}: {
  member: TeamMemberDto;
  onSelect: (m: TeamMemberDto) => void;
}) {
  const plan = member.currentPlan;
  const tier = alignmentTier(plan?.alignment.alignmentPct ?? 0);
  return (
    <div
      role="button"
      tabIndex={0}
      data-clickable="true"
      onClick={() => onSelect(member)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(member);
        }
      }}
      className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
          {initials(member.displayName)}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-fluid-base font-medium text-neutral-900 dark:text-neutral-50 truncate">
            {member.displayName}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">
            {member.email}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {plan ? <PlanStatePill state={plan.state} size="xs" /> : <Badge tone="neutral" size="xs">No plan</Badge>}
        {plan ? (
          <span className="text-xs text-neutral-600 tabular-nums shrink-0">
            {plan.commits.length} commit{plan.commits.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {plan ? (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <div className="h-1.5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className={cn("h-1.5 rounded-full", tier.bar)}
                style={{ width: `${Math.max(0, Math.min(100, plan.alignment.alignmentPct))}%` }}
                role="progressbar"
                aria-valuenow={plan.alignment.alignmentPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${member.displayName} alignment ${plan.alignment.alignmentPct}%`}
              />
            </div>
            <span className={cn("text-xs font-medium tabular-nums", tier.label)}>
              {plan.alignment.alignmentPct}%
            </span>
          </div>
        ) : null}
      </div>
      <Button
        variant="secondary"
        size="lg"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(member);
        }}
        className="mt-3 w-full"
        leftIcon={<HiOutlineEye className="h-4 w-4" />}
        aria-label={`Review ${member.displayName}'s week`}
      >
        Review
      </Button>
    </div>
  );
}
```

**Key fixes from r1:**
- `variant="secondary"` (not `"outline"` — `outline` isn't in Button's Variant union)
- `shrink-0` on fixed-width clusters (avatar, commit-count, alignment-bar) so the left flex column gets `min-w-0` truncation
- `data-clickable="true"` on both TR and card

- [ ] **Step 3: Verify changes on disk**

```bash
grep -c "TeamRollupCard\|team-rollup-card-view\|data-clickable" apps/colign-frontend/src/components/TeamRollupTable.tsx
# expected: ≥ 4 (function definition + usage + class names + data attribute)
grep -c "team-rollup-card-view\|team-rollup-container" apps/colign-frontend/src/responsive.css
# expected: ≥ 4
```

Verify NO `@[640px]:` strings leaked anywhere:

```bash
grep -rn "@\[640px\]:" apps/colign-frontend/src/ --include="*.tsx" --include="*.css"
# expected: 0 matches
```

- [ ] **Step 4: Build + run tests** — `yarn build && yarn vitest run` → all green.

- [ ] **Step 5: Capture after-matrix (10 shots)** — confirms card view at 320/375 and table view at 768/1024/1440.

- [ ] **Step 6: Spot-check at 280px** (foldable inner; not in the standard 5-width matrix per spec §6.2 but worth a sanity check given foldables are documented as the lower edge):

```
/browse screenshot http://localhost:4173/<manager-route> \
  --viewport-width 280 --viewport-height 800 \
  --output tmp/responsive-audit/ManagerDashboardPage/after/280-light.png
```

Verify the card layout doesn't crush the avatar+name or push the alignment bar off-screen. If it does, log as polish; don't gate the audit on 280.

- [ ] **Step 7: Append + commit** —

```bash
git add apps/colign-frontend/src/components/TeamRollupTable.tsx \
        apps/colign-frontend/src/responsive.css \
        docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "feat(responsive): TeamRollupTable container query + card view per spec §5.1"
```

- [ ] **Step 8: Smoke check** — onboarding journey for IC still completes; manager dashboard still loads at all widths.

---

### Task C9: Audit `IcDrillDrawer` + add full-screen mode (CSS-driven, no JS hook)

Reached by clicking a member row/card on the now-refactored manager dashboard.

**Critical correction from r1:** the full-screen mode is now CSS-only — no `useCoarsePointerNarrow` hook, no `fullScreen` prop on the Drawer primitive. The Drawer's primitive only gained `closeAffordance` in A4; we use it here. Full-screen layout is achieved by CSS class targeting + `@media (pointer: coarse) and (max-width: 767.98px)` rules. This drops JS lifecycle complexity and avoids the initial-render flash where `match` was `false` before matchMedia fired.

For the back-affordance, we set `closeAffordance="back"` directly when IcDrillDrawer renders — IcDrillDrawer is the only Drawer consumer that needs the back arrow, so a static prop value is correct.

- [ ] **Step 1: Capture baseline (10 shots)** — drawer opened on a member.

- [ ] **Step 2: Implement CSS full-screen + back affordance**

In `apps/colign-frontend/src/components/IcDrillDrawer.tsx`, change the Drawer wrap to:

```tsx
<Drawer
  open={!!member}
  onClose={onClose}
  width="xl"
  closeAffordance="back"   // NEW — back arrow + "Back to team list" aria-label
  title={`${member?.displayName ?? ""}'s week`}
  description={member?.email}
>
  <div className="ic-drill-drawer-content">
    {/* existing drawer content unchanged */}
  </div>
</Drawer>
```

(Note: `width="xl"` is preserved. The Drawer panel's `xl` width applies on cursor + wide viewports; the CSS below overrides to full-width on coarse+narrow.)

Add to `apps/colign-frontend/src/responsive.css` (appended after the C8 section):

```css
/* === Section C9: IcDrillDrawer full-screen on coarse+narrow === */
@layer components {
  .ic-drill-drawer-content {
    container-type: inline-size;
  }
  /* Container-query rule for internal commit list */
  @container (max-width: 479.98px) {
    .ic-drill-drawer-content .ic-drill-commit-list {
      grid-template-columns: 1fr !important;
      line-height: 1.7;
    }
  }
  /* Viewport rule: coarse pointer + narrow viewport → drawer is full-screen.
     Targets the aside panel that Drawer renders (verify selector during impl). */
  @media (pointer: coarse) and (max-width: 767.98px) {
    #colign-root aside[role="dialog"] {
      width: 100% !important;
      max-width: none !important;
    }
  }
}
```

If the commit list in IcDrillDrawer doesn't already have a `.ic-drill-commit-list` class, add it to the appropriate `<div>` or `<ul>` in the existing IcDrillDrawer JSX.

- [ ] **Step 3: Verify the aside selector matches**

Run: `grep -n "aside\|role=\"dialog\"" apps/colign-frontend/src/components/ui/Drawer.tsx`

Confirm Drawer's panel renders as `<aside role="dialog">`. If it renders as a different element (e.g., a `<div>` with `role="dialog"`), update the CSS selector accordingly.

Then verify changes landed:

```bash
grep -c "closeAffordance=\"back\"\|ic-drill-drawer-content" apps/colign-frontend/src/components/IcDrillDrawer.tsx
# expected: ≥ 2
grep -c "ic-drill-drawer-content\|ic-drill-commit-list" apps/colign-frontend/src/responsive.css
# expected: ≥ 3
```

- [ ] **Step 4: Build + run tests** — `yarn build && yarn vitest run` → all green.

- [ ] **Step 5: Capture after-matrix** — confirm side-drawer at 1024/1440 (cursor desktop), full-screen at 320/375 (coarse phone-class).

   On a desktop browser the matchMedia for `(pointer: coarse)` is false, so 320/375 capture via headless `/browse` will likely STILL show the side-drawer unless `/browse` exposes a touch-emulation flag. If it doesn't, document this limitation in the results doc — verification of the coarse+narrow path then falls to the real-phone smoke test in D4.

- [ ] **Step 6: Append + commit**

```bash
git add apps/colign-frontend/src/components/IcDrillDrawer.tsx \
        apps/colign-frontend/src/responsive.css \
        docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "feat(responsive): IcDrillDrawer back-affordance + CSS full-screen on coarse+narrow"
```

- [ ] **Step 7: Smoke check** — manager journey end-to-end still works.

---

### Post-Phase-C cleanup

- [ ] **Restore real auth mode** — `scripts/audit-teardown.sh restore` (the `EXIT` trap will also try to run this, but explicit-first is safer if the trap stack is unclear).

- [ ] **Verify restore on disk**

```bash
grep "VITE_AUTH_MODE\|COLIGN_AUTH_MODE" apps/colign-frontend/.env.local apps/colign-backend/.env.local
```

Expected: frontend shows `VITE_AUTH_MODE=real`; backend shows either `COLIGN_AUTH_MODE=real` or no line at all (backend's original `.env.local` had no `COLIGN_AUTH_MODE` line; restore copies the pre-flip snapshot which was the no-line state). If backend snapshot was a no-line state, the post-restore file should ALSO be no-line — that's expected. The startup guard (deferred per §9.4) would protect prod from running mock-mode silently.

---

## Phase D — Regression layer + completion

### Task D0: Scaffold Cypress configuration + directory

**Files:**
- Create: `apps/colign-frontend/cypress.config.ts`
- Create: `apps/colign-frontend/cypress/support/e2e.ts`
- Create: `apps/colign-frontend/cypress/fixtures/.gitkeep`

Cypress is installed as a dependency but no config or `cypress/` directory exists today. D1/D2/D3 would fail immediately without this scaffold.

- [ ] **Step 1: Create `cypress.config.ts`**

`apps/colign-frontend/cypress.config.ts`:

```ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    // Pass through dev-only env vars so the responsive preflight can inspect them.
    env: {
      VITE_AUTH_MODE: process.env.VITE_AUTH_MODE ?? "real",
      VITE_API_BASE: process.env.VITE_API_BASE ?? "http://localhost:8080",
    },
  },
});
```

- [ ] **Step 2: Create support entry**

`apps/colign-frontend/cypress/support/e2e.ts`:

```ts
// Cypress E2E support entry. Imports run before every spec file.
// Add custom commands here if needed; for now it's intentionally empty.
export {};
```

- [ ] **Step 3: Create fixtures placeholder**

```bash
mkdir -p apps/colign-frontend/cypress/fixtures
touch apps/colign-frontend/cypress/fixtures/.gitkeep
```

- [ ] **Step 4: Verify scaffold**

```bash
ls apps/colign-frontend/cypress/
# expected: fixtures/ support/
cat apps/colign-frontend/cypress.config.ts | head -1
# expected: import { defineConfig } from "cypress";
```

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/cypress.config.ts \
        apps/colign-frontend/cypress/support/e2e.ts \
        apps/colign-frontend/cypress/fixtures/.gitkeep
git commit -m "chore(cypress): scaffold config + support entry for responsive specs"
```

---

### Task D1: Write `responsive-narrow.cy.ts` + shared assertions

**Files:**
- Create: `apps/colign-frontend/cypress/support/responsive-assertions.ts`
- Create: `apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`

- [ ] **Step 1: Create assertions helper**

`apps/colign-frontend/cypress/support/responsive-assertions.ts`:

```ts
const DENSE_SELECTORS = [
  "th button",
  '[aria-label*="agination" i] button',
  '[data-testid*="pagination"] button',
  '[data-dense-control="true"]',
];

// SPEC §6.6 — ALLOWLIST. Only permit localhost/127/LAN IPs. Reject everything else
// including staging.*, *.fly.dev, *.vercel.app, and api.colign.org.
const DEV_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+(?::\d+)?)(\/.*)?$/i;

export function preflight(): void {
  const authMode = Cypress.env("VITE_AUTH_MODE") || "";
  if (authMode !== "mock") {
    throw new Error(
      `Responsive specs require VITE_AUTH_MODE=mock (got "${authMode}"). Aborting before navigation.`
    );
  }
  const apiBase = Cypress.env("VITE_API_BASE") || "";
  if (!DEV_API_PATTERN.test(apiBase)) {
    throw new Error(
      `Responsive specs MUST target a local dev backend (VITE_API_BASE matched allowlist failed; got "${apiBase}"). Aborting.`
    );
  }
}

export function assertNoHorizontalScroll(): void {
  cy.window().then((win) => {
    const root = (win.document.querySelector("#colign-root") ?? win.document.documentElement) as Element;
    expect(root.scrollWidth, "no horizontal scroll inside #colign-root").to.be.at.most(root.clientWidth + 1);
  });
}

export function assertTouchTargets(): void {
  cy.window().then((win) => {
    const root = win.document.querySelector("#colign-root") ?? win.document.documentElement;
    const candidates = root.querySelectorAll(
      'a, button, input, select, [role="button"], tr[data-clickable="true"], [data-clickable="true"]'
    );
    const exceptionMatches = (el: Element): boolean =>
      DENSE_SELECTORS.some((sel) => el.matches(sel) || el.closest(sel) !== null);
    const failures: string[] = [];
    candidates.forEach((el) => {
      if (exceptionMatches(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        failures.push(`${el.tagName}#${el.id || "(no-id)"} ${Math.round(rect.width)}×${Math.round(rect.height)}`);
      }
    });
    expect(failures, `all primary interactive elements ≥ 44×44 (failures: ${failures.join(", ")})`).to.be.empty;
  });
}
```

(Note about `assertTouchTargets`: Cypress runs in a desktop browser reporting `pointer: fine`, so the runtime `min-height: 44px` rule from responsive.css does NOT apply during the spec. The assertion catches compile-time-baked sizes — `h-11`, `min-h-[44px]`. This is intentional: the spec's enforced floor on coarse is the responsive.css rule; the Cypress narrow run validates the compile-time floor for elements that should be touch-friendly regardless.)

- [ ] **Step 2: Create the narrow spec**

`apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`:

```ts
import {
  preflight,
  assertNoHorizontalScroll,
  assertTouchTargets,
} from "../support/responsive-assertions";

describe("Responsive @ 320×568 (narrow stress test)", () => {
  // Run preflight at each `it` level too — Cypress treats a throw in `before()`
  // as a hook failure but other describe blocks in the same run will still
  // execute. Per-it preflight ensures every assertion runs only when env is OK.
  beforeEach(() => {
    preflight();
    cy.viewport(320, 568);
  });

  it("HostHome → Login → OnboardingChoice → InviteTeammates → WeeklyPlan", () => {
    cy.visit("/");
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.get('[data-cy="landing-get-started"]').click();
    cy.findByRole("button", { name: /sign in/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("button", { name: /create a team/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("link", { name: /skip/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("heading", { name: /this week/i, level: 1 }).should("be.visible");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });
});
```

- [ ] **Step 3: Verify on disk** — `grep -c "describe.*320\|preflight\|assertNoHorizontalScroll" apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts` → ≥ 3.

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts \
        apps/colign-frontend/cypress/support/responsive-assertions.ts
git commit -m "test(responsive): 320px regression spec with allowlist preflight"
```

---

### Task D2: Write `responsive-wide.cy.ts`

**Files:**
- Create: `apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts`

- [ ] **Step 1: Create the wide spec** — identical journey at 1440×900:

```ts
import {
  preflight,
  assertNoHorizontalScroll,
  assertTouchTargets,
} from "../support/responsive-assertions";

describe("Responsive @ 1440×900 (desktop target)", () => {
  beforeEach(() => {
    preflight();
    cy.viewport(1440, 900);
  });

  it("HostHome → Login → OnboardingChoice → InviteTeammates → WeeklyPlan", () => {
    cy.visit("/");
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.get('[data-cy="landing-get-started"]').click();
    cy.findByRole("button", { name: /sign in/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("button", { name: /create a team/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("link", { name: /skip/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByRole("heading", { name: /this week/i, level: 1 }).should("be.visible");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });
});
```

- [ ] **Step 2: Verify** — `grep -c "describe.*1440" apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts` → 1.

- [ ] **Step 3: Commit**

```bash
git add apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts
git commit -m "test(responsive): 1440px regression spec for onboarding journey"
```

---

### Task D3: Run both Cypress specs + verify preflight aborts on misconfig

- [ ] **Step 1: Flip to mock + register restore trap** (in the same shell as Cypress will run):

```bash
scripts/audit-teardown.sh flip
trap 'scripts/audit-teardown.sh restore' EXIT INT TERM
```

Boot the three-service stack as in Phase C if not already running.

- [ ] **Step 2: Run both specs**

```bash
cd apps/colign-frontend
CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 \
  yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts,cypress/e2e/responsive-wide.cy.ts"
```

Expected: both specs pass. If they fail, capture the failure to the results doc and STOP — diagnose before continuing.

- [ ] **Step 3: Verify preflight aborts on misconfig — three scenarios**

```bash
# 3a) auth mode wrong → abort
CYPRESS_VITE_AUTH_MODE=real CYPRESS_VITE_API_BASE=http://localhost:8080 \
  yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts" 2>&1 | grep -i "VITE_AUTH_MODE=mock"
# expected: the abort error fires

# 3b) production API → abort (allowlist rejects it)
CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=https://api.colign.org \
  yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts" 2>&1 | grep -i "local dev backend"
# expected: the abort error fires

# 3c) Fly.dev staging URL → abort (allowlist rejects it)
CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=https://colign-api.fly.dev \
  yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts" 2>&1 | grep -i "local dev backend"
# expected: the abort error fires
```

If any of 3a-3c does NOT fire the abort error, the allowlist regex is wrong — fix it before continuing.

- [ ] **Step 4: Restore (trap will handle this, but also explicit)** — `scripts/audit-teardown.sh restore`.

- [ ] **Step 5: Append a "Regression layer verification" section** to the results doc with the command + outcome for each scenario (passes, allowlist rejections).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "docs(audit): verify Cypress specs + allowlist preflight (3 scenarios)"
```

---

### Task D4: Real-phone smoke test + finalize results doc

**This is the only step that requires a human.** The autonomous loop pauses here per spec §8.

- [ ] **Step 1: Surface the smoke-test prompt to the user**

Output a message:

> **Real-phone smoke test required (spec §8).** Open `https://colign.org` (or `http://<dev-machine-ip>:4173` for the audit branch) on an actual touch device. Complete: HostHome → Get started → Sign in → Create a team → Skip invites → land on Weekly Plan → add one commit. Report PASS/FAIL and any friction observed.

Wait for the user's response.

- [ ] **Step 2: Capture the user's note** in the results doc as a `## Real-phone smoke test` section, verbatim, with PASS/FAIL.

- [ ] **Step 3: Write the summary**

Append `## Summary` to the results doc with:
- Number of screens audited
- Per-bucket findings counts (WCAG-fail / broken-on-mobile / polish)
- Number of fixes applied (`git log --oneline | grep "feat(responsive)" | wc -l`)
- Deferred items (polish that didn't get fixed; backend startup guard per §9.4)
- Pre-existing security flags (committed mock key, ongoing) — link to spec §9.4

- [ ] **Step 4: Commit final results**

```bash
git add docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "docs(audit): finalize responsive UI audit results"
```

- [ ] **Step 5: Send results doc to user via SendUserFile** — files=[results doc path], status=proactive, caption="Responsive UI audit results — final".

- [ ] **Step 6: STOP — do not push to remote.** Per the autonomous-loop completion rule, this is the final phase. Surface the summary and halt; the user decides when to push.

---

## Self-review

### Spec coverage map

- **§1 Goal** — Phases A-D collectively
- **§2 Non-goals** — respected; dark-mode triage rule applied in C* tasks
- **§3 Standards / browser support matrix** — A1 codifies fluid scale; A3-A5 codify touch targets; A2 pointer/hover queries
- **§4.1 Breakpoints** — Tailwind defaults unchanged (no spec-level change needed)
- **§4.2 Design tokens** — A1; the dropped A2 (CSS vars) is documented as an intentional removal in the §4.2 asymmetry note in C1
- **§4.3 Touch & pointer policy** — A2 + A3 + A4 + A5
- **§4.4 Specificity gotcha** — A2 scopes everything to `#colign-root`
- **§5.1 Container queries** — C8 (TeamRollupTable card view) + C9 (IcDrillDrawer full-screen via CSS, not JS)
- **§5.2 Where NOT** — respected; Card primitive not touched
- **§5.3 Browser support** — covered in spec §3 browser matrix
- **§6.1 Tool** — `/browse` used throughout Phase C
- **§6.2 Viewport matrix** — 5×2 per screen
- **§6.3 Auth strategy + trap requirement** — Pre-Phase-C registers `trap`; B1 supports the contract
- **§6.4 Per-screen audit loop** — C1-C9 in user-journey order
- **§6.5 Screenshot storage + hygiene** — `tmp/responsive-audit/`; capture-hygiene reminder in Pre-Phase-C
- **§6.6 Regression layer + dense-control exceptions** — D0+D1+D2+D3; allowlist regex enforced
- **§7 Files touched** — covered (backend deferred per §9.4)
- **§8 Definition of done** — A* + C* deliver matrix pass; D1-D3 deliver Cypress; D4 delivers real-phone smoke + auth restore
- **§9 Strategic / pre-existing notes** — D4 summary surfaces them; B2 partially addresses §9.4 P1 by hardening the Vite middleware

**Gaps:** none requiring new tasks. Backend startup guard (§9.4 P0) is deferred per autonomous-loop rail; committed mock private key (§9.4 P0) deferred per spec.

### Placeholder scan

Searched for "TBD", "TODO", "implement later", "fill in details", "Similar to Task N". None present. The phrase "if issues found" in C1-C7 is the audit's intentional discovery shape (checklist is concrete; fix code is conditional because we genuinely don't know what we'll find).

### Type consistency check

- `closeAffordance: "x" | "back"` added in A4 (Drawer) → consumed in C9 with `closeAffordance="back"`. Match.
- Drawer `width` prop kept (not renamed to `size`). IcDrillDrawer passes `width="xl"` unchanged. Match.
- `data-clickable="true"` introduced in C8 (TR + Card) → exercised by Cypress selector in D1 (`tr[data-clickable="true"], [data-clickable="true"]`). Match.
- `team-rollup-container` / `team-rollup-table-view` / `team-rollup-card-view` / `team-rollup-card-view-controls` defined in C8 responsive.css block → used in C8 TeamRollupTable JSX. Match (4 classes consistently named).
- `ic-drill-drawer-content` / `ic-drill-commit-list` defined in C9 responsive.css → used in C9 IcDrillDrawer JSX. Match.
- Cypress `DENSE_SELECTORS` and `DEV_API_PATTERN` defined in `responsive-assertions.ts` D1 → consumed only within the same file's helpers. Match.

No type/name drift detected.

### Cross-cutting fixes verified in self-review

- ✅ Drawer prop is `width` (preserved) not `size` (no rename)
- ✅ `HiX` imported (existing) + `HiArrowLeft` added (new)
- ✅ Button `variant="secondary"` (not `"outline"`)
- ✅ No `@[640px]:` Tailwind variants anywhere
- ✅ Cypress preflight = ALLOWLIST regex, rejects api.colign.org / *.fly.dev / staging.*
- ✅ `trap` registration is an explicit step in Pre-Phase-C and D3
- ✅ `audit-teardown.sh` APPENDS missing env vars (fixes backend `.env.local` no-line case)
- ✅ JWT TTL = 14400 in all mint commands (4hr covers full audit window)
- ✅ `location.reload()` follows every localStorage.setItem in C3/C8 (Redux re-init)
- ✅ Vite shell injection fixed in B2 before Phase C exercises it
- ✅ Cypress directory + config scaffolded in D0 before D1/D2/D3
- ✅ `tr[data-clickable="true"]` selector matches actual elements (added to TR + Card in C8)

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-31-responsive-ui-audit.md`. Per the autonomous-loop instruction in the user's initiation prompt, execution proceeds via `/superpowers:executing-plans` (Phase 4 of the loop).

**Estimated work:** ~22 commits across A1-D4, ~2-4 hours wall-clock for an experienced operator (variable based on issue density discovered during Phase C audit).
