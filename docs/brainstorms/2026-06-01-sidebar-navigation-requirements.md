---
date: 2026-06-01
topic: sidebar-navigation
---

# Sidebar navigation

## Summary

Replace the header-based AppShell in `apps/colign-frontend` with a Notion-style left-rail sidebar: workspace pill at the top, four flat routes (Plan, Reconcile, Team, Settings) in the middle, user chip pinned to the bottom expanding into a small popover for theme toggle + signout. Below 768px the sidebar hides behind a hamburger that slides the full sidebar in as a drawer overlay.

```
┌──────────────────┐
│ [○] Acme Team    │  ← workspace pill (top)
├──────────────────┤
│  🗓  Plan        │
│  🔄  Reconcile   │  ← 4 flat routes
│  👥  Team        │     (Team hidden for ICs)
│  ⚙   Settings    │
│                  │
│       ⋮          │
├──────────────────┤
│ [ja] Jason · MGR │  ← user chip (bottom)
└──────────────────┘   click → theme + signout popover
```

---

## Problem Frame

The authenticated app currently uses a thin top-header shell. It works, but it reads like an MVP — and the brief is shipped, so the next product moves should signal "real SaaS" before more dashboard depth lands. Two pains follow from the current header:

- **Settings is hidden in a user-menu dropdown.** Members + Invitations + Team Settings are real surfaces users need to discover. The dropdown buries them behind two clicks and a non-obvious affordance.
- **Workspace identity is a small chip next to the brand.** The team name + avatar deserve more presence as the primary "what am I working in" anchor, especially for managers who toggle between team rollups and individual plans.

Future work — deeper manager dashboards, a Strategy/Outcomes admin, an Insights/trend surface — will need more navigation real estate than a top header comfortably carries. Doing the IA shift now means each new surface gets fit into a navigation that's already designed to host it, instead of being fit twice.

---

## Actors

- A1. **IC** — weekly planner. Sees Plan, Reconcile, Settings (view-only). No Team route. Most-frequent user of Plan + Reconcile.
- A2. **Manager** — team lead. Sees all four routes. Lives in the manager dashboard between weekly reviews; benefits most from the persistent sidebar idiom.
- A3. **Admin** — workspace-mgmt power user. Same routes as Manager.

---

## Key Flows

- F1. **Navigate between primary routes**
  - **Trigger:** Authenticated user lands on the app (any route under AppShell).
  - **Actors:** A1, A2, A3.
  - **Steps:** User scans the left rail → clicks a route → content area swaps; the active route shows a left-edge accent; workspace pill and user chip persist across the transition.
  - **Outcome:** Route changes; spatial sense of "where I am" is reinforced by the persistent rail.
  - **Covered by:** R1, R2, R5, R7, R9.

- F2. **Open user-account actions**
  - **Trigger:** User clicks the user chip pinned at the bottom of the sidebar.
  - **Actors:** A1, A2, A3.
  - **Steps:** Chip expands into a popover anchored above it → user picks Theme or Sign out → popover closes.
  - **Outcome:** Theme preference persists across reloads; signout clears the session and returns to the landing page.
  - **Covered by:** R7, R8.

- F3. **Collapse to drawer on narrow viewport**
  - **Trigger:** Viewport ≤ 768px (phone-class).
  - **Actors:** A1, A2, A3.
  - **Steps:** Sidebar hides; thin top strip with workspace identifier + hamburger remains → user taps hamburger → full sidebar slides in from left as overlay → tapping outside, pressing Esc, or selecting a route closes the drawer.
  - **Outcome:** Content area gets full viewport width; sidebar is one tap away.
  - **Covered by:** R11, R12, R13.

---

## Requirements

**Sidebar structure**
- R1. The authenticated AppShell renders a left-rail sidebar instead of a top header on viewports ≥ 768px.
- R2. The sidebar surfaces exactly four route links, in fixed order: Plan (My week) / Reconcile / Team / Settings. No grouping, no section headers, no submenus.
- R3. The Team route link is hidden when the current user's role is IC. It is shown to MANAGER and ADMIN.
- R4. Settings is reachable from the sidebar by every authenticated user regardless of role. The Members section it leads to remains viewable for ICs; management actions (rename, remove member, set avatar) remain gated by `canManage` as today.

**Identity and chrome**
- R5. The top of the sidebar shows a workspace pill: team avatar (or initials when `teamAvatarUrl` is null) + team name. The pill is non-interactive in this iteration (identity-only; a clickable switcher is deferred).
- R6. The Colign brand mark is integrated into the workspace-pill area, not duplicated as a separate header element. The brand mark continues to appear on the unauthenticated landing as today.
- R7. The bottom of the sidebar shows a user chip: avatar (or initials), display name, and a small role badge ("IC" / "Manager" / "Admin").
- R8. Clicking the user chip opens a popover anchored above it containing exactly two items: a theme toggle and a sign-out action. The popover closes on Esc, click-outside, or selection.

**Visual idiom**
- R9. The active route is communicated by a sidebar-style affordance (left-edge accent + a subtle background shift), not by bold text alone.
- R10. Each route shows a leading icon plus a label. The icon set matches the visual style of the rest of the app.

**Narrow viewport**
- R11. Below 768px the sidebar is hidden by default. A thin top strip remains, containing a compact workspace identifier (avatar + name) and a hamburger toggle.
- R12. Tapping the hamburger slides the full sidebar in from the left as an overlay; the content area dims behind it. Tapping the overlay, pressing Esc, or tapping any route link closes the drawer.
- R13. The user chip is visible inside the drawer when it's open, so identity + signout stay one tap away on narrow viewports.

**Integration with existing surfaces**
- R14. The colign-frontend remote owns the sidebar (replaces `apps/colign-frontend/src/components/AppShell.tsx`). The pa-host's marketing/architecture site at `/architecture` is not changed.
- R15. The Cypress workspace-settings feature step "I open the workspace settings from the user menu" is updated to reflect Settings now living in the sidebar. The underlying scenarios remain valid.

---

## Acceptance Examples

- AE1. **Covers R3.** Given an IC user is signed in, when the sidebar renders, then the Team route is NOT visible. Given a Manager is signed in, when the sidebar renders, then the Team route IS visible.
- AE2. **Covers R4.** Given an IC user is signed in, when they click Settings in the sidebar, then the Workspace Settings page renders, the Members list is visible, and the Rename, Set-avatar, and Remove-member affordances are NOT enabled.
- AE3. **Covers R8.** Given any authenticated user, when they click the user chip at the bottom of the sidebar, then a popover appears containing exactly "Theme" and "Sign out" entries. When they press Esc, the popover closes.
- AE4. **Covers R11, R12.** Given the viewport is 360px wide, when the AppShell renders, then the sidebar is NOT visible and a top strip with a hamburger IS visible. When the user taps the hamburger, then the sidebar slides in as an overlay; when they tap the overlay, then the drawer closes.

---

## Success Criteria

- A returning manager describes the new layout as "feels like a real product" or equivalent — the SaaS-feel signal is the primary success criterion for this iteration.
- An IC who has never used the new layout can locate Settings in under 5 seconds without prompting.
- Both existing Cypress features (`workspace-settings.feature` and `weekly-lifecycle.feature`) pass green after step-definition updates limited to navigation entry-points — no scenario rewrites.
- Pre-existing Vitest coverage (67 tests) stays green; sidebar additions get focused component tests following the existing hoisted-mock pattern.
- The work lands in a single focused PR (1–2 days), not a multi-PR arc.

---

## Scope Boundaries

- Strategy / Outcomes admin route is not added in this iteration (parked in [TODOS.md](../../TODOS.md) under the dashboard-depth track).
- Insights / trend-over-time placeholder is not added (parked).
- Workspace switcher, multi-workspace, and Notion-style multi-account popover are not built — no multi-workspace data model exists and no multi-account auth is in scope.
- The marketing/architecture site at `/architecture` keeps its existing different sidebar; the two chrome surfaces are not being unified.
- The pa-host (MFE host) does not change. The host continues to load the remote at `/*`; the remote owns its own chrome.
- No sub-navigation within any route (e.g., Team → Reports / Reviews tabs). Flat sidebar only.

---

## Key Decisions

- **Notion-style identity layout (workspace top, user bottom).** Reads as serious SaaS; gives workspace identity the visual presence it deserves; pins identity + signout at the bottom where users instinctively look for account chrome.
- **Settings promoted to a first-class sidebar route for everyone, not gated to managers.** Members roster + invitations are real surfaces; matches Linear / Notion / GitHub conventions where Settings is always discoverable; ICs get a view-only experience that doesn't surprise.
- **Sidebar lives in the colign-frontend remote, not the pa-host.** Preserves the MFE boundary unchanged; the remote already owns AppShell; no new cross-boundary contract.
- **Hamburger drawer below 768px (not icon rail, not top-header fallback).** Standard SaaS pattern; works regardless of route count; gives full content area on narrow viewports.
- **Today's 4 routes flat — no Strategy / Insights / future placeholders.** Smallest credible sidebar; defers route additions to when those features exist; the sidebar shape can accept new flat items (or eventually sections) without restructuring.

---

## Dependencies / Assumptions

- The `/me` query (`apps/colign-frontend/src/api/me.ts`) returns `teamName`, `teamAvatarUrl`, `displayName`, `email`, and `role` — verified against the current AppShell.
- The existing Auth0 signout flow (`auth0.logout` + `dispatch(signOut)`) is reused unchanged from the current AppShell.
- Styling baseline stays Tailwind + Flowbite-React. The icon set in use across the app is `react-icons/hi`.
- Existing Cypress E2E selectors that touch the user menu (`user-menu-trigger`, `user-menu-settings`) need renaming or re-mapping when the user-menu shape changes. The change is mechanical; no scenario semantics shift.
- The current container-query pattern (TeamRollupTable uses `containerType: "inline-size"` at 640px) is available if planning chooses to react to sidebar's own container instead of the viewport.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R8][Technical] What's the minimal popover primitive — a Flowbite Dropdown, a custom div + click-outside hook, or extracting the existing UserMenu popover behavior into a reusable component? Pick during planning.
- [Affects R11, R12][Technical] Container query vs viewport media query for the 768px collapse threshold. TeamRollupTable already uses container queries; sidebar could match. Decide during planning.
- [Affects R10][Needs research] Specific icon picks per route (HiHome / HiCalendar / HiUsers / HiCog or alternatives). Trivial during planning; not blocking.
