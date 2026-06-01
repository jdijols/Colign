---
date: 2026-06-01
slug: feat-sidebar-navigation
plan_type: feat
status: active
origin: docs/brainstorms/2026-06-01-sidebar-navigation-requirements.md
---

# Feat: sidebar navigation rewrite

## Summary

Replace the header-based `AppShell` in `apps/colign-frontend` with a Notion-style left-rail sidebar: workspace pill at top, four flat routes (Plan, Reconcile, Team, Settings) in the middle, user chip pinned at the bottom expanding into a popover for theme + signout. Below 768px the sidebar hides behind a hamburger that slides it in as a drawer overlay. Lands as one focused PR.

---

## Problem Frame

See origin doc for full framing. In short: the current header reads MVP, Settings is buried in a user-menu dropdown, workspace identity is a wedged chip, and the next product work (deeper manager dashboards, Strategy/Outcomes admin, Insights) will need more nav real estate than a top header carries comfortably.

---

## Requirements traced from origin

All 15 requirements in [docs/brainstorms/2026-06-01-sidebar-navigation-requirements.md](../brainstorms/2026-06-01-sidebar-navigation-requirements.md) are in scope. Implementation Unit mapping below:

- R1 (sidebar replaces header ≥768px) → U2
- R2 (4 routes, flat) → U2
- R3 (Team hidden for IC) → U2; AE1 → U2 tests
- R4 (Settings reachable for all, mgmt gated) → U2; AE2 → U4 (Cypress) + U2 unit
- R5 (workspace pill at top) → U1, U2
- R6 (brand integrated into pill area) → U1, U2
- R7 (user chip at bottom) → U1, U2
- R8 (popover with theme + signout) → U1; AE3 → U5 unit
- R9 (active-route left-edge accent) → U2
- R10 (icon + label per route) → U2
- R11 (hidden below 768px, top strip with hamburger) → U3
- R12 (hamburger slides in overlay, multi-path dismiss) → U3; AE4 → U3 unit
- R13 (user chip visible inside drawer) → U3
- R14 (in remote, not host) → covered by file scope across units (all changes in `apps/colign-frontend/`)
- R15 (Cypress workspace-settings step updated) → U4

---

## Output Structure

```
apps/colign-frontend/src/
├── components/
│   ├── SidebarShell.tsx          ← new (replaces header in AppShell.tsx)
│   ├── WorkspacePill.tsx         ← new (extends TeamPill's pattern, larger size for the rail top)
│   ├── NavRail.tsx               ← new (the 4 flat route links + role gate)
│   ├── UserChip.tsx              ← new (bottom chip + popover trigger)
│   ├── SidebarShell.test.tsx     ← new
│   ├── NavRail.test.tsx          ← new
│   ├── UserChip.test.tsx         ← new
│   ├── AppShell.tsx              ← modified (renders SidebarShell, hands props in)
│   ├── TeamPill.tsx              ← preserved (still used by WorkspacePill or as-is)
│   ├── UserMenu.tsx              ← DELETED in U5
│   └── UserMenu.test.tsx         ← DELETED in U5
├── lib/
│   ├── usePopover.ts             ← new (extracted Esc + click-outside + focus return)
│   └── usePopover.test.ts        ← new
└── cypress/
    └── e2e/workspace-settings/
        └── workspace-settings.ts ← modified (step rephrased to sidebar entry)
```

The per-unit `**Files:**` sections below are authoritative.

---

## Implementation Units

### U1. Extract `usePopover` hook and build sidebar primitives

**Goal:** Build the reusable popover behavior + the three new presentational components (`WorkspacePill`, `NavRail`, `UserChip`) and the layout shell (`SidebarShell`) that composes them. No wiring into `AppShell` yet — this unit is pure component work.

**Requirements:** R5, R6, R7, R8 (popover behavior + visual primitives).

**Dependencies:** none.

**Files:**
- `apps/colign-frontend/src/lib/usePopover.ts` (new)
- `apps/colign-frontend/src/lib/usePopover.test.ts` (new)
- `apps/colign-frontend/src/components/WorkspacePill.tsx` (new)
- `apps/colign-frontend/src/components/NavRail.tsx` (new)
- `apps/colign-frontend/src/components/UserChip.tsx` (new)
- `apps/colign-frontend/src/components/SidebarShell.tsx` (new)

**Approach:**
- `usePopover({ onClose })`: returns `{ open, setOpen, triggerRef, panelRef }`. Wires Esc + mousedown-outside listeners on `open=true`, returns focus to `triggerRef` on close. Extracted from the existing `UserMenu` behavior at [apps/colign-frontend/src/components/UserMenu.tsx:25-48](../../apps/colign-frontend/src/components/UserMenu.tsx) — the logic is the same, just made reusable.
- `WorkspacePill({ name, avatarUrl })`: visually like the existing [TeamPill](../../apps/colign-frontend/src/components/TeamPill.tsx) but sized for the sidebar top (slightly larger avatar, full-row layout, brand mark integrated to the left of the team identity). Non-interactive in this iteration; a clickable variant is parked for the future workspace switcher.
- `NavRail({ role })`: renders the 4 route links via `<NavLink>`. The Team link is omitted when `role === "IC"`. Each link has a `react-icons/hi` glyph + label. Active state via `border-l-2 border-neutral-900 dark:border-white` + `bg-neutral-100 dark:bg-neutral-900` on the `isActive` path of the NavLink className.
- `UserChip({ email, role, avatarUrl, displayName, onSignOut })`: clickable row at the bottom showing avatar/initial + display name + role badge. Click opens a popover anchored above containing exactly two items: a theme toggle (re-use the existing `<ThemeToggle>` from `components/ui`) and a Sign out button. Wires `usePopover` for Esc/click-out behavior.
- `SidebarShell({ me, onSignOut, children })`: composes `WorkspacePill` (top) + `NavRail` (middle) + `UserChip` (bottom) into a 240px-wide vertical rail with `<main>` as siblings. Desktop-only layout in this unit — narrow-viewport behavior comes in U3.

**Patterns to follow:**
- Tailwind primitives + cn() helper from `apps/colign-frontend/src/lib/cn.ts` (consistent with existing components).
- a11y patterns from the existing UserMenu (`aria-haspopup="menu"`, `role="menu"`, `role="menuitem"`, focus-visible rings).
- Initial-fallback for avatars: extract `.charAt(0).toUpperCase()` pattern used in both TeamPill and UserMenu — duplicate it inline in WorkspacePill/UserChip (one line each, not worth a helper).

**Test scenarios:**
- `usePopover.test.ts`:
  - `open=true → Esc keypress sets open=false` (happy path)
  - `open=true → mousedown outside the panel sets open=false`
  - `open=true → mousedown inside the panel does not close`
  - `open=true → on close, focus returns to triggerRef.current` (a11y)
  - `open=false → listeners are not registered (no leaks on unmount)`
- `WorkspacePill` — covered indirectly by `SidebarShell.test.tsx`. No dedicated file.
- `NavRail.test.tsx`: deferred to U2 (where role-gating is wired).
- `UserChip.test.tsx`:
  - **Covers AE3.** Renders trigger with display name + role badge. When clicked, popover appears containing exactly "Theme" toggle and "Sign out" button. Pressing Esc closes the popover.
  - Clicking "Sign out" calls `onSignOut`.
  - Avatar falls back to display-name initial when `avatarUrl` is null.
- `SidebarShell.test.tsx`:
  - Renders WorkspacePill with the team name + avatar from the `me` prop.
  - Renders all 4 NavRail entries when `role === "MANAGER"`.
  - Children render as the main content area sibling to the rail.

**Verification:**
- `yarn workspace colign-frontend test` passes the new test files.
- `yarn workspace colign-frontend tsc -b --noEmit` clean.
- `yarn workspace colign-frontend eslint . --max-warnings=0` clean.

---

### U2. Replace AppShell internals with SidebarShell; wire `/me` props, role-gating, active-route accent

**Goal:** Swap the current header layout in [AppShell.tsx](../../apps/colign-frontend/src/components/AppShell.tsx) for `SidebarShell`. Wire the `/me` query results, the signout handler, and the role-gated Team route. Desktop layout only — narrow-viewport collapse is U3.

**Requirements:** R1, R2, R3, R4, R5, R6, R9, R10.

**Dependencies:** U1.

**Files:**
- `apps/colign-frontend/src/components/AppShell.tsx` (modified — body replaced with `<SidebarShell>` wrapper around `<Outlet />`)
- `apps/colign-frontend/src/components/NavRail.test.tsx` (new)

**Approach:**
- AppShell keeps the same prop-free signature and the same `/me` + `useAuth0` + `signOut` wiring at the top — only the JSX body changes. The header element and its mobile-menu-toggle state both go away (the toggle moves into the drawer logic in U3).
- AppShell composes: `<SidebarShell me={me} onSignOut={handleSignOut}> <main> <Outlet /> </main> </SidebarShell>`. Layout: sidebar fixed left at 240px, main content occupies the remaining width.
- NavRail receives `role` from `me?.role ?? "IC"` and renders / hides the Team link accordingly. The link `to="settings"` previously hidden in `UserMenu` is now a NavRail entry visible to every authenticated user.
- Active route accent: NavLink's `isActive` produces the left-edge accent treatment described in U1.
- The brand mark (currently a separate `<Link><ColignBrand /></Link>` at the top of the header) is absorbed into the WorkspacePill header row inside SidebarShell — no separate brand element survives.

**Patterns to follow:**
- Existing AppShell prop conventions: read from `/me`, fall back to defaults (`role = me?.role ?? "IC"`, `email = me?.email ?? ""`).
- Sign-out flow preserved exactly: `dispatch(signOut())` then conditional `auth0Logout` or `navigate("login")`.

**Test scenarios:**
- `NavRail.test.tsx`:
  - **Covers AE1.** Given `role="IC"`, when rendered, then the Team link is not in the DOM. Given `role="MANAGER"`, when rendered, then the Team link is in the DOM.
  - All 4 routes render in fixed order: Plan, Reconcile, Team (when shown), Settings.
  - Each link renders an icon + label; the icon uses `aria-hidden`.
  - Active state class applies to the link matching the current location.

**Verification:**
- All existing Vitest tests still pass (67 prior tests, plus U1's new tests).
- `yarn dev:frontend` + `yarn dev:host`: navigating to / shows the sidebar on the left, content on the right. Manager-mode shows Team; IC-mode does not. Clicking each route swaps the content with an active accent on the chosen rail entry.
- Sign-out from the user chip works (mock-mode redirects to login; real-mode triggers Auth0 logout).

---

### U3. Narrow-viewport drawer behavior

**Goal:** Below 768px, hide the sidebar by default. Render a thin top strip with a compact workspace identifier + hamburger toggle. Tapping the hamburger slides the full sidebar in as an overlay; the content area dims behind it; tapping the overlay, pressing Esc, or tapping any route link closes the drawer.

**Requirements:** R11, R12, R13.

**Dependencies:** U2.

**Files:**
- `apps/colign-frontend/src/components/SidebarShell.tsx` (modified)
- `apps/colign-frontend/src/components/SidebarShell.test.tsx` (modified — add drawer scenarios)

**Approach:**
- Single viewport media query: `md:` (Tailwind's 768px breakpoint). Above: sidebar is the fixed left rail; below: sidebar is `hidden md:flex` and the top strip is `flex md:hidden`.
- Top strip: 48px tall, sticky top, contains compact WorkspacePill (avatar + truncated name) + hamburger toggle (`HiOutlineMenu` / `HiOutlineX` from react-icons/hi, reused from current AppShell).
- Drawer state: `useState<boolean>(false)` for `drawerOpen`. When true: render `<aside>` (the same sidebar markup, repositioned with `fixed inset-y-0 left-0 z-40`) + a dim overlay `<div>` behind it.
- Dismiss paths:
  - Click on dim overlay → `setDrawerOpen(false)`.
  - Esc keypress → `setDrawerOpen(false)`. Wire via `useEffect` with `document.addEventListener('keydown', ...)`, mirroring the usePopover pattern.
  - NavLink click inside the drawer → `setDrawerOpen(false)` via `onClick` prop on each NavLink.
- Body scroll lock while drawer is open (`document.body.style.overflow = 'hidden'` on open, restore on close) — standard SaaS drawer pattern; prevents underlying content scroll on iOS.

**Patterns to follow:**
- `md:` Tailwind breakpoint matches the existing AppShell's mobile-toggle pattern.
- Reuse the existing `react-icons/hi` (`HiOutlineMenu`, `HiOutlineX`) — already imported in the current AppShell.

**Test scenarios:**
- `SidebarShell.test.tsx` (added scenarios):
  - **Covers AE4.** Given the viewport is < 768px (simulated via setting `window.innerWidth` and dispatching `resize`), when SidebarShell renders, then the rail is hidden and the top strip with a hamburger is visible. When the user clicks the hamburger, then the drawer is rendered as an overlay; when they click the dim overlay, then the drawer is dismissed.
  - Esc closes the drawer when open.
  - Clicking a NavLink inside the open drawer closes it.

**Verification:**
- Both existing Cypress responsive features (`responsive-wide.cy.ts`, `responsive-narrow.cy.ts`) still pass — they hit `/login` and `/weekly-plan` from a 1440×900 and 320×568 viewport respectively; the new AppShell must render correctly at both.
- Manual smoke via DevTools at 360px width: hamburger appears, drawer slides in on tap, overlay dismisses it.

---

### U4. Update Cypress workspace-settings step + remove deprecated user-menu data-cy refs

**Goal:** The existing `workspace-settings.feature` opens settings via the user-menu path: `cy.get('[data-cy="user-menu-trigger"]').click()` then `cy.get('[data-cy="user-menu-settings"]').click()`. After this rewrite, Settings lives in the sidebar as a NavLink, not behind the user menu. Update the step definition to reflect the new entry. Scenario semantics stay the same.

**Requirements:** R15.

**Dependencies:** U2.

**Files:**
- `apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts` (modified — `I open the workspace settings from the user menu` step rephrased to `I open the workspace settings from the sidebar`)
- `apps/colign-frontend/cypress/e2e/workspace-settings.feature` (modified — same step text update in the Gherkin)
- Add `data-cy="sidebar-settings"` to the Settings NavLink in `NavRail.tsx` (touch from U2 file).

**Approach:**
- Gherkin step text changes from `When I open the workspace settings from the user menu` to `When I open the workspace settings from the sidebar`. Three scenarios use it (invite flow, members list, lead removes member); all three keep the same downstream assertions.
- Step definition body: replace the two `cy.get` calls on `user-menu-trigger` + `user-menu-settings` with a single `cy.get('[data-cy="sidebar-settings"]').click()` followed by the existing pathname assertion.
- The avatar-set scenario (`I set the team avatar URL to ...`) is unchanged — it already enters via the workspace-settings step that we're rewriting.

**Patterns to follow:**
- The existing `loginAsMock` + `cy.visit("/")` + `cy.get('[data-cy="..."]').click()` chain — same structure, different selector.

**Test scenarios:** none in the implementation-test sense — this unit IS test code being updated. The verification is the Cypress run.

**Verification:**
- `yarn workspace colign-frontend cy:ci` passes both `workspace-settings.feature` and `weekly-lifecycle.feature` (the lifecycle feature does not depend on the user-menu path).

---

### U5. Cypress + Vitest cleanup; delete deprecated UserMenu component + test

**Goal:** After U2 lands, `UserMenu.tsx` is no longer imported by anything. Delete it along with `UserMenu.test.tsx`. Also delete the deprecated `user-menu-*` data-cy attributes from anywhere that still references them. Add a small final pass to make sure the workspace-settings step file no longer references `user-menu-trigger` / `user-menu-settings` / `user-menu-sign-out`.

**Requirements:** none directly — this unit is hygiene that the rewrite enables.

**Dependencies:** U2, U4.

**Files:**
- `apps/colign-frontend/src/components/UserMenu.tsx` (DELETED)
- `apps/colign-frontend/src/components/UserMenu.test.tsx` (DELETED)

**Approach:**
- Grep `apps/colign-frontend/src` for `UserMenu` to confirm no remaining importers. The expected match list after U2 is empty.
- Grep `apps/colign-frontend` for `user-menu-` (the data-cy prefix). The expected match list after U4 is empty.
- Delete the two files.

**Patterns to follow:** n/a (deletion-only unit).

**Test scenarios:** none — this unit removes tests. The verification is that the remaining test suite is still green.

**Verification:**
- `yarn workspace colign-frontend test` passes (one fewer test file in the count; the count stays in the high 60s + new sidebar tests from U1/U2/U3).
- `yarn workspace colign-frontend eslint . --max-warnings=0` clean (no unused-import warnings).
- `yarn workspace colign-frontend tsc -b --noEmit` clean.

---

## Key Technical Decisions

- **Extend `TeamPill` pattern, replace `UserMenu` outright.** The existing TeamPill is already a good fit for the workspace pill at the top of the rail (or trivially adapted into `WorkspacePill`). The existing UserMenu is a 32px-avatar-button-with-popover designed for the top-right of a header; the bottom-of-sidebar user chip is a full-width row with the same popover behavior but different layout, so it warrants a fresh component. The popover BEHAVIOR (Esc, click-outside, focus return) gets extracted into a `usePopover` hook so neither component duplicates it. (Origin: brainstorm Outstanding Question R8.)

- **Viewport media query, not container query, for the 768px collapse.** TeamRollupTable uses container queries because it's a component embedded inside other layouts that may resize independently of the viewport. The sidebar IS the viewport-edge element — there's no meaningful parent container that can change width independently. Matching the existing AppShell `md:` Tailwind pattern is simpler and consistent. (Origin: brainstorm Outstanding Question R11/R12.)

- **Sidebar lives in `apps/colign-frontend` (the remote), not the host.** Preserves the MFE boundary unchanged; the remote already owns its chrome via AppShell; no new cross-boundary contract introduced. The architecture/marketing site at `/architecture` keeps its own existing different sidebar. (Origin: brainstorm Key Decision.)

- **Sidebar width: 240px on desktop.** Matches Notion (240) and Linear (220) conventions; tested visual fit with the 4-route flat list. No prop for runtime width adjustment in this iteration.

- **Body scroll lock while drawer is open.** Standard SaaS drawer pattern. Without it, iOS Safari (and Chrome on Android with momentum scroll) can scroll the underlying content while the drawer is open, which makes the dismiss-on-overlay-tap unreliable.

---

## Scope Boundaries

Inherited from origin doc and held unchanged:

- Strategy / Outcomes admin route — parked.
- Insights / trend-over-time placeholder — parked.
- Workspace switcher / multi-workspace / Notion-style multi-account popover — parked (no data model).
- Unifying the marketing-site sidebar at `/architecture` with the app sidebar — out of scope.
- pa-host (the MFE host) changes — none required.
- Sub-navigation within any route — flat sidebar only.

### Deferred to Follow-Up Work

- A clickable WorkspacePill that triggers a popover for switching workspaces — needs the multi-workspace data model first.
- Per-route badge counts (e.g., "Reconcile · 3" for unreviewed commits, "Team · 2" for reports needing review) — requires new endpoints; planned for the dashboard-depth track.
- Keyboard shortcut to toggle the drawer (e.g., `Cmd+\`) — nice-to-have, adds testing surface, not needed for v1.

---

## Dependencies / Assumptions

- The `/me` query returns `teamName`, `teamAvatarUrl`, `displayName`, `email`, and `role` — verified against the current AppShell.
- `react-icons/hi` is already in dependencies — verified.
- Auth0 signout flow (`auth0.logout` + `dispatch(signOut)`) is reused unchanged from the current AppShell.
- Tailwind + Flowbite-React stay the styling baseline; no new sidebar library is introduced.
- The existing `<ThemeToggle>` from `apps/colign-frontend/src/components/ui` is reusable as-is inside the user-chip popover.

---

## Testing Strategy

- Vitest coverage for the new primitives focuses on a11y-critical behavior (popover keyboard a11y, role-gated route visibility, drawer dismiss paths). Continues the existing hoisted-mock pattern; no new test infrastructure.
- One acceptance example from the brainstorm maps to each of the new Vitest tests: AE1 → NavRail, AE3 → UserChip, AE4 → SidebarShell (drawer). AE2 (IC view-only Settings) is already covered by the workspace-settings Cypress feature.
- Existing pre-existing tests stay green: 67 frontend Vitest tests, 2 Cypress features (workspace-settings + weekly-lifecycle), and the two responsive .cy.ts files.
- No backend test changes — this is a pure frontend rewrite.

---

## Verification (end-to-end before PR)

1. `yarn workspace colign-frontend test` — all tests green, including the new files from U1/U2/U3.
2. `yarn workspace colign-frontend tsc -b --noEmit` — clean.
3. `yarn workspace colign-frontend eslint . --max-warnings=0` — clean.
4. `yarn workspace colign-frontend cy:ci` — workspace-settings + weekly-lifecycle + responsive-{wide,narrow} all green.
5. Manual smoke: start all three services; log in as `manager@st6.dev`; see the sidebar; click each route; resize to 360px; toggle the drawer; sign out from the user chip.
6. Manual smoke: log in as `ada@st6.dev` (IC); confirm Team is NOT in the sidebar; confirm Settings IS visible; click into Settings and confirm the Members list renders but rename/avatar/remove actions are disabled.
