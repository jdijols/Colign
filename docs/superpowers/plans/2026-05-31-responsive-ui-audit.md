# Responsive UI Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the responsiveness contract from the design spec across `apps/colign-frontend` + `apps/pa-host`, audit and fix 9 user-facing screens at 5 viewport widths × 2 color modes, and add a CI regression layer so future PRs can't drift.

**Architecture:** Three phases of foundation work land BEFORE the audit so the audit captures a clean baseline against the new contract: (A) token contract + touch policy stylesheet + component size token updates; (B) tooling (env teardown script); (C) per-screen audit in user-journey order, with deep refactors (TeamRollupTable card view, IcDrillDrawer full-screen) folded into the audit task for their respective screens; (D) Cypress regression layer + final results doc. Backend changes and the committed-mock-key rotation are explicitly deferred per spec §9.4.

**Tech Stack:** React 18 + Vite 5 + Tailwind 3 + Flowbite-react (colign-frontend); Vite 5 + plain CSS (pa-host); Vitest + Testing Library (unit/component tests); Cypress 13 (E2E); gstack `/browse` skill (screenshot capture).

**Source spec:** [docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md](../specs/2026-05-31-responsive-ui-audit-design.md)

---

## Phase A — Foundation contract (tasks A1–A6)

The token contract, touch policy stylesheet, and cross-cutting component size token updates must land first so the per-screen audit captures a clean baseline.

### Task A1: Add fluid type + spacing tokens to Tailwind config

**Files:**
- Modify: `apps/colign-frontend/tailwind.config.js`
- Test: `apps/colign-frontend/src/lib/tokens.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/colign-frontend/src/lib/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config.js";

describe("Tailwind fluid token contract", () => {
  it("exposes the fluid type scale per spec §4.2", () => {
    const fontSize = tailwindConfig.theme.extend.fontSize as Record<string, string>;
    expect(fontSize["fluid-sm"]).toBe(
      "clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)"
    );
    expect(fontSize["fluid-base"]).toBe(
      "clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)"
    );
    expect(fontSize["fluid-lg"]).toBe(
      "clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)"
    );
    expect(fontSize["fluid-xl"]).toBe(
      "clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)"
    );
    expect(fontSize["fluid-2xl"]).toBe(
      "clamp(1.5rem, 1.36rem + 0.71vw, 2rem)"
    );
    expect(fontSize["fluid-3xl"]).toBe(
      "clamp(1.875rem, 1.55rem + 1.61vw, 3rem)"
    );
  });

  it("exposes section-fluid spacing per spec §4.2", () => {
    const spacing = tailwindConfig.theme.extend.spacing as Record<string, string>;
    expect(spacing["section-fluid"]).toBe(
      "clamp(1.5rem, 1.0rem + 2.5vw, 4rem)"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/colign-frontend && yarn vitest run src/lib/tokens.test.ts`
Expected: FAIL — keys do not exist on `theme.extend`.

- [ ] **Step 3: Add tokens to `tailwind.config.js`**

In `apps/colign-frontend/tailwind.config.js`, extend `theme.extend`:

```js
theme: {
  extend: {
    colors: { /* existing colignAccent block stays */ },
    fontFamily: { /* existing sans/mono blocks stay */ },
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
  },
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/colign-frontend && yarn vitest run src/lib/tokens.test.ts`
Expected: PASS — both `it` blocks green.

- [ ] **Step 5: Rebuild compiled CSS + check disk**

Run: `cd apps/colign-frontend && yarn build:css`
Expected: exits 0, `src/colign-compiled.css` regenerated.

Run: `grep -c "fluid-base" apps/colign-frontend/src/colign-compiled.css`
Expected: at least 1 occurrence — confirms Tailwind emitted the utility class.

(Per [colign-dev-runbook](../../../../.claude/projects/-Users-jasondijols-Documents-Code-Projects-Colign/memory/colign-dev-runbook.md) gotcha #1, always grep -c the marker on disk BEFORE committing frontend changes.)

- [ ] **Step 6: Commit**

```bash
git add apps/colign-frontend/tailwind.config.js \
        apps/colign-frontend/src/lib/tokens.test.ts \
        apps/colign-frontend/src/colign-compiled.css
git commit -m "feat(responsive): add fluid type + spacing tokens per spec §4.2"
```

---

### Task A2: Mirror Tailwind tokens as CSS custom properties on :root

**Files:**
- Modify: `apps/colign-frontend/src/index.css`

CSS custom properties give non-Tailwind code paths (raw CSS, future components, debugging in DevTools) a way to read the same fluid values. Per spec §4.2: "A `:root` CSS custom property block... mirrors these same values."

- [ ] **Step 1: Inspect current `index.css` structure**

Run: `head -40 apps/colign-frontend/src/index.css`
Note where `@tailwind base; @tailwind components; @tailwind utilities;` directives live.

- [ ] **Step 2: Add `@layer base :root` block**

Inside `apps/colign-frontend/src/index.css`, after the `@tailwind` directives:

```css
@layer base {
  :root {
    --text-fluid-sm: clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem);
    --text-fluid-base: clamp(0.9375rem, 0.91rem + 0.16vw, 1rem);
    --text-fluid-lg: clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem);
    --text-fluid-xl: clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem);
    --text-fluid-2xl: clamp(1.5rem, 1.36rem + 0.71vw, 2rem);
    --text-fluid-3xl: clamp(1.875rem, 1.55rem + 1.61vw, 3rem);
    --space-section-fluid: clamp(1.5rem, 1.0rem + 2.5vw, 4rem);
  }
}
```

- [ ] **Step 3: Rebuild + verify on disk**

Run: `cd apps/colign-frontend && yarn build:css`
Run: `grep -c "text-fluid-base" apps/colign-frontend/src/colign-compiled.css`
Expected: at least 2 occurrences (one for the Tailwind utility added in A1, one for the `:root` block from A2).

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/src/index.css apps/colign-frontend/src/colign-compiled.css
git commit -m "feat(responsive): mirror fluid tokens as :root CSS custom properties"
```

---

### Task A3: Create the touch & pointer policy stylesheet

**Files:**
- Create: `apps/colign-frontend/src/responsive.css`
- Modify: `apps/colign-frontend/src/main.tsx`

Per spec §4.3 + §4.4, the touch policy stylesheet must compete on equal footing with Tailwind's `important: "#colign-root"` scoping. We use Option 2 from §4.4: author rules inside `@layer utilities` and scope to `#colign-root` for matched specificity. This keeps the rules in one file and lets them override Tailwind utilities at the same specificity tier.

- [ ] **Step 1: Create `responsive.css`**

Create `apps/colign-frontend/src/responsive.css`:

```css
/*
 * Responsive UI touch & pointer policy — implements spec §4.3.
 *
 * Scoped to #colign-root to match the specificity of Tailwind utilities
 * that compile to `#colign-root .foo` under important: "#colign-root".
 * See spec §4.4.
 */
@layer utilities {
  /* === Coarse pointers (touch): primary interactive elements ≥ 44×44 === */
  @media (pointer: coarse) {
    #colign-root button:not([data-dense-control="true"]):not(th button):not([aria-label*="agination" i]):not([data-testid*="pagination"]),
    #colign-root a[role="button"]:not([data-dense-control="true"]),
    #colign-root input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
    #colign-root select,
    #colign-root [role="button"]:not([data-dense-control="true"]) {
      min-height: 44px;
      min-width: 44px;
    }

    /* Checkboxes/radios get the larger hit-target via padding on their label */
    #colign-root label:has(input[type="checkbox"]),
    #colign-root label:has(input[type="radio"]) {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }

  /* === Fine pointers (cursor): allow denser desktop layouts === */
  @media (pointer: fine) {
    #colign-root button:not([data-dense-control="true"]):not(th button) {
      min-height: 32px;
    }
  }

  /* === Hover capability gating === */
  /* Affordances that hide behind hover-only are an accessibility risk on
     touch devices. The audit prefers always-visible by default; this block
     ensures any future :hover-only chrome stays revealed on (hover: none). */
  @media (hover: none) {
    #colign-root [data-hover-only="true"] {
      opacity: 1 !important;
      visibility: visible !important;
    }
  }

  /* === Viewport units: dvh propagation === */
  /* Any element using vh-based sizing should fall back gracefully to dvh
     where authored. This is documentation-only; per-component dvh usage is
     applied at the component level. */
}
```

- [ ] **Step 2: Import `responsive.css` from `main.tsx`**

Read: `apps/colign-frontend/src/main.tsx` — find the line that imports `./index.css` (or compiled CSS).

Add immediately after that import:

```tsx
import "./responsive.css";
```

- [ ] **Step 3: Rebuild + verify on disk**

Run: `cd apps/colign-frontend && yarn build`
Expected: build succeeds. (CSS-only changes don't require a separate test pass here; the visual verification happens in Task A6 + audit phase.)

Run: `grep -rn "responsive.css" apps/colign-frontend/src/main.tsx`
Expected: at least one match — confirms the import landed on disk.

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/src/responsive.css apps/colign-frontend/src/main.tsx
git commit -m "feat(responsive): add touch & pointer policy stylesheet"
```

---

### Task A4: Update `Button` SIZES so coarse pointers meet the 44px floor

**Files:**
- Modify: `apps/colign-frontend/src/components/ui/Button.tsx`
- Test: `apps/colign-frontend/src/components/ui/Button.test.tsx` (create or extend)

Per feasibility-review finding: existing Button uses fixed-height utilities (`h-7`/`h-9`/`h-10` = 28/36/40 px). The responsive.css `min-height: 44px` rule WILL override these on coarse pointers — but only at runtime, in browser, with the media query active. Component tests run in jsdom which does not simulate `(pointer: coarse)`. So the test asserts the size-prop → class-name contract, and we rely on responsive.css for runtime enforcement.

- [ ] **Step 1: Inspect current Button SIZES**

Run: `grep -n "h-7\|h-9\|h-10\|SIZES" apps/colign-frontend/src/components/ui/Button.tsx`

Expected: lines 26-30 contain the SIZES map.

- [ ] **Step 2: Write the failing test**

Create or extend `apps/colign-frontend/src/components/ui/Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button size contract", () => {
  it("size=sm includes h-8 (32px) — meets pointer:fine floor", () => {
    render(<Button size="sm">Tap</Button>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.className).toMatch(/\bh-8\b/);
  });

  it("size=md includes h-10 (40px) and runtime ≥44 via responsive.css on coarse", () => {
    render(<Button size="md">Tap</Button>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.className).toMatch(/\bh-10\b/);
  });

  it("size=lg includes h-11 (44px) — meets coarse-pointer floor at compile time", () => {
    render(<Button size="lg">Tap</Button>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.className).toMatch(/\bh-11\b/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/colign-frontend && yarn vitest run src/components/ui/Button.test.tsx`
Expected: 2 of 3 fail (current sm=h-7, lg=h-10; md=h-9).

- [ ] **Step 4: Update SIZES**

In `apps/colign-frontend/src/components/ui/Button.tsx`, update the SIZES map:

```tsx
// BEFORE: sm: 'h-7 px-2.5', md: 'h-9 px-3', lg: 'h-10 px-4'
const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
} as const;
```

Reasoning:
- `sm`: h-8 (32 px) matches the `pointer: fine` floor in responsive.css. Used for dense desktop chrome
- `md`: h-10 (40 px) at compile time; runtime ≥44 on coarse via responsive.css
- `lg`: h-11 (44 px) at compile time — primary CTAs always meet the touch floor regardless of pointer

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/colign-frontend && yarn vitest run src/components/ui/Button.test.tsx`
Expected: all 3 PASS.

- [ ] **Step 6: Verify no broken usages**

Run: `cd apps/colign-frontend && yarn build`
Expected: TypeScript build succeeds — SIZES literal is `as const`, no consumers broken.

Run: `grep -rn 'size="sm"\|size="md"\|size="lg"' apps/colign-frontend/src --include="*.tsx" | head -20`
Note any high-traffic usages to spot-check during the per-screen audit.

- [ ] **Step 7: Commit**

```bash
git add apps/colign-frontend/src/components/ui/Button.tsx \
        apps/colign-frontend/src/components/ui/Button.test.tsx
git commit -m "feat(responsive): bump Button sizes — md=h-10, lg=h-11 for 44px touch floor"
```

---

### Task A5: Update `Drawer` close button to ≥44×44 and add `BackArrow` variant prop

**Files:**
- Modify: `apps/colign-frontend/src/components/ui/Drawer.tsx`

Per spec §5.1, IcDrillDrawer's full-screen mode needs a back-arrow affordance replacing the X. We add a `closeAffordance` prop to Drawer with `"x"` (default) and `"back"` variants. The drawer container itself takes a new `fullScreen` prop that consumers (only IcDrillDrawer, today) can flip based on their container query / pointer state.

- [ ] **Step 1: Inspect current Drawer close button + width logic**

Run: `grep -n "h-10 w-10\|WIDTHS\|max-w-\|aria-label.*Close" apps/colign-frontend/src/components/ui/Drawer.tsx`

Expected: WIDTHS object around line 15-19; close button around line 140-148.

- [ ] **Step 2: Update close button + add affordance variants**

Locate the close-button render block in `Drawer.tsx`. Replace the existing `<button>...HiOutlineX...</button>` with:

```tsx
<button
  type="button"
  onClick={onClose}
  aria-label={closeAffordance === "back" ? "Back to previous view" : "Close"}
  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
>
  {closeAffordance === "back" ? (
    <HiOutlineArrowLeft className="h-5 w-5" />
  ) : (
    <HiOutlineX className="h-5 w-5" />
  )}
</button>
```

Add `HiOutlineArrowLeft` to the imports at the top of `Drawer.tsx`:

```tsx
import { HiOutlineX, HiOutlineArrowLeft } from "react-icons/hi";
```

- [ ] **Step 3: Add `closeAffordance` and `fullScreen` props**

Update the Drawer component prop interface and the outer container width logic:

```tsx
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: keyof typeof WIDTHS;
  closeAffordance?: "x" | "back"; // NEW — default "x"
  fullScreen?: boolean; // NEW — overrides size when true; used by IcDrillDrawer per spec §5.1
}

export function Drawer({
  open,
  onClose,
  children,
  size = "md",
  closeAffordance = "x",
  fullScreen = false,
}: DrawerProps) {
  const widthClass = fullScreen ? "w-full max-w-none" : WIDTHS[size];
  // ... rest uses widthClass instead of WIDTHS[size]
}
```

- [ ] **Step 4: Run existing Drawer tests + build**

Run: `cd apps/colign-frontend && yarn vitest run --reporter=basic | grep -i drawer`
Expected: existing tests pass (close-button class names changed but role+aria-label unchanged).

Run: `cd apps/colign-frontend && yarn build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/src/components/ui/Drawer.tsx
git commit -m "feat(responsive): Drawer close ≥44×44 + add back-arrow + fullScreen prop"
```

---

### Task A6: Bump `AppShell` hamburger to ≥44×44

**Files:**
- Modify: `apps/colign-frontend/src/components/AppShell.tsx`

Per spec §6.4, the hamburger is `h-10 w-10` (40 px). Trivial fix to h-11 w-11.

- [ ] **Step 1: Locate the hamburger button**

Run: `grep -n "h-10 w-10\|HiOutlineMenu" apps/colign-frontend/src/components/AppShell.tsx`

Expected: line ~84-96 contains the button with `h-10 w-10`.

- [ ] **Step 2: Update**

Replace `h-10 w-10` with `h-11 w-11` in the hamburger button. Specific change to make the rendered diff exactly one character pair (10→11) in two places:

```tsx
className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 ..."
```

- [ ] **Step 3: Verify on disk**

Run: `grep -n "h-11 w-11" apps/colign-frontend/src/components/AppShell.tsx`
Expected: one match. (per dev-runbook gotcha #1)

- [ ] **Step 4: Build**

Run: `cd apps/colign-frontend && yarn build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/src/components/AppShell.tsx
git commit -m "feat(responsive): AppShell hamburger ≥44×44 (h-11 w-11)"
```

---

## Phase B — Tooling (tasks B1)

### Task B1: Create `scripts/audit-teardown.sh`

**Files:**
- Create: `scripts/audit-teardown.sh`

Per spec §6.3, this script snapshots and restores `.env.local` files so the audit's auth-mode flips can never strand the codebase in mock mode. The audit workflow MUST `trap restore EXIT` so an interrupted run still restores.

- [ ] **Step 1: Verify the script directory exists**

Run: `ls scripts/ | head -5`
Expected: directory listing showing existing scripts (e.g., `mock-jwt.mjs`).

- [ ] **Step 2: Write the script**

Create `scripts/audit-teardown.sh` with the following content:

```bash
#!/usr/bin/env bash
# scripts/audit-teardown.sh
#
# Snapshots .env.local files at audit start so audit-mode flips can never
# strand the repo in mock auth mode. Per spec §6.3 — replaces a "hard step
# at end of workflow" sentence with mechanically-enforced restore.
#
# Usage:
#   scripts/audit-teardown.sh flip       # snapshot + flip to mock
#   scripts/audit-teardown.sh restore    # restore from snapshot
#
# Inside the audit workflow:
#   trap 'scripts/audit-teardown.sh restore' EXIT INT TERM
#   scripts/audit-teardown.sh flip
#   # ... audit work ...
#   # restore runs automatically on exit

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_DIR="$REPO_ROOT/.audit-snapshot"
FRONTEND_ENV="$REPO_ROOT/apps/colign-frontend/.env.local"
BACKEND_ENV="$REPO_ROOT/apps/colign-backend/.env.local"

cmd_flip() {
  if [ -d "$SNAPSHOT_DIR" ]; then
    echo "ERROR: $SNAPSHOT_DIR already exists. Either an audit is in progress, or a prior run did not restore cleanly."
    echo "Inspect the snapshot, then either run 'restore' or remove $SNAPSHOT_DIR manually."
    exit 1
  fi
  mkdir -p "$SNAPSHOT_DIR"

  if [ -f "$FRONTEND_ENV" ]; then
    cp "$FRONTEND_ENV" "$SNAPSHOT_DIR/frontend.env.local"
    sed -i.bak 's/^VITE_AUTH_MODE=.*/VITE_AUTH_MODE=mock/' "$FRONTEND_ENV"
    rm -f "$FRONTEND_ENV.bak"
    echo "✓ Frontend flipped to VITE_AUTH_MODE=mock"
  else
    echo "WARNING: $FRONTEND_ENV does not exist; nothing to flip on frontend"
  fi

  if [ -f "$BACKEND_ENV" ]; then
    cp "$BACKEND_ENV" "$SNAPSHOT_DIR/backend.env.local"
    sed -i.bak 's/^COLIGN_AUTH_MODE=.*/COLIGN_AUTH_MODE=mock/' "$BACKEND_ENV"
    rm -f "$BACKEND_ENV.bak"
    echo "✓ Backend flipped to COLIGN_AUTH_MODE=mock"
  else
    echo "WARNING: $BACKEND_ENV does not exist; nothing to flip on backend"
  fi

  echo "Snapshot stored at $SNAPSHOT_DIR — DO NOT delete until 'restore' has run."
}

cmd_restore() {
  if [ ! -d "$SNAPSHOT_DIR" ]; then
    echo "No snapshot at $SNAPSHOT_DIR — nothing to restore."
    return 0
  fi

  if [ -f "$SNAPSHOT_DIR/frontend.env.local" ]; then
    cp "$SNAPSHOT_DIR/frontend.env.local" "$FRONTEND_ENV"
    echo "✓ Frontend env restored"
  fi
  if [ -f "$SNAPSHOT_DIR/backend.env.local" ]; then
    cp "$SNAPSHOT_DIR/backend.env.local" "$BACKEND_ENV"
    echo "✓ Backend env restored"
  fi

  rm -rf "$SNAPSHOT_DIR"
  echo "Snapshot removed. Auth mode restored."
}

case "${1:-}" in
  flip) cmd_flip ;;
  restore) cmd_restore ;;
  *)
    echo "Usage: $0 {flip|restore}"
    exit 64
    ;;
esac
```

- [ ] **Step 3: Make executable**

Run: `chmod +x scripts/audit-teardown.sh`

- [ ] **Step 4: Add `.audit-snapshot/` to `.gitignore`**

Run: `grep -q "^.audit-snapshot/" .gitignore || echo ".audit-snapshot/" >> .gitignore`

Then verify:
Run: `grep "audit-snapshot" .gitignore`
Expected: one match.

- [ ] **Step 5: Smoke-test the script (does not flip anything yet)**

Run: `scripts/audit-teardown.sh restore`
Expected: outputs "No snapshot at .audit-snapshot — nothing to restore." and exits 0.

Run: `scripts/audit-teardown.sh nonexistent`
Expected: outputs usage message and exits 64.

(We don't run `flip` here — that would actually flip the env files. The real flip + restore cycle happens in Phase C.)

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-teardown.sh .gitignore
git commit -m "feat(responsive): audit-teardown.sh for env snapshot+restore per spec §6.3"
```

---

## Phase C — Per-screen audit (tasks C1–C9)

Each screen task follows the same shape: capture baseline → identify issues → apply fixes → recapture → log to results doc. For screens where deep refactors are required (TeamRollupTable card view, IcDrillDrawer full-screen), the fix step expands accordingly.

**Pre-Phase-C startup checks (RUN ONCE before C1):**

- [ ] **Verify mock JWT minting works** (per spec §6.3 precondition)

Run: `node scripts/mock-jwt.mjs --email audit-ic@colign.test --role IC --ttl 3600`
Expected: outputs a JWT (3 base64-encoded segments separated by dots).

If this fails, STOP. The audit cannot proceed without a working mock JWT minter. Diagnose before continuing.

- [ ] **Flip to audit mode**

Run: `scripts/audit-teardown.sh flip`
Expected: confirms snapshot + flip. From here on, both env files have `*_AUTH_MODE=mock`.

- [ ] **Boot the stack in mock mode**

Open three terminals (or use a process manager):
- Backend: `cd apps/colign-backend && set -a && source .env.local && set +a && SPRING_PROFILES_ACTIVE=h2 COLIGN_AUTH_MODE=mock JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw spring-boot:run`
- Frontend (remote): `cd apps/colign-frontend && ./node_modules/.bin/vite --port 5174`
- Host: `cd apps/pa-host && ./node_modules/.bin/vite --port 4173`

Per dev runbook: user opens `:4173`, NOT `:5174`. The frontend is the federated remote consumed by the host.

- [ ] **Initialize the results doc**

Create `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md`:

```markdown
# Responsive UI Audit Results

**Audit date:** 2026-05-31
**Spec:** [docs/superpowers/specs/2026-05-31-responsive-ui-audit-design.md](2026-05-31-responsive-ui-audit-design.md)
**Plan:** [docs/superpowers/plans/2026-05-31-responsive-ui-audit.md](../plans/2026-05-31-responsive-ui-audit.md)

Per-screen findings appended below as the audit progresses.

---
```

Commit:
```bash
git add docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "docs(audit): initialize responsive UI audit results doc"
```

---

### Task C1: Audit `HostHome` (pa-host landing)

**Files:**
- Capture: `tmp/responsive-audit/HostHome/before/*.png`, `tmp/responsive-audit/HostHome/after/*.png`
- Modify (if issues found): `apps/pa-host/src/HostHome.tsx`
- Append to: `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md`

- [ ] **Step 1: Capture baseline matrix (10 screenshots)**

For each width in {320, 375, 768, 1024, 1440} and each mode in {light, dark}:

Run via the `/browse` skill:
```
/browse screenshot http://localhost:4173/ \
  --viewport-width <W> --viewport-height 900 \
  --output tmp/responsive-audit/HostHome/before/<W>-<mode>.png \
  --color-scheme <mode>
```

(Concretely: 10 captures — 320-light, 320-dark, 375-light, 375-dark, 768-light, 768-dark, 1024-light, 1024-dark, 1440-light, 1440-dark.)

- [ ] **Step 2: Review screenshots against checklist**

For each width × mode, check:
- ☐ No horizontal scroll on `<body>`
- ☐ No text clipping or overlap
- ☐ "Get started" CTA is fully tappable and ≥44×44
- ☐ Footer links don't collide with brand/CTA
- ☐ Headline `text-wrap: balance` not producing awkward line breaks at 320
- ☐ Dark mode: layout matches light (color-only differences are out of scope)

Log findings to the results doc under a new `## HostHome` heading, organized by severity bucket (WCAG-fail / broken-on-mobile / polish).

- [ ] **Step 3: Apply fixes if any "WCAG-fail" or "broken-on-mobile" issues**

Common fixes for HostHome (anticipate based on review of the current code):
- If footer wraps badly at 320: add `flex-wrap` to the footer container
- If headline `clamp(44px, 8.5vw, 108px)` produces too-large headline at 320: tighten the formula
- If `prefers-reduced-motion` user sees broken layout: verify the CTA still renders

Make targeted edits to `apps/pa-host/src/HostHome.tsx`. Per dev-runbook gotcha #1: after each edit, `grep -c <marker>` the file on disk before committing.

- [ ] **Step 4: Capture after-matrix (same 10 widths × modes)**

Run `/browse` 10 times again with `--output tmp/responsive-audit/HostHome/after/<W>-<mode>.png`.

- [ ] **Step 5: Append to results doc**

Append a section like:

```markdown
## HostHome (pa-host landing)

**Audited at:** 320 / 375 / 768 / 1024 / 1440 px × light + dark

**Findings:**
- WCAG-fail: (list, or "none")
- Broken-on-mobile: (list, or "none")
- Polish: (list, or "none")

**Fixes applied:**
- (list of bullet points, with file paths and brief description)

**Screenshots:** `tmp/responsive-audit/HostHome/{before,after}/`
```

- [ ] **Step 6: Commit (only if changes applied)**

```bash
git add apps/pa-host/src/HostHome.tsx \
        docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "feat(responsive): HostHome — <one-line summary of fixes>"
```

(If no code changes were needed, commit ONLY the results doc with message `docs(audit): HostHome — clean, no fixes required`.)

- [ ] **Step 7: Smoke check (per autonomous-loop rail)**

Re-run the onboarding journey via `/browse` at 320 and 1440 to confirm HostHome → Login still navigates correctly. If anything breaks, STOP — the rail says not to break the onboarding journey under any circumstances.

---

### Task C2: Audit `LoginPage`

Same shape as C1. Public screen, no auth needed.

- [ ] **Step 1: Capture baseline at `http://localhost:4173/login`** (or whatever route LoginPage mounts at — verify via `apps/colign-frontend/src/main.tsx` or routing config)

Capture 10 screenshots into `tmp/responsive-audit/LoginPage/before/`.

- [ ] **Step 2: Checklist review**

Anticipated issues:
- Auth0 redirect button touch-target size on mobile
- "Continue with Google" button width at 320 — Flowbite-react default may overflow
- Sign-in form padding on iOS — `env(safe-area-inset-bottom)` if there's a sticky CTA

- [ ] **Step 3: Apply fixes if needed**

Modify: `apps/colign-frontend/src/pages/LoginPage.tsx` (only if issues found).

- [ ] **Step 4: Capture after-matrix into `tmp/responsive-audit/LoginPage/after/`**

- [ ] **Step 5: Append findings to results doc**

- [ ] **Step 6: Commit**

- [ ] **Step 7: Smoke check at 320 + 1440 — confirms HostHome → Login → (back) → HostHome still works**

---

### Task C3: Audit `OnboardingChoicePage`

**Pre-step:** mint IC JWT, inject into localStorage:

Run: `node scripts/mock-jwt.mjs --email audit-ic@colign.test --role IC` and copy the JWT. Use `/browse evaluate` to set:
```js
localStorage.setItem('colign_jwt', '<jwt>');
localStorage.setItem('colign_email', 'audit-ic@colign.test');
localStorage.setItem('colign_role', 'IC');
```

Then navigate to `http://localhost:4173/` — the AuthGate should let the IC user through to the onboarding choice page.

- [ ] **Step 1: Capture baseline at the onboarding choice screen** — 10 screenshots
- [ ] **Step 2: Checklist review** — IC choice buttons ≥44×44, no text clipping on the choice card descriptions
- [ ] **Step 3: Apply fixes if needed** in `apps/colign-frontend/src/pages/OnboardingChoicePage.tsx`
- [ ] **Step 4: Capture after-matrix**
- [ ] **Step 5: Append findings**
- [ ] **Step 6: Commit**
- [ ] **Step 7: Smoke check**

---

### Task C4: Audit `InviteTeammatesPage`

**Pre-step:** Use the same IC JWT path. From OnboardingChoicePage choose "Create a team" — that should land on InviteTeammatesPage.

- [ ] **Step 1: Capture baseline** — 10 screenshots
- [ ] **Step 2: Checklist** — email-input chip widths at 320, "Send invites" CTA touch target, "Skip" link tap target ≥24 with spacing
- [ ] **Step 3: Apply fixes in `apps/colign-frontend/src/pages/InviteTeammatesPage.tsx`**
- [ ] **Step 4: Capture after**
- [ ] **Step 5: Append findings**
- [ ] **Step 6: Commit**
- [ ] **Step 7: Smoke check the onboarding journey end-to-end**

---

### Task C5: Audit `InviteAcceptPage`

Public screen reached via an invitation token URL.

- [ ] **Pre-step:** generate a real invitation token from the backend (via the InviteTeammatesPage flow). Copy the token URL.
- [ ] **Step 1: Capture baseline at the invite-accept URL** — 10 screenshots
- [ ] **Step 2: Checklist** — "Accept invitation" CTA ≥44×44, team-name display doesn't overflow at 320
- [ ] **Step 3: Apply fixes in `apps/colign-frontend/src/pages/InviteAcceptPage.tsx`**
- [ ] **Step 4: Capture after**
- [ ] **Step 5: Append findings**
- [ ] **Step 6: Commit**
- [ ] **Step 7: Smoke check**

---

### Task C6: Audit `WeeklyPlanPage`

Primary IC screen. Pre-step: ensure IC user from C3-C4 has reached the weekly plan (post-onboarding).

- [ ] **Step 1: Capture baseline at the weekly plan view** — 10 screenshots
- [ ] **Step 2: Checklist** — commit row touch targets, "Add commit" CTA, "Lock plan" / "Lock & reconcile" CTA pair at 320 (likely needs stacking), edit/delete icons inside commit rows
- [ ] **Step 3: Apply fixes in `apps/colign-frontend/src/pages/WeeklyPlanPage.tsx`** + possibly `CommitRow.tsx` + `CommitForm.tsx`
- [ ] **Step 4: Capture after**
- [ ] **Step 5: Append findings**
- [ ] **Step 6: Commit**
- [ ] **Step 7: Smoke check**

---

### Task C7: Audit `ReconcilePage`

Reached from WeeklyPlanPage via "Lock & reconcile" action (which transitions plan state to RECONCILING).

- [ ] **Step 1: Capture baseline** — 10 screenshots
- [ ] **Step 2: Checklist** — reconcile-row controls, "Mark complete" / "Mark dropped" buttons, status pills, summary banner at 320
- [ ] **Step 3: Apply fixes in `apps/colign-frontend/src/pages/ReconcilePage.tsx`** + `ReconcileRow.tsx`
- [ ] **Step 4: Capture after**
- [ ] **Step 5: Append findings**
- [ ] **Step 6: Commit**
- [ ] **Step 7: Smoke check**

---

### Task C8: Audit `ManagerDashboardPage` + refactor `TeamRollupTable` (container query + card view)

**Pre-step:** mint MANAGER JWT and re-inject localStorage with `MANAGER` role.

Run: `node scripts/mock-jwt.mjs --email audit-mgr@colign.test --role MANAGER`

Use `/browse evaluate` to set:
```js
localStorage.setItem('colign_jwt', '<jwt>');
localStorage.setItem('colign_email', 'audit-mgr@colign.test');
localStorage.setItem('colign_role', 'MANAGER');
```

Navigate to `http://localhost:4173/manager` (or whatever route the manager dashboard mounts at).

- [ ] **Step 1: Capture baseline** at the manager dashboard — 10 screenshots. Expect the table to force horizontal scroll at 320; this is the issue the card view solves.

- [ ] **Step 2: Implement the container query + card view in `TeamRollupTable.tsx`**

This is the largest single change in the audit. Per spec §5.1:

1. Wrap the existing `<Table>` in a `<div>` with `container-type: inline-size` (use inline style for now — container-type isn't a Tailwind utility without a plugin):

```tsx
<div style={{ containerType: "inline-size" }}>
  {/* existing TableScroller+Table block — render only when container ≥ 640px */}
  <div className="hidden @[640px]:block">
    <TableScroller>
      <Table>
        {/* existing table content */}
      </Table>
    </TableScroller>
  </div>
  {/* card view — render when container < 640px */}
  <div className="@[640px]:hidden flex flex-col gap-2">
    {(data?.content ?? []).map((m) => (
      <TeamRollupCard key={m.userId} member={m} onSelect={onSelectMember} />
    ))}
  </div>
</div>
```

Note: `@[640px]:` is Tailwind's container-query variant syntax (requires `@tailwindcss/container-queries` plugin) — OR write raw CSS. To avoid adding a plugin in this PR, hand-author the `@container` queries in `responsive.css`:

Add to `apps/colign-frontend/src/responsive.css`:

```css
@layer components {
  .team-rollup-container {
    container-type: inline-size;
  }
  .team-rollup-table-view {
    display: block;
  }
  .team-rollup-card-view {
    display: none;
  }
  @container (max-width: 639.98px) {
    .team-rollup-table-view {
      display: none;
    }
    .team-rollup-card-view {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  }
}
```

Then use those class names in TeamRollupTable.

2. Create the card sub-component (can be inline in the same file):

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
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
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
          <span className="text-xs text-neutral-600 tabular-nums">
            {plan.commits.length} commit{plan.commits.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {plan ? (
          <div className="flex items-center gap-2 ml-auto">
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
        variant="outline"
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

3. Add a sort-chip row above the card view that exposes `displayName` and `weekStartDate` sort toggles:

```tsx
<div className="team-rollup-card-view-controls @[640px]:hidden flex gap-2 mb-2">
  <button
    type="button"
    onClick={() => toggleSort("displayName")}
    className={cn(
      "rounded-full px-3 py-1.5 text-xs font-medium border min-h-[44px]",
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
      "rounded-full px-3 py-1.5 text-xs font-medium border min-h-[44px]",
      sort === "weekStartDate"
        ? "bg-neutral-900 text-neutral-50 border-neutral-900 dark:bg-white dark:text-neutral-900"
        : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
    )}
  >
    Week {sort === "weekStartDate" ? (dir === "asc" ? "↑" : "↓") : ""}
  </button>
</div>
```

(Note: the controls element gets a separate `@container` rule via the `.team-rollup-card-view-controls` class — add it to responsive.css alongside the existing @container block.)

- [ ] **Step 3: Verify changes landed on disk**

Run: `grep -c "TeamRollupCard" apps/colign-frontend/src/components/TeamRollupTable.tsx`
Expected: at least 2 (function definition + usage).

Run: `grep -c "team-rollup-card-view" apps/colign-frontend/src/responsive.css`
Expected: at least 2.

- [ ] **Step 4: Build + run existing component tests**

Run: `cd apps/colign-frontend && yarn build && yarn vitest run`
Expected: all green. TeamRollupTable's existing tests should still pass (the table mode is preserved at ≥640px containers).

- [ ] **Step 5: Capture after-matrix** — 10 screenshots, confirming card view at 320/375 and table view at 768/1024/1440

- [ ] **Step 6: Append findings + commit**

```bash
git add apps/colign-frontend/src/components/TeamRollupTable.tsx \
        apps/colign-frontend/src/responsive.css \
        docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "feat(responsive): TeamRollupTable container query + card view per spec §5.1"
```

- [ ] **Step 7: Smoke check** — confirm the onboarding journey still completes for the IC role; manager dashboard still loads at all 5 widths

---

### Task C9: Audit `IcDrillDrawer` + add full-screen mode (container query + viewport rule + back affordance)

Reached by clicking a member row in the (now-card-view) manager dashboard.

- [ ] **Step 1: Capture baseline** — 10 screenshots, with the drawer opened on a member

- [ ] **Step 2: Implement container query + full-screen mode**

In `apps/colign-frontend/src/components/IcDrillDrawer.tsx`:

1. Detect when to render full-screen — coarse pointer AND viewport < md. Use a media query hook:

```tsx
function useCoarsePointerNarrow(): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse) and (max-width: 767.98px)");
    const update = () => setMatch(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return match;
}
```

2. Pass `fullScreen` and `closeAffordance` props to Drawer:

```tsx
export function IcDrillDrawer({ member, onClose }: Props) {
  const fullScreen = useCoarsePointerNarrow();
  return (
    <Drawer
      open={!!member}
      onClose={onClose}
      size="md"
      fullScreen={fullScreen}
      closeAffordance={fullScreen ? "back" : "x"}
    >
      <div style={{ containerType: "inline-size" }} className="ic-drill-drawer-content">
        {/* existing drawer content */}
      </div>
    </Drawer>
  );
}
```

3. Add the container-query rules to `responsive.css`:

```css
@layer components {
  .ic-drill-drawer-content {
    /* defaults match current layout */
  }
  @container (max-width: 479.98px) {
    .ic-drill-drawer-content .ic-drill-commit-list {
      grid-template-columns: 1fr !important;
      line-height: 1.7;
    }
  }
}
```

(The `.ic-drill-commit-list` selector assumes the commit list has that class — add it if it doesn't.)

- [ ] **Step 3: Verify on disk**

Run: `grep -c "useCoarsePointerNarrow\|fullScreen\|closeAffordance" apps/colign-frontend/src/components/IcDrillDrawer.tsx`
Expected: at least 3.

- [ ] **Step 4: Build + run tests**

Run: `cd apps/colign-frontend && yarn build && yarn vitest run`
Expected: all green.

- [ ] **Step 5: Capture after-matrix** — confirm side-drawer at 1024/1440, full-screen at 320/375

- [ ] **Step 6: Append findings + commit**

```bash
git add apps/colign-frontend/src/components/IcDrillDrawer.tsx \
        apps/colign-frontend/src/responsive.css \
        docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "feat(responsive): IcDrillDrawer full-screen on coarse+narrow per spec §5.1"
```

- [ ] **Step 7: Smoke check the manager journey end-to-end**

---

**Post-Phase-C cleanup:**

- [ ] **Restore real auth mode**

Run: `scripts/audit-teardown.sh restore`
Expected: confirms restore + cleanup of `.audit-snapshot/`.

- [ ] **Verify restore landed**

Run: `grep "VITE_AUTH_MODE\|COLIGN_AUTH_MODE" apps/colign-frontend/.env.local apps/colign-backend/.env.local`
Expected: both files show `*_AUTH_MODE=real` (or whatever the pre-audit values were).

---

## Phase D — Regression layer + completion (tasks D1–D4)

### Task D1: Write `responsive-narrow.cy.ts`

**Files:**
- Create: `apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`
- Create: `apps/colign-frontend/cypress/support/responsive-assertions.ts`

- [ ] **Step 1: Create the shared assertions support file**

Create `apps/colign-frontend/cypress/support/responsive-assertions.ts`:

```ts
const DENSE_SELECTORS = [
  "th button",
  '[aria-label*="agination" i] button',
  '[data-testid*="pagination"] button',
  '[data-dense-control="true"]',
];

const PROD_API_PATTERN = /^(https?:\/\/)?api\.colign\.org/i;

export function preflight(): void {
  const authMode = Cypress.env("VITE_AUTH_MODE") || "";
  if (authMode !== "mock") {
    throw new Error(
      `Responsive specs require VITE_AUTH_MODE=mock (got "${authMode}"). Aborting before navigation.`
    );
  }
  const apiBase = Cypress.env("VITE_API_BASE") || "";
  if (PROD_API_PATTERN.test(apiBase)) {
    throw new Error(
      `Responsive specs MUST NOT target the production API (VITE_API_BASE="${apiBase}"). Aborting.`
    );
  }
}

export function assertNoHorizontalScroll(): void {
  cy.window().then((win) => {
    const root = win.document.querySelector("#colign-root") ?? win.document.documentElement;
    const element = root as Element;
    expect(element.scrollWidth, "no horizontal scroll inside #colign-root").to.be.at.most(
      element.clientWidth + 1 // 1px slack for rounding
    );
  });
}

export function assertTouchTargets(): void {
  cy.window().then((win) => {
    const root = win.document.querySelector("#colign-root") ?? win.document.documentElement;
    const candidates = root.querySelectorAll(
      'a, button, input, select, [role="button"], tr[data-clickable="true"]'
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

- [ ] **Step 2: Create `responsive-narrow.cy.ts`**

Create `apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`:

```ts
import {
  preflight,
  assertNoHorizontalScroll,
  assertTouchTargets,
} from "../support/responsive-assertions";

describe("Responsive @ 320×568 (narrow stress test)", () => {
  before(() => {
    preflight();
    cy.viewport(320, 568);
  });

  it("HostHome → Login → OnboardingChoice → InviteTeammates → WeeklyPlan", () => {
    cy.visit("/");
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByTestId("landing-get-started").click();
    // Login mock auth: backend issues a mock JWT in mock mode
    cy.findByRole("button", { name: /sign in/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    // OnboardingChoicePage — pick "Create a team"
    cy.findByRole("button", { name: /create a team/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    // InviteTeammatesPage — skip
    cy.findByRole("link", { name: /skip/i }).click();
    assertNoHorizontalScroll();
    assertTouchTargets();

    // WeeklyPlanPage
    cy.findByRole("heading", { name: /this week/i, level: 1 }).should("be.visible");
    assertNoHorizontalScroll();
    assertTouchTargets();
  });
});
```

- [ ] **Step 3: Verify file on disk**

Run: `grep -c "describe.*320" apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts`
Expected: 1.

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/cypress/e2e/responsive-narrow.cy.ts \
        apps/colign-frontend/cypress/support/responsive-assertions.ts
git commit -m "test(responsive): add 320px regression spec for onboarding journey"
```

(Don't run the Cypress spec yet — it requires mock-auth env vars set, which the next task validates.)

---

### Task D2: Write `responsive-wide.cy.ts`

**Files:**
- Create: `apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts`

- [ ] **Step 1: Create the wide spec**

Create `apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts`:

```ts
import {
  preflight,
  assertNoHorizontalScroll,
  assertTouchTargets,
} from "../support/responsive-assertions";

describe("Responsive @ 1440×900 (desktop target)", () => {
  before(() => {
    preflight();
    cy.viewport(1440, 900);
  });

  it("HostHome → Login → OnboardingChoice → InviteTeammates → WeeklyPlan", () => {
    cy.visit("/");
    assertNoHorizontalScroll();
    assertTouchTargets();

    cy.findByTestId("landing-get-started").click();
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

- [ ] **Step 2: Verify on disk**

Run: `grep -c "describe.*1440" apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts`
Expected: 1.

- [ ] **Step 3: Commit**

```bash
git add apps/colign-frontend/cypress/e2e/responsive-wide.cy.ts
git commit -m "test(responsive): add 1440px regression spec for onboarding journey"
```

---

### Task D3: Run both Cypress specs against the running stack + verify preflight aborts on misconfig

**Files:**
- (Verify only — no source changes; results recorded in audit doc)

- [ ] **Step 1: Boot the stack in MOCK mode** (specifically for these specs)

Run: `scripts/audit-teardown.sh flip`
(Per the runbook this leaves both env files in mock mode. We'll restore at the end.)

Boot backend + frontend + host in the same shells as before.

- [ ] **Step 2: Run both specs**

Run: `cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=http://localhost:8080 yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts,cypress/e2e/responsive-wide.cy.ts"`
Expected: both specs pass. If they fail, log the failure to the audit results doc and STOP — diagnose before committing fixes.

- [ ] **Step 3: Verify preflight aborts**

Run: `cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=real yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts"`
Expected: suite aborts in the `before` hook with the "VITE_AUTH_MODE=mock" error. Records pass.

Run: `cd apps/colign-frontend && CYPRESS_VITE_AUTH_MODE=mock CYPRESS_VITE_API_BASE=https://api.colign.org yarn cy:run --spec "cypress/e2e/responsive-narrow.cy.ts"`
Expected: suite aborts with the "MUST NOT target production API" error.

- [ ] **Step 4: Restore env**

Run: `scripts/audit-teardown.sh restore`

- [ ] **Step 5: Append a "Regression layer verification" section to the results doc**

Briefly note: both specs pass; preflight aborts on each misconfig branch. List the command + outcome for each.

- [ ] **Step 6: Commit the results doc update**

```bash
git add docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "docs(audit): verify Cypress regression specs + CI preflight"
```

---

### Task D4: Real-phone smoke test + finalize results doc

This is the only step that requires a HUMAN to perform — the autonomous loop pauses here per its completion rules. The spec §8 requires this for DoD.

- [ ] **Step 1: Human runs onboarding on a real touch device**

Instructions to log inline in this task's results-doc section:
> Pull up `https://colign.org` (or local `http://<dev-machine-ip>:4173` if testing against the audit branch) on an actual phone — iPhone or Android. Complete: HostHome → Get started → Sign in → Create a team → Skip invites → land on Weekly Plan → add one commit. Note any friction or visible breakage.

The agent CANNOT do this autonomously; output a "Real-phone smoke test required" prompt and wait for the human's note.

- [ ] **Step 2: Capture the human's note in the results doc**

Append a `## Real-phone smoke test` section to `docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md` with the human's verbatim note + a "PASS / FAIL" status.

- [ ] **Step 3: Write the summary section**

Append a final `## Summary` section with:
- Number of screens audited
- Number of WCAG-fail / broken-on-mobile / polish findings (per bucket totals)
- Number of fixes applied (commits during Phase C, counted via `git log --oneline | grep "feat(responsive)"`)
- Deferred items (anything logged as "polish" that didn't get fixed; the backend startup guard from spec §9.4)
- Pre-existing security flags (committed mock private key, Vite shell injection) — link to spec §9.4

- [ ] **Step 4: Commit the final results doc**

```bash
git add docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md
git commit -m "docs(audit): finalize responsive UI audit results"
```

- [ ] **Step 5: Send the results doc to the user via SendUserFile**

Use the SendUserFile tool with:
- `files`: `["docs/superpowers/specs/2026-05-31-responsive-ui-audit-results.md"]`
- `status`: `"proactive"`
- `caption`: `"Responsive UI audit results — final"`

- [ ] **Step 6: STOP — do not push to remote**

Per the autonomous-loop completion rule: this is the final phase. Halt and surface the summary to the user. The user decides when to push.

---

## Self-review

### Spec coverage

Mapping each spec section to its implementing task(s):

- **§1 Goal** — Phases A-D collectively
- **§2 Non-goals** — respected in scope (no Flowbite rewrites, no Percy infra, dark-mode triage rule applied in C1-C9)
- **§3 Standards** — Task A1 codifies the fluid scale; A4-A6 codify touch targets; pointer/hover queries are in A3
- **§4.1 Breakpoint contract** — already exists; no Tailwind config change needed for breakpoints (only fontSize/spacing)
- **§4.2 Design tokens** — A1 + A2
- **§4.3 Touch & pointer policy** — A3 + A4 + A5 + A6
- **§4.4 Specificity gotcha** — A3 resolves it by using `#colign-root` scoping in `responsive.css`
- **§5.1 Container queries** — TeamRollupTable in C8; IcDrillDrawer in C9
- **§5.2 Where NOT** — respected (Card primitive excluded; no other components touched for CQ)
- **§5.3 Browser support** — no polyfill added (correct per spec)
- **§6.1 Tool** — `/browse` used in Phase C
- **§6.2 Viewport matrix** — 5 widths × 2 modes in every C task
- **§6.3 Auth strategy** — Phase C pre-step + Task B1 teardown script
- **§6.4 Per-screen audit loop** — C1-C9, ordered per spec
- **§6.5 Screenshot storage** — `tmp/responsive-audit/` (gitignored)
- **§6.6 Regression layer + dense-control exceptions** — D1 + D2 + D3 + the `responsive-assertions.ts` support file encodes the exception list
- **§7 Files touched** — covered (backend deferred per §9.4)
- **§8 Definition of done** — A1-A6 + C1-C9 fixes deliver visual matrix pass; D1-D3 deliver Cypress; D4 delivers real-phone smoke + auth restore; token contract verified by A1 test
- **§9 Strategic / pre-existing notes** — D4 summary surfaces them in the results doc

**Gaps identified during self-review:** none requiring new tasks. The backend guard (§9.4) is documented as deferred, not implemented — consistent with the autonomous-loop rail.

### Placeholder scan

Searched for "TBD", "TODO", "implement later", "fill in details", "Similar to Task N". None present in this plan.

The phrase "if issues found" appears in C1-C7 — this is NOT a placeholder; it's the audit's intentional discovery shape. The CHECKLIST step is concrete (what to verify); the FIX step is conditional because we genuinely don't know what we'll find. Common-fix examples are provided per screen as anticipatory guidance.

### Type consistency

- `closeAffordance` and `fullScreen` props introduced in A5 (Drawer) — consumed in C9 (IcDrillDrawer). Names match.
- `useCoarsePointerNarrow` defined inline in C9 — used only within that task. No cross-task type drift.
- `TeamRollupCard` defined inline in C8 — used only within that task.
- `DENSE_SELECTORS` array in `responsive-assertions.ts` (D1) — selectors match those in the spec §6.6 exception list verbatim.
- `assertNoHorizontalScroll` / `assertTouchTargets` / `preflight` exported from `responsive-assertions.ts` in D1 — imported by D1 and D2 with matching names.

No type drift detected.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-31-responsive-ui-audit.md`.

Per the autonomous-loop instruction in the user's initiation prompt: **execution proceeds via `/superpowers:executing-plans` (Phase 4 of the loop)**. The execution sub-skill choice was pre-decided by the loop; no choice prompt fires here.

**Estimated work:** ~25 commits across A1-D4, ~1-3 hours wall-clock for an experienced operator (variable based on issue density discovered during Phase C audit).
