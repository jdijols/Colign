# Workspace-Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the in-app workspace-management surface defined in [docs/superpowers/specs/2026-05-31-workspace-management-ia-design.md](../specs/2026-05-31-workspace-management-ia-design.md) — `/settings` route with Team / Members / Invitations sections, an avatar-button entry point, and the four backend additions — across **4 independently-shippable PRs** so each step is verifiable in prod before the next begins.

**Architecture:** Additive route mounted under the existing `AppShell`. Reuses the existing `InviteTeammatesPage` form by extracting it into a `<InviteForm>` component. Three new backend endpoints + one Flyway migration. Permissions derive from `UserResolver.derivedRole` with a team-lead special case. No changes to existing routes, gates, or the manager dashboard.

**Tech Stack:** Spring Boot 3.3, Spring Data JPA + Hibernate, Lombok, Flyway, JUnit 5 + Mockito + AssertJ + MockMvc, React 18, Vite 5, TypeScript strict, RTK Query, React Router 6, Tailwind, Vitest + Testing Library + user-event, Cypress 13 + `@badeball/cypress-cucumber-preprocessor`.

**Locked decisions (resolved from spec §12 open questions):**
- Route name: **`/settings`** (more conventional than `/workspace`).
- DTO shape: **extend `MeDto`** to include `teamName` + `teamAvatarUrl` so `AppShell` needs zero extra queries to render the team identity. New separate `TeamDto` exists for the Settings page mutations.
- In-page nav: **pure scroll**, no sticky rail.
- Re-attach orphaned reports: **manual via re-invitation flow** — no UI to reparent.
- Long-team-name behavior: **truncate with ellipsis + `title` attribute** at narrow widths.

---

## File Structure

### Backend (`apps/colign-backend/`)

**Create:**
- `src/main/java/com/colign/dto/TeamDto.java` — record for team profile (id, name, description, avatarUrl, leadUserId).
- `src/main/java/com/colign/dto/UpdateTeamRequest.java` — record for PATCH body (name?, description?, avatarUrl?).
- `src/main/java/com/colign/service/TeamPermissions.java` — `canManage(User, Team)` helper. Used by service + DTO mapping.
- `src/main/java/com/colign/service/TeamService.java` — `listMembers`, `updateTeam`, `removeMember`. Source of truth for the three new operations.
- `src/main/resources/db/migration/V5__team_avatar.sql` — adds `team.avatar_url`.
- `src/test/java/com/colign/service/TeamServiceTest.java` — Mockito unit test.
- `src/test/java/com/colign/service/TeamPermissionsTest.java` — pure unit, no Spring.
- `src/test/java/com/colign/controller/TeamControllerWiringTest.java` — `@SpringBootTest` slice covering the three new endpoints + auth.

**Modify:**
- `src/main/java/com/colign/controller/TeamController.java` — add `listMembers`, `update`, `removeMember` endpoints. Existing `create` and `invite` untouched.
- `src/main/java/com/colign/repository/UserRepository.java` — add `findByTeamId(Long teamId, Pageable pageable)` (likely doesn't exist yet — verify).
- `src/main/java/com/colign/repository/TeamRepository.java` — no changes expected; uses existing CRUD.
- `src/main/java/com/colign/dto/MeDto.java` — add `teamName` + `teamAvatarUrl` fields (Phase 4).
- `src/main/java/com/colign/service/UserResolver.java` — populate the new `MeDto` fields (Phase 4).
- `src/main/java/com/colign/domain/Team.java` — add `avatarUrl` field (Phase 4).
- `src/main/resources/templates/email/invitation.html` (or wherever invite email lives) — render team avatar in header (Phase 4).

### Frontend (`apps/colign-frontend/`)

**Create:**
- `src/components/InviteForm.tsx` — extracted from `InviteTeammatesPage`. The form + pending-list, no page chrome.
- `src/components/InviteForm.test.tsx` — Vitest unit.
- `src/components/UserMenu.tsx` — avatar-initial button + popover menu (Workspace settings / Sign out).
- `src/components/UserMenu.test.tsx`.
- `src/components/ConfirmDialog.tsx` — minimal modal with role=dialog + focus trap + Escape-to-close. Used by remove-member in Phase 3.
- `src/components/ConfirmDialog.test.tsx`.
- `src/pages/WorkspaceSettingsPage.tsx` — three stacked sections.
- `src/pages/WorkspaceSettingsPage.test.tsx`.
- `src/components/workspace/TeamSettingsSection.tsx` — name + description + avatar inputs. Permission-aware.
- `src/components/workspace/TeamSettingsSection.test.tsx`.
- `src/components/workspace/MembersSection.tsx` — list + remove row.
- `src/components/workspace/MembersSection.test.tsx`.
- `src/components/TeamPill.tsx` — avatar + name in AppShell header (Phase 4).
- `src/components/TeamPill.test.tsx`.
- `src/lib/permissions.ts` — `canManageTeam(me)` helper.
- `src/lib/permissions.test.ts`.
- `cypress.config.ts` — Cypress config bootstrap (one-time).
- `cypress/support/e2e.ts` — Cucumber preprocessor wiring + Testing Library commands.
- `cypress/support/commands.ts` — `cy.loginAsMock(email)` for the mock-auth profile.
- `cypress/e2e/workspace-settings.feature` — Gherkin scenarios.
- `cypress/e2e/workspace-settings/workspace-settings.ts` — step definitions.
- `cypress/fixtures/users.json` — fixed mock users for seeding.

**Modify:**
- `src/pages/InviteTeammatesPage.tsx` — replace internal form with `<InviteForm />`. Keep the page chrome (brand, Navigate-when-teamless).
- `src/components/AppShell.tsx` — swap the email/role strip for `<UserMenu />`. Add `<TeamPill />` next to brand (Phase 4).
- `src/WeeklyCommitApp.tsx` — register `<Route path="settings" element={<WorkspaceSettingsPage />} />` inside the OnboardingGate-wrapped block.
- `src/api/team.ts` — extend with `getTeam` (NEW — current `getTeam` returns roll-up; rename current to `getManagerTeam` for clarity), `getTeamMembers`, `updateTeam`, `removeTeamMember`.
- `src/api/baseApi.ts` — add `"Team"` tag type.
- `src/api/me.ts` — extend `MeDto` interface with `teamName?` + `teamAvatarUrl?` (Phase 4).

### Docs

**Create at end of feature:**
- `docs/handoffs/YYYY-MM-DD-workspace-management-shipped.md` — final handoff.

---

## Phase 0 · Cypress bootstrap (one-time)

Skip if Cypress is already running (look for `cypress.config.ts` at the frontend root). Otherwise this is the prerequisite for every Cypress scenario in the plan.

### Task 0.1: Bootstrap Cypress config + Cucumber preprocessor

**Files:**
- Create: `apps/colign-frontend/cypress.config.ts`
- Create: `apps/colign-frontend/cypress/support/e2e.ts`
- Create: `apps/colign-frontend/cypress/support/commands.ts`
- Create: `apps/colign-frontend/cypress/tsconfig.json`

- [ ] **Step 1: Write `cypress.config.ts`**

```ts
import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5174",
    specPattern: "cypress/e2e/**/*.feature",
    supportFile: "cypress/support/e2e.ts",
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on(
        "file:preprocessor",
        createBundler({ plugins: [createEsbuildPlugin(config)] }),
      );
      return config;
    },
  },
});
```

- [ ] **Step 2: Write `cypress/support/e2e.ts`**

```ts
import "@testing-library/cypress/add-commands";
import "./commands";
```

- [ ] **Step 3: Write `cypress/support/commands.ts`**

```ts
/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Log in to the mock-auth profile by stuffing the email into localStorage
       * where AuthGate expects it (see authSlice mock seed). Use only against
       * the vite preview / vite dev where VITE_AUTH0_DOMAIN is empty.
       */
      loginAsMock(email: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsMock", (email: string) => {
  cy.window().then((win) => {
    win.localStorage.setItem("colign.mockEmail", email);
  });
  cy.reload();
});

export {};
```

- [ ] **Step 4: Write `cypress/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2020", "DOM"],
    "types": ["cypress", "node", "@testing-library/cypress"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 5: Add `.cy-package-rc.cjs` for Cucumber config**

Create `apps/colign-frontend/.cypress-cucumber-preprocessorrc.json`:
```json
{
  "stepDefinitions": "cypress/e2e/**/*.ts",
  "json": { "enabled": true, "output": "cypress-results/cucumber.json" }
}
```

- [ ] **Step 6: Verify Cypress runs with a smoke spec**

Create temporary `apps/colign-frontend/cypress/e2e/smoke.feature`:
```gherkin
Feature: Cypress + Cucumber bootstrap smoke
  Scenario: Cypress can load any page
    Given I visit "/"
    Then the page title is not empty
```

Create `apps/colign-frontend/cypress/e2e/smoke/smoke.ts`:
```ts
import { Given, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I visit {string}", (path: string) => {
  cy.visit(path);
});

Then("the page title is not empty", () => {
  cy.title().should("not.be.empty");
});
```

Run (in another terminal first): `cd apps/colign-frontend && yarn dev`
Then: `cd apps/colign-frontend && yarn cy:run`
Expected: smoke scenario passes.

- [ ] **Step 7: Delete the smoke spec, commit the config**

```bash
rm apps/colign-frontend/cypress/e2e/smoke.feature
rm -rf apps/colign-frontend/cypress/e2e/smoke
git add apps/colign-frontend/cypress.config.ts \
        apps/colign-frontend/cypress/support/ \
        apps/colign-frontend/cypress/tsconfig.json \
        apps/colign-frontend/.cypress-cucumber-preprocessorrc.json
git commit -m "test(cypress): bootstrap Cucumber + Testing Library preprocessor

Adds cypress.config.ts, support files, Cucumber preprocessor wiring,
and the cy.loginAsMock helper. First real feature lands in PR 1."
```

---

## Phase 1 · PR 1: Settings shell + in-app invite entry (frontend only)

**PR title:** `feat(settings): in-app workspace-settings route with invite entry`
**Risk:** Minimal. No backend changes. The existing `/onboarding/invite` flow continues to work because we keep the page wrapper.
**Verification:** Click avatar in header → *Workspace settings* → *Invitations* → send a real invite to your other email → it arrives.

### Task 1.1: Add `canManageTeam` permission helper

**Files:**
- Create: `apps/colign-frontend/src/lib/permissions.ts`
- Create: `apps/colign-frontend/src/lib/permissions.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/colign-frontend/src/lib/permissions.test.ts
import { describe, expect, it } from "vitest";
import { canManageTeam } from "./permissions";
import type { MeDto } from "@/api/me";

const baseMe: MeDto = {
  id: 1,
  email: "u@example.com",
  displayName: "U",
  role: "IC",
  teamId: 10,
  managerId: null,
  needsInvite: false,
};

describe("canManageTeam", () => {
  it("allows ADMIN regardless of lead status", () => {
    expect(canManageTeam({ ...baseMe, role: "ADMIN" }, null)).toBe(true);
  });
  it("allows MANAGER", () => {
    expect(canManageTeam({ ...baseMe, role: "MANAGER" }, null)).toBe(true);
  });
  it("allows IC if they are team lead", () => {
    expect(canManageTeam({ ...baseMe, role: "IC" }, { leadUserId: 1 })).toBe(true);
  });
  it("denies IC who is not lead", () => {
    expect(canManageTeam({ ...baseMe, role: "IC" }, { leadUserId: 2 })).toBe(false);
  });
  it("denies if me or team is null", () => {
    expect(canManageTeam(null, { leadUserId: 1 })).toBe(false);
    expect(canManageTeam(baseMe, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/colign-frontend && yarn test src/lib/permissions.test.ts`
Expected: FAIL — `Cannot find module './permissions'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/colign-frontend/src/lib/permissions.ts
import type { MeDto } from "@/api/me";

/**
 * True when the caller may rename the team, set its avatar, or remove members.
 * Mirrors the backend rule: MANAGER or ADMIN by derived role, OR the team
 * lead (`team.leadUserId == me.id`) so a solo lead can still manage their own
 * workspace even before they have direct reports. Keep this in sync with
 * TeamPermissions on the backend.
 */
export function canManageTeam(
  me: { id: number; role: "IC" | "MANAGER" | "ADMIN" } | null,
  team: { leadUserId: number | null } | null,
): boolean {
  if (!me || !team) return false;
  if (me.role === "ADMIN" || me.role === "MANAGER") return true;
  return team.leadUserId === me.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/colign-frontend && yarn test src/lib/permissions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/src/lib/permissions.ts \
        apps/colign-frontend/src/lib/permissions.test.ts
git commit -m "feat(workspace): add canManageTeam permission helper"
```

### Task 1.2: Extract `<InviteForm>` from `InviteTeammatesPage`

The existing `InviteTeammatesPage` does two things: provides page chrome (brand + center layout + bounce-if-teamless) and renders the invite form + pending list. We split them so the form can also render inside the Settings page.

**Files:**
- Create: `apps/colign-frontend/src/components/InviteForm.tsx`
- Create: `apps/colign-frontend/src/components/InviteForm.test.tsx`
- Modify: `apps/colign-frontend/src/pages/InviteTeammatesPage.tsx`

- [ ] **Step 1: Write failing test for `<InviteForm>`**

```tsx
// apps/colign-frontend/src/components/InviteForm.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  listInvitations: vi.fn(),
  createMutationFn: vi.fn(),
}));

vi.mock("@/api/invites", () => ({
  useListInvitationsQuery: (...args: unknown[]) => hoisted.listInvitations(...args),
  useCreateInvitationMutation: () => [hoisted.createMutationFn, { isLoading: false }],
}));

import { InviteForm } from "./InviteForm";

describe("InviteForm", () => {
  beforeEach(() => {
    hoisted.listInvitations.mockReturnValue(mockQueryResult([]));
    hoisted.createMutationFn.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 1 }),
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders form fields", () => {
    renderWithRouter(<InviteForm teamId={42} />);
    expect(screen.getByPlaceholderText(/teammate@company\.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send invite/i })).toBeInTheDocument();
  });

  it("calls createInvitation with the typed email + selected relationship", async () => {
    renderWithRouter(<InviteForm teamId={42} />);
    await userEvent.type(
      screen.getByPlaceholderText(/teammate@company\.com/i),
      "new@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /send invite/i }));
    expect(hoisted.createMutationFn).toHaveBeenCalledWith({
      teamId: 42,
      body: { email: "new@example.com", relationship: "REPORT" },
    });
  });

  it("renders pending invitations from the list query", () => {
    hoisted.listInvitations.mockReturnValue(
      mockQueryResult([
        {
          id: 1,
          email: "p@example.com",
          relationship: "REPORT",
          status: "PENDING",
          acceptUrl: "http://x/invite/tok",
        },
      ]),
    );
    renderWithRouter(<InviteForm teamId={42} />);
    expect(screen.getByText("p@example.com")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/colign-frontend && yarn test src/components/InviteForm.test.tsx`
Expected: FAIL — `Cannot find module './InviteForm'`.

- [ ] **Step 3: Write `<InviteForm>` by extracting from `InviteTeammatesPage`**

Open `apps/colign-frontend/src/pages/InviteTeammatesPage.tsx`. Everything inside the existing component that ISN'T the brand wrapper / Navigate / center-layout becomes the new component. The `RelationshipChip` and `PendingInvitesList` helpers move WITH the form.

```tsx
// apps/colign-frontend/src/components/InviteForm.tsx
import { useState } from "react";
import { HiOutlineClipboardCopy, HiCheckCircle } from "react-icons/hi";
import {
  useCreateInvitationMutation,
  useListInvitationsQuery,
  type InvitationDto,
  type InvitationRelationship,
} from "@/api/invites";

interface Props {
  teamId: number;
  /** Optional secondary action rendered next to "Send invite" (e.g., a Skip
   *  button in onboarding, omitted in the Settings page). */
  secondaryAction?: React.ReactNode;
  /** Called after a successful send. Onboarding uses this to advance. */
  onSent?: (email: string) => void;
}

export function InviteForm({ teamId, secondaryAction, onSent }: Props) {
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<InvitationRelationship>("REPORT");
  const [createInvitation, { isLoading: sending }] = useCreateInvitationMutation();
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);

  const { data: invites } = useListInvitationsQuery({ teamId });

  const trimmedEmail = email.trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const canSend = isValidEmail && !sending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setError(null);
    try {
      await createInvitation({
        teamId,
        body: { email: trimmedEmail, relationship },
      }).unwrap();
      setJustSent(trimmedEmail);
      setEmail("");
      onSent?.(trimmedEmail);
      setTimeout(() => setJustSent(null), 4000);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: { detail?: string } })?.data;
      setError(
        data?.detail ??
          (status === 400
            ? "That email doesn't look right."
            : status === 502
            ? "Couldn't deliver the email. Check the Resend key and try again."
            : "Couldn't send the invitation. Please try again."),
      );
    }
  }

  return (
    <>
      <form onSubmit={submit} aria-label="Invite a teammate">
        <label htmlFor="invite-email" className="sr-only">Email</label>
        <input
          id="invite-email"
          data-cy="invite-email-input"
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          placeholder="teammate@company.com"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:border-transparent transition-shadow"
        />

        <fieldset className="mt-3" aria-label="Relationship">
          <legend className="sr-only">How will they join?</legend>
          <div className="grid grid-cols-2 gap-2">
            <RelationshipChip value="REPORT" current={relationship} onChange={setRelationship} title="As a report" subtitle="You'll be their manager" />
            <RelationshipChip value="PEER" current={relationship} onChange={setRelationship} title="As a peer" subtitle="Same team, no manager link" />
          </div>
        </fieldset>

        {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
        {justSent && (
          <p role="status" className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <HiCheckCircle className="h-4 w-4" aria-hidden />
            Invitation sent to {justSent}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            data-cy="send-invite-submit"
            disabled={!canSend}
            className={
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 " +
              (canSend
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer"
                : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed")
            }
          >
            {sending ? "Sending…" : "Send invite"}
          </button>
          {secondaryAction}
        </div>
      </form>

      {invites && invites.length > 0 && <PendingInvitesList invites={invites} />}
    </>
  );
}

function RelationshipChip({
  value, current, onChange, title, subtitle,
}: {
  value: InvitationRelationship;
  current: InvitationRelationship;
  onChange: (v: InvitationRelationship) => void;
  title: string;
  subtitle: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      data-cy={`invite-relationship-${value.toLowerCase()}`}
      onClick={() => onChange(value)}
      aria-pressed={active}
      className={
        "rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white " +
        (active
          ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900"
          : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900")
      }
    >
      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</div>
      <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{subtitle}</div>
    </button>
  );
}

function PendingInvitesList({ invites }: { invites: InvitationDto[] }) {
  return (
    <div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-6">
      <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-3">Invitations</h2>
      <ul className="space-y-2">
        {invites.map((inv) => <InviteRow key={inv.id} invite={inv} />)}
      </ul>
    </div>
  );
}

function InviteRow({ invite }: { invite: InvitationDto }) {
  const [copied, setCopied] = useState(false);
  const relationshipLabel = invite.relationship === "REPORT" ? "report" : "peer";
  const statusColor =
    invite.status === "ACCEPTED" ? "text-emerald-700 dark:text-emerald-400"
    : invite.status === "EXPIRED" || invite.status === "REVOKED" ? "text-neutral-500 dark:text-neutral-500"
    : "text-neutral-700 dark:text-neutral-300";

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <li className="rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-900 dark:text-neutral-50 truncate">{invite.email}</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          {relationshipLabel} · <span className={statusColor}>{invite.status.toLowerCase()}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        title="Copy invite link"
      >
        <HiOutlineClipboardCopy className="h-3.5 w-3.5" aria-hidden />
        {copied ? "Copied" : "Copy link"}
      </button>
    </li>
  );
}
```

- [ ] **Step 4: Update `InviteTeammatesPage` to wrap the new component**

```tsx
// apps/colign-frontend/src/pages/InviteTeammatesPage.tsx
import { Navigate, useNavigate } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import { useListInvitationsQuery } from "@/api/invites";
import { InviteForm } from "@/components/InviteForm";
import { ColignBrand } from "@/components/Brand";

/**
 * Onboarding's invite step — page chrome + `<InviteForm>`. The form itself
 * also renders inside the Settings page; this wrapper provides the centered
 * full-screen layout and the Skip/Done secondary action.
 */
export function InviteTeammatesPage() {
  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const teamId = me?.teamId ?? null;
  const { data: invites } = useListInvitationsQuery(
    { teamId: teamId ?? 0 },
    { skip: teamId == null },
  );

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
      </div>
    );
  }
  if (me && me.teamId == null) return <Navigate to=".." replace />;
  if (teamId == null) return null;

  const hasSentAtLeastOne = (invites?.length ?? 0) > 0;
  const skipOrDone = (
    <button
      type="button"
      data-cy={hasSentAtLeastOne ? "done-invites" : "skip-invites"}
      onClick={() => navigate("..", { relative: "path" })}
      className={
        hasSentAtLeastOne
          ? "inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
          : "inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors px-2 py-3"
      }
    >
      {hasSentAtLeastOne ? "Done" : "Skip for now"}
      <HiArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          Invite your team
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          Invite teammates to align your week together — or skip and start solo.
        </p>
        <div className="mt-8">
          <InviteForm teamId={teamId} secondaryAction={skipOrDone} />
        </div>
        <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed">
          You'll become a manager automatically once a report joins.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run all FE tests**

Run: `cd apps/colign-frontend && yarn test`
Expected: PASS — `InviteForm.test.tsx` (3 tests) + the existing `InviteTeammatesPage.test.tsx` still passes (the refactor preserves all behavior). If `InviteTeammatesPage.test.tsx` was asserting on internal form elements, those assertions still pass because the same DOM is rendered (just from a child component now).

- [ ] **Step 6: Commit**

```bash
git add apps/colign-frontend/src/components/InviteForm.tsx \
        apps/colign-frontend/src/components/InviteForm.test.tsx \
        apps/colign-frontend/src/pages/InviteTeammatesPage.tsx
git commit -m "refactor(invite): extract <InviteForm> from InviteTeammatesPage

Page chrome stays in InviteTeammatesPage; the form + pending list move
into <InviteForm teamId secondaryAction onSent /> so the Settings page
can render the same form inline. No behavior change."
```

### Task 1.3: Build `<UserMenu>` (avatar-initial button + popover)

**Files:**
- Create: `apps/colign-frontend/src/components/UserMenu.tsx`
- Create: `apps/colign-frontend/src/components/UserMenu.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/colign-frontend/src/components/UserMenu.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render";

const hoisted = vi.hoisted(() => ({ onSignOut: vi.fn() }));

import { UserMenu } from "./UserMenu";

describe("UserMenu", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  function renderMenu() {
    return renderWithRouter(
      <UserMenu
        email="jason@colign.org"
        role="MANAGER"
        avatarUrl={null}
        displayName="Jason D"
        onSignOut={hoisted.onSignOut}
      />,
    );
  }

  it("renders the trigger with an initial fallback when avatarUrl is null", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("J");
  });

  it("does not render the menu until the trigger is clicked", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu with email + role header on click", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("jason@colign.org")).toBeInTheDocument();
    expect(screen.getByText(/manager/i)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onSignOut when Sign out is clicked", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(hoisted.onSignOut).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/colign-frontend && yarn test src/components/UserMenu.test.tsx`
Expected: FAIL — `Cannot find module './UserMenu'`.

- [ ] **Step 3: Write the component**

```tsx
// apps/colign-frontend/src/components/UserMenu.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface Props {
  email: string;
  role: "IC" | "MANAGER" | "ADMIN";
  avatarUrl: string | null;
  displayName: string;
  onSignOut: () => void;
}

/**
 * Avatar-initial button in the AppShell top-right. Click → popover menu
 * with email/role header + Workspace settings + Sign out. Keyboard
 * accessible: Enter/Space opens, Escape closes, focus returns to trigger.
 * Click-outside closes. No menu library — `aria-haspopup="menu"` +
 * `role="menu"` + `role="menuitem"` are enough for AT.
 */
export function UserMenu({ email, role, avatarUrl, displayName, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full overflow-hidden",
          "border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900",
          "text-sm font-medium text-neutral-700 dark:text-neutral-300",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
        )}
        data-cy="user-menu-trigger"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="absolute right-0 mt-2 w-60 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-1 z-40"
        >
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate" title={email}>
              {email}
            </div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
              {role}
            </div>
          </div>
          <Link
            to="settings"
            role="menuitem"
            data-cy="user-menu-settings"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Workspace settings
          </Link>
          <button
            type="button"
            role="menuitem"
            data-cy="user-menu-sign-out"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="block w-full text-left rounded-md px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/colign-frontend && yarn test src/components/UserMenu.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/src/components/UserMenu.tsx \
        apps/colign-frontend/src/components/UserMenu.test.tsx
git commit -m "feat(workspace): add <UserMenu> avatar-initial button + popover"
```

### Task 1.4: Wire `<UserMenu>` into `AppShell`

**Files:**
- Modify: `apps/colign-frontend/src/components/AppShell.tsx`

- [ ] **Step 1: Replace the email/role/sign-out strip with `<UserMenu>`**

In `AppShell.tsx`, remove the right-side `<div className="hidden lg:flex items-center gap-2 text-xs text-neutral-600 pr-2 border-r border-neutral-200 dark:border-neutral-800">…</div>` and the standalone `<Button … onClick={handleSignOut}>Sign out</Button>`. Add `<UserMenu>` in their place. Keep `<ThemeToggle>` and the mobile hamburger as-is.

Replace the right-side block (lines roughly 73–97 in current file) with:

```tsx
<div className="ml-auto flex items-center gap-2">
  <ThemeToggle />
  <UserMenu
    email={email}
    role={role}
    avatarUrl={null /* user avatar comes in a later PR via /me extension */}
    displayName={me?.displayName ?? email}
    onSignOut={handleSignOut}
  />

  <button
    type="button"
    className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
    onClick={() => setMenuOpen((o) => !o)}
    aria-expanded={menuOpen}
    aria-label="Toggle navigation"
  >
    {menuOpen ? <HiOutlineX className="h-4 w-4" /> : <HiOutlineMenu className="h-4 w-4" />}
  </button>
</div>
```

Add the import at the top:
```tsx
import { UserMenu } from "@/components/UserMenu";
```

Remove the now-unused `Button` import if `Button` is no longer referenced; check the file before removing.

- [ ] **Step 2: Run existing AppShell tests + the new UserMenu tests**

Run: `cd apps/colign-frontend && yarn test`
Expected: PASS. If any existing test asserted "Sign out" rendered as a top-level button, update it to assert it's reachable through the menu (or delete the assertion if it duplicates UserMenu coverage).

- [ ] **Step 3: Commit**

```bash
git add apps/colign-frontend/src/components/AppShell.tsx
git commit -m "feat(app-shell): swap email/role strip + sign-out button for <UserMenu>"
```

### Task 1.5: Add `<WorkspaceSettingsPage>` with stub sections + Invitations content

**Files:**
- Create: `apps/colign-frontend/src/pages/WorkspaceSettingsPage.tsx`
- Create: `apps/colign-frontend/src/pages/WorkspaceSettingsPage.test.tsx`
- Modify: `apps/colign-frontend/src/WeeklyCommitApp.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/colign-frontend/src/pages/WorkspaceSettingsPage.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getMe: vi.fn(),
  listInvitations: vi.fn(),
  createMutationFn: vi.fn(),
}));

vi.mock("@/api/me", () => ({
  useGetMeQuery: () => hoisted.getMe(),
}));
vi.mock("@/api/invites", () => ({
  useListInvitationsQuery: (...args: unknown[]) => hoisted.listInvitations(...args),
  useCreateInvitationMutation: () => [hoisted.createMutationFn, { isLoading: false }],
}));

import { WorkspaceSettingsPage } from "./WorkspaceSettingsPage";

const ME = {
  id: 1, email: "u@example.com", displayName: "U",
  role: "IC" as const, teamId: 42, managerId: null, needsInvite: false,
};

describe("WorkspaceSettingsPage", () => {
  beforeEach(() => {
    hoisted.getMe.mockReturnValue(mockQueryResult(ME));
    hoisted.listInvitations.mockReturnValue(mockQueryResult([]));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("renders three sections", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    expect(screen.getByRole("region", { name: /team/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /members/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /invitations/i })).toBeInTheDocument();
  });

  it("renders the InviteForm under the Invitations section", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    expect(screen.getByPlaceholderText(/teammate@company\.com/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/colign-frontend && yarn test src/pages/WorkspaceSettingsPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the page**

```tsx
// apps/colign-frontend/src/pages/WorkspaceSettingsPage.tsx
import { Navigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { InviteForm } from "@/components/InviteForm";

/**
 * `/settings` — the workspace-management surface. Three stacked sections:
 *   - Team (PR 2): name + description + avatar URL. Permission-gated.
 *   - Members (PR 2): all team members, read-only; remove button in PR 3.
 *   - Invitations (PR 1): the existing <InviteForm> + pending list.
 *
 * Teamless users land here only via direct URL — bounce them to onboarding,
 * same pattern as InviteTeammatesPage.
 */
export function WorkspaceSettingsPage() {
  const { data: me, isLoading } = useGetMeQuery();

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-10">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
      </div>
    );
  }
  if (me && me.teamId == null) return <Navigate to="onboarding" replace />;
  if (!me?.teamId) return null;

  return (
    <div className="px-4 sm:px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Workspace settings
      </h1>

      <section aria-labelledby="team-heading" className="mt-10">
        <h2 id="team-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Team</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Team profile lands in the next PR.
        </p>
      </section>

      <section aria-labelledby="members-heading" className="mt-10">
        <h2 id="members-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Members</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Member list lands in the next PR.
        </p>
      </section>

      <section aria-labelledby="invitations-heading" className="mt-10">
        <h2 id="invitations-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50">Invitations</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Send an invite. Pending invitations appear below.
        </p>
        <div className="mt-6">
          <InviteForm teamId={me.teamId} />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Register the route in `WeeklyCommitApp.tsx`**

Inside the OnboardingGate-wrapped Route block (where `index`, `reconcile`, `manager` already live), add a sibling:

```tsx
<Route path="settings" element={<WorkspaceSettingsPage />} />
```

Add the import at the top:
```tsx
import { WorkspaceSettingsPage } from "@/pages/WorkspaceSettingsPage";
```

- [ ] **Step 5: Run all tests**

Run: `cd apps/colign-frontend && yarn test`
Expected: PASS — including the 2 new tests.

- [ ] **Step 6: Commit**

```bash
git add apps/colign-frontend/src/pages/WorkspaceSettingsPage.tsx \
        apps/colign-frontend/src/pages/WorkspaceSettingsPage.test.tsx \
        apps/colign-frontend/src/WeeklyCommitApp.tsx
git commit -m "feat(workspace): add /settings route with Invitations section

Team and Members sections are placeholder text until PR 2 adds the
backend list + rename endpoints. Invitations section embeds the
existing <InviteForm> — users who skipped the onboarding invite step
now have an in-app entry point to send more."
```

### Task 1.6: Cypress feature — invite from Settings

**Files:**
- Create: `apps/colign-frontend/cypress/e2e/workspace-settings.feature`
- Create: `apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts`
- Create: `apps/colign-frontend/cypress/fixtures/users.json` (if not present)

- [ ] **Step 1: Write the feature**

```gherkin
# apps/colign-frontend/cypress/e2e/workspace-settings.feature
Feature: Workspace settings

  Background:
    Given I am signed in as a team lead

  Scenario: A skipper sends an invite from inside the app
    When I open the workspace settings from the user menu
    Then I should see the Invitations section
    When I type "newbie@example.com" into the invite email field
    And I submit the invite
    Then I should see an invitation sent confirmation
```

- [ ] **Step 2: Write step definitions**

```ts
// apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("I am signed in as a team lead", () => {
  cy.loginAsMock("lead@example.com");
  cy.visit("/");
});

When("I open the workspace settings from the user menu", () => {
  cy.get('[data-cy="user-menu-trigger"]').click();
  cy.get('[data-cy="user-menu-settings"]').click();
  cy.location("pathname").should("include", "/settings");
});

Then("I should see the Invitations section", () => {
  cy.contains("h2", "Invitations").should("be.visible");
});

When("I type {string} into the invite email field", (email: string) => {
  cy.get('[data-cy="invite-email-input"]').type(email);
});

When("I submit the invite", () => {
  cy.get('[data-cy="send-invite-submit"]').click();
});

Then("I should see an invitation sent confirmation", () => {
  cy.contains(/invitation sent/i).should("be.visible");
});
```

- [ ] **Step 3: Run the feature**

Run (split terminals):
```bash
cd apps/colign-frontend && yarn dev   # terminal A
cd apps/colign-frontend && yarn cy:run --spec "cypress/e2e/workspace-settings.feature"   # terminal B
```

Expected: PASS. If the mock-login pattern in `cy.loginAsMock` doesn't match the actual mock-auth seed key, inspect `authSlice.ts` for the right localStorage key and update `cy.loginAsMock`.

- [ ] **Step 4: Commit**

```bash
git add apps/colign-frontend/cypress/e2e/workspace-settings.feature \
        apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts
git commit -m "test(cypress): cover Settings → invite happy path"
```

### Task 1.7: Open PR 1

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin main   # or: feature branch + PR
gh pr create --title "feat(settings): in-app workspace-settings route with invite entry" --body "$(cat <<'EOF'
## Summary
- Refactor: extract `<InviteForm>` from `InviteTeammatesPage` so the same form can render in onboarding *and* in `/settings`.
- New `<UserMenu>` (avatar-initial button + popover with email/role header, Workspace settings, Sign out) replaces the always-on email/role strip in `AppShell`.
- New `/settings` route mounts `<WorkspaceSettingsPage>` under the existing `AppShell` + `OnboardingGate`. Team and Members sections are placeholders; Invitations renders `<InviteForm>`.
- Bootstrap Cypress + Cucumber preprocessor (one-time) and add the first scenario: lead opens menu → goes to Settings → sends invite → sees confirmation.
- Permissions helper `canManageTeam(me, team)` ready for PR 2.
- No backend changes. No existing route or behavior altered.

## Verify in dev
1. `cd apps/colign-frontend && yarn dev` (or open `colign.org` if testing prod).
2. Sign in as any team lead.
3. Click your avatar in the top-right → *Workspace settings*.
4. Confirm Team/Members placeholders + working Invitations form.
5. Send a real invite to a second email; confirm it arrives.

## Test plan
- [ ] `yarn test` (frontend) — all green, including new `<InviteForm>`, `<UserMenu>`, `<WorkspaceSettingsPage>`, `canManageTeam` tests.
- [ ] `yarn cy:run --spec "cypress/e2e/workspace-settings.feature"` — green.
- [ ] Backend untouched; no Maven run needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for the PR to be reviewed + merged**

After merge, deploy to Vercel/Fly per `DEPLOY.md`. Verify in prod via the steps above before starting Phase 2.

---

## Phase 2 · PR 2: Members list (read-only) + Rename team

**PR title:** `feat(settings): list workspace members + rename team`
**Risk:** Low. Two additive endpoints + permission gating. Existing endpoints untouched. The team `version` column already exists on `AbstractAuditingEntity` so optimistic-concurrency 409s are free.
**Verification:** Open `/settings` → see all team members in *Members* → rename your team in *Team* → refresh, confirm the new name sticks.

### Task 2.1: Add `findByTeamIdAndIdNot` repo query

**Files:**
- Modify: `apps/colign-backend/src/main/java/com/colign/repository/UserRepository.java`

Before modifying, open the file and confirm whether `findByTeamId(Long, Pageable)` already exists (used or not). If yes, skip Step 1; otherwise add it:

- [ ] **Step 1: Add the query method**

Append the following methods (preserving existing imports):

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// inside the UserRepository interface body:

/** All members of a team, ordered by displayName via Pageable. */
Page<User> findByTeamId(Long teamId, Pageable pageable);

/** Count members of a team, excluding one user (used to compute "last member" cases). */
long countByTeamIdAndIdNot(Long teamId, Long excludedUserId);

/** All users whose manager is the given user — drives the orphan cascade on remove. */
java.util.List<User> findByManagerId(Long managerId);
```

(If `findByManagerId` exists with `Pageable`, add the `List` overload alongside. Spring Data is happy with both.)

- [ ] **Step 2: Commit (no test yet — covered by service test in 2.4)**

```bash
git add apps/colign-backend/src/main/java/com/colign/repository/UserRepository.java
git commit -m "feat(repo): add findByTeamId(Pageable) + countByTeamIdAndIdNot"
```

### Task 2.2: Add `TeamDto` + `UpdateTeamRequest` + `TeamPermissions`

**Files:**
- Create: `apps/colign-backend/src/main/java/com/colign/dto/TeamDto.java`
- Create: `apps/colign-backend/src/main/java/com/colign/dto/UpdateTeamRequest.java`
- Create: `apps/colign-backend/src/main/java/com/colign/service/TeamPermissions.java`
- Create: `apps/colign-backend/src/test/java/com/colign/service/TeamPermissionsTest.java`

- [ ] **Step 1: Write failing TeamPermissions test**

```java
// apps/colign-backend/src/test/java/com/colign/service/TeamPermissionsTest.java
package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import org.junit.jupiter.api.Test;

class TeamPermissionsTest {

  private static User user(long id, UserRole role) {
    return User.builder().email(id + "@x").displayName("u").role(role).active(true).build()
        .toBuilder().build(); // ensure id is settable via reflection or pre-built helper
  }

  private static Team team(long leadId) {
    return Team.builder().name("Acme").leadUserId(leadId).build();
  }

  @Test
  void adminMayManage() {
    User admin = User.builder().role(UserRole.ADMIN).build();
    assertThat(TeamPermissions.canManage(admin, team(99))).isTrue();
  }

  @Test
  void managerMayManage() {
    User m = User.builder().role(UserRole.MANAGER).build();
    assertThat(TeamPermissions.canManage(m, team(99))).isTrue();
  }

  @Test
  void icWhoIsLeadMayManage() {
    User lead = User.builder().role(UserRole.IC).build();
    setId(lead, 5L);
    assertThat(TeamPermissions.canManage(lead, team(5L))).isTrue();
  }

  @Test
  void icWhoIsNotLeadIsBlocked() {
    User ic = User.builder().role(UserRole.IC).build();
    setId(ic, 5L);
    assertThat(TeamPermissions.canManage(ic, team(99L))).isFalse();
  }

  @Test
  void nullsAreBlocked() {
    assertThat(TeamPermissions.canManage(null, team(1L))).isFalse();
    assertThat(TeamPermissions.canManage(User.builder().role(UserRole.MANAGER).build(), null)).isFalse();
  }

  // Helper: User#id has no public setter; use reflection.
  private static void setId(User u, Long id) {
    try {
      var f = User.class.getDeclaredField("id");
      f.setAccessible(true);
      f.set(u, id);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
```

(If `User` exposes `setId` via Lombok @Setter or a builder, prefer that instead of reflection.)

- [ ] **Step 2: Run test to verify fail**

Run: `cd apps/colign-backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw -Dtest=TeamPermissionsTest test`
Expected: FAIL — `TeamPermissions` doesn't exist yet.

- [ ] **Step 3: Write `TeamPermissions`**

```java
// apps/colign-backend/src/main/java/com/colign/service/TeamPermissions.java
package com.colign.service;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;

/**
 * Workspace-settings authorization. Mirrors {@code canManageTeam} on the
 * frontend (apps/colign-frontend/src/lib/permissions.ts) — keep both in sync.
 *
 * MANAGER and ADMIN may manage by stored role; an IC may also manage iff they
 * are the team lead, so a solo lead with no reports yet can still rename their
 * own workspace. Derived role from {@code UserResolver} is intentionally NOT
 * used here — controllers receive the {@code User} entity and we want to use
 * the stored role for ADMIN gating; MANAGER fallback below covers the derived
 * MANAGER case because the team lead with reports is always MANAGER by both
 * paths.
 */
public final class TeamPermissions {

  private TeamPermissions() {}

  public static boolean canManage(User user, Team team) {
    if (user == null || team == null) return false;
    if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER) return true;
    Long leadId = team.getLeadUserId();
    return leadId != null && leadId.equals(user.getId());
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: same as Step 2.
Expected: PASS.

- [ ] **Step 5: Write `TeamDto` + `UpdateTeamRequest`**

```java
// apps/colign-backend/src/main/java/com/colign/dto/TeamDto.java
package com.colign.dto;

/** Workspace profile shape returned by GET / PATCH /api/v1/teams/{id}. */
public record TeamDto(
    Long id,
    String name,
    String description,
    String avatarUrl,
    Long leadUserId
) {}
```

```java
// apps/colign-backend/src/main/java/com/colign/dto/UpdateTeamRequest.java
package com.colign.dto;

import jakarta.validation.constraints.Size;

/**
 * Body for {@code PATCH /api/v1/teams/{id}}. Every field optional; only non-null
 * fields are applied. Empty-string for {@code name} is rejected (would orphan
 * the workspace identity). avatarUrl is added in PR 4 — leave validated here so
 * we don't churn the DTO; PR 4 just wires the field through {@link com.colign.service.TeamService#updateTeam}.
 */
public record UpdateTeamRequest(
    @Size(max = 120) String name,
    @Size(max = 2000) String description,
    @Size(max = 500) String avatarUrl
) {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/dto/TeamDto.java \
        apps/colign-backend/src/main/java/com/colign/dto/UpdateTeamRequest.java \
        apps/colign-backend/src/main/java/com/colign/service/TeamPermissions.java \
        apps/colign-backend/src/test/java/com/colign/service/TeamPermissionsTest.java
git commit -m "feat(teams): TeamDto + UpdateTeamRequest + TeamPermissions

Adds the DTOs and permission helper used by the new TeamService
operations (list members, update, remove). Mirrors the canManageTeam
frontend rule: MANAGER/ADMIN by stored role, or IC who is the team lead."
```

### Task 2.3: Build `TeamService.listMembers` + `updateTeam`

**Files:**
- Create: `apps/colign-backend/src/main/java/com/colign/service/TeamService.java`
- Create: `apps/colign-backend/src/test/java/com/colign/service/TeamServiceTest.java`

- [ ] **Step 1: Write failing test**

```java
// apps/colign-backend/src/test/java/com/colign/service/TeamServiceTest.java
package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.colign.config.exception.NotFoundException;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.TeamDto;
import com.colign.dto.UpdateTeamRequest;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

  @Mock TeamRepository teams;
  @Mock UserRepository users;
  @InjectMocks TeamService svc;

  private static final long TEAM_ID = 10L;
  private static final long LEAD_ID = 1L;
  private static final long OTHER_ID = 2L;

  private Team team() {
    Team t = Team.builder().name("Acme").leadUserId(LEAD_ID).build();
    setId(t, TEAM_ID);
    return t;
  }
  private User lead() {
    User u = User.builder().email("lead@x").role(UserRole.IC).active(true).build();
    setId(u, LEAD_ID);
    u.setTeamId(TEAM_ID);
    return u;
  }
  private User member(long id) {
    User u = User.builder().email("m" + id + "@x").role(UserRole.IC).active(true).build();
    setId(u, id);
    u.setTeamId(TEAM_ID);
    return u;
  }

  @Test
  void listMembers_returnsAllForCallerOnTeam() {
    when(users.findByTeamId(eq(TEAM_ID), any())).thenReturn(
        new PageImpl<>(List.of(lead(), member(2L), member(3L)))
    );
    var page = svc.listMembers(TEAM_ID, lead(), PageRequest.of(0, 50));
    assertThat(page.getTotalElements()).isEqualTo(3);
  }

  @Test
  void listMembers_throws403_whenCallerNotOnTeam() {
    User outsider = User.builder().role(UserRole.IC).build();
    setId(outsider, 99L);
    outsider.setTeamId(999L);
    assertThatThrownBy(() -> svc.listMembers(TEAM_ID, outsider, PageRequest.of(0, 50)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
  }

  @Test
  void updateTeam_renamesWhenLeadIsCaller() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(teams.save(any())).thenAnswer(inv -> inv.getArgument(0));

    TeamDto out = svc.updateTeam(TEAM_ID, lead(), new UpdateTeamRequest("Acme, Inc.", null, null));
    assertThat(out.name()).isEqualTo("Acme, Inc.");
  }

  @Test
  void updateTeam_throws403_whenCallerCannotManage() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    User ic = User.builder().role(UserRole.IC).build();
    setId(ic, OTHER_ID);
    ic.setTeamId(TEAM_ID);
    assertThatThrownBy(() -> svc.updateTeam(TEAM_ID, ic, new UpdateTeamRequest("x", null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
  }

  @Test
  void updateTeam_rejectsBlankName() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    assertThatThrownBy(() -> svc.updateTeam(TEAM_ID, lead(), new UpdateTeamRequest("   ", null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
  }

  @Test
  void updateTeam_throws404_whenTeamMissing() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> svc.updateTeam(TEAM_ID, lead(), new UpdateTeamRequest("x", null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("404");
  }

  private static void setId(Object o, Long id) {
    try {
      var f = o.getClass().getDeclaredField("id");
      f.setAccessible(true);
      f.set(o, id);
    } catch (Exception e) { throw new RuntimeException(e); }
  }
}
```

- [ ] **Step 2: Run test to verify fail**

Run: `cd apps/colign-backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw -Dtest=TeamServiceTest test`
Expected: FAIL — `TeamService` doesn't exist.

- [ ] **Step 3: Write `TeamService` (listMembers + updateTeam only; remove in Phase 3)**

```java
// apps/colign-backend/src/main/java/com/colign/service/TeamService.java
package com.colign.service;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.dto.TeamDto;
import com.colign.dto.UpdateTeamRequest;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Workspace-management operations: list members, update team profile, remove
 * a member. Permissions follow {@link TeamPermissions}; same-team membership
 * is checked here, not in the controller, so reuse from other services stays
 * safe.
 */
@Service
public class TeamService {

  private final TeamRepository teams;
  private final UserRepository users;

  public TeamService(TeamRepository teams, UserRepository users) {
    this.teams = teams;
    this.users = users;
  }

  /** All members of the team. Any team member may call. Paginated. */
  @Transactional(readOnly = true)
  public Page<User> listMembers(Long teamId, User caller, Pageable pageable) {
    requireSameTeam(teamId, caller);
    return users.findByTeamId(teamId, pageable);
  }

  /**
   * Apply only non-null fields. Trim+reject-blank for name. Caller must
   * satisfy {@link TeamPermissions#canManage}. Returns the updated DTO so the
   * FE doesn't need a follow-up GET.
   */
  @Transactional
  public TeamDto updateTeam(Long teamId, User caller, UpdateTeamRequest req) {
    Team t = teams.findById(teamId).orElseThrow(
        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "team not found"));
    if (!TeamPermissions.canManage(caller, t)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only managers may update the team");
    }
    if (req.name() != null) {
      String trimmed = req.name().trim();
      if (trimmed.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name cannot be blank");
      }
      t.setName(trimmed);
    }
    if (req.description() != null) {
      String trimmed = req.description().trim();
      t.setDescription(trimmed.isEmpty() ? null : trimmed);
    }
    if (req.avatarUrl() != null) {
      String trimmed = req.avatarUrl().trim();
      t.setAvatarUrl(trimmed.isEmpty() ? null : trimmed);
    }
    Team saved = teams.save(t);
    return toDto(saved);
  }

  /** DTO mapping. Avatar accessor exists only after PR 4 migration; null until then. */
  public TeamDto toDto(Team t) {
    return new TeamDto(
        t.getId(), t.getName(), t.getDescription(),
        safeAvatarUrl(t), t.getLeadUserId());
  }

  private String safeAvatarUrl(Team t) {
    // Until V5 ships, Team has no avatarUrl getter. Wrap in try/catch so this
    // service is mergeable in Phase 2 before the migration lands.
    try {
      var m = Team.class.getMethod("getAvatarUrl");
      return (String) m.invoke(t);
    } catch (Exception e) {
      return null;
    }
  }

  private void requireSameTeam(Long teamId, User caller) {
    if (caller.getTeamId() == null || !caller.getTeamId().equals(teamId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not a member of this team");
    }
  }
}
```

(The reflection in `safeAvatarUrl` is a temporary bridge so Phase 2 can ship before Phase 4 adds the field. Phase 4 replaces this with a direct getter.)

- [ ] **Step 4: Run test to verify pass**

Run: same as Step 2.
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/service/TeamService.java \
        apps/colign-backend/src/test/java/com/colign/service/TeamServiceTest.java
git commit -m "feat(teams): TeamService.listMembers + updateTeam

List requires same-team membership; update requires TeamPermissions.canManage.
Avatar field bridged via reflection until V5 migration in PR 4."
```

### Task 2.4: Add the two new endpoints to `TeamController`

**Files:**
- Modify: `apps/colign-backend/src/main/java/com/colign/controller/TeamController.java`

- [ ] **Step 1: Add `GET /{teamId}/members` and `PATCH /{teamId}`**

Add these imports if not present:
```java
import com.colign.dto.TeamDto;
import com.colign.dto.UpdateTeamRequest;
import com.colign.service.TeamService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.PatchMapping;
```

Inject `TeamService` into the constructor (add field + parameter). Then append these methods to the class body:

```java
  /** Workspace member roster. Any member may read; cap page size at 2000 per brief. */
  @GetMapping("/{teamId}/members")
  public Page<TeamMemberDto> members(
      @PathVariable Long teamId,
      @PageableDefault(size = 50, sort = "displayName", direction = Sort.Direction.ASC) Pageable pageable) {
    User me = userResolver.resolveCurrent();
    Pageable capped = PageRequest.of(
        pageable.getPageNumber(),
        Math.min(pageable.getPageSize(), 2000),
        pageable.getSort());
    return teamService.listMembers(teamId, me, capped).map(u -> new TeamMemberDto(
        u.getId(), u.getEmail(), u.getDisplayName(),
        userResolver.derivedRole(u).name(),
        u.getAvatarUrl(),
        null /* currentPlan — not needed in the workspace roster; ManagerController serves the roll-up */
    ));
  }

  /** Rename / set description / set avatar URL. Permission-gated in TeamService. */
  @PatchMapping("/{teamId}")
  public TeamDto update(
      @PathVariable Long teamId,
      @Valid @RequestBody UpdateTeamRequest req) {
    User me = userResolver.resolveCurrent();
    return teamService.updateTeam(teamId, me, req);
  }
```

Add `private final TeamService teamService;` field + assign in the constructor.

- [ ] **Step 2: Write controller-wiring test**

```java
// apps/colign-backend/src/test/java/com/colign/controller/TeamControllerWiringTest.java
package com.colign.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.email.EmailClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class TeamControllerWiringTest {

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired UserRepository users;
  @Autowired TeamRepository teams;
  @MockBean EmailClient emailClient;

  private Team team;
  private User lead;

  @BeforeEach
  void seed() {
    lead = users.findByEmail("lead-tcw@example.com").orElseGet(() -> users.save(
        User.builder().email("lead-tcw@example.com").displayName("Lead")
            .role(UserRole.IC).auth0Sub("auth0|lead-tcw").active(true).build()));
    team = (lead.getTeamId() != null
        ? teams.findById(lead.getTeamId()).orElse(null) : null);
    if (team == null) {
      team = teams.save(Team.builder().name("TCW Team").leadUserId(lead.getId()).build());
      lead.setTeamId(team.getId());
      users.save(lead);
    }
  }

  @Test
  void listMembers_returns200_forLead() throws Exception {
    mvc.perform(get("/api/v1/teams/" + team.getId() + "/members").with(jwtFor(lead)))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(200))
        .andExpect(r -> assertThat(r.getResponse().getContentAsString())
            .contains("\"email\":\"lead-tcw@example.com\""));
  }

  @Test
  void listMembers_returns401_withoutAuth() throws Exception {
    mvc.perform(get("/api/v1/teams/" + team.getId() + "/members"))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(401));
  }

  @Test
  void patchTeam_renames() throws Exception {
    String body = json.writeValueAsString(new java.util.LinkedHashMap<>() {{
      put("name", "Renamed Team");
    }});
    mvc.perform(patch("/api/v1/teams/" + team.getId())
            .with(jwtFor(lead))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(r -> {
          assertThat(r.getResponse().getStatus()).isEqualTo(200);
          assertThat(r.getResponse().getContentAsString())
              .contains("\"name\":\"Renamed Team\"");
        });
    assertThat(teams.findById(team.getId()).orElseThrow().getName()).isEqualTo("Renamed Team");
  }

  @Test
  void patchTeam_rejectsBlankName() throws Exception {
    mvc.perform(patch("/api/v1/teams/" + team.getId())
            .with(jwtFor(lead))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"   \"}"))
        .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(400));
  }

  private static RequestPostProcessor jwtFor(User user) {
    return jwt().jwt(jwt -> jwt
        .subject(user.getAuth0Sub())
        .claim("email", user.getEmail())
        .audience(java.util.List.of("https://api.colign.org")));
  }
}
```

- [ ] **Step 3: Run all backend tests**

Run: `cd apps/colign-backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw test`
Expected: PASS — including the new wiring tests + service tests + all existing tests (23+).

- [ ] **Step 4: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/controller/TeamController.java \
        apps/colign-backend/src/main/java/com/colign/repository/UserRepository.java \
        apps/colign-backend/src/test/java/com/colign/controller/TeamControllerWiringTest.java
git commit -m "feat(teams): GET /teams/{id}/members + PATCH /teams/{id}

Members endpoint pages up to 2000 per brief, gates on team membership.
PATCH applies only non-null fields, rejects blank name, permission-gated
via TeamPermissions. Wiring test covers happy path + auth + validation."
```

### Task 2.5: Extend `teamApi` RTK Query slice

**Files:**
- Modify: `apps/colign-frontend/src/api/baseApi.ts`
- Modify: `apps/colign-frontend/src/api/team.ts`

- [ ] **Step 1: Add `"Team"` tag type**

In `baseApi.ts`, update the `tagTypes` array:
```ts
tagTypes: ["Plan", "Commit", "Outcome", "ChessTag", "TeamPage", "Me", "TeamMembers", "Invites", "Team"],
```

- [ ] **Step 2: Extend `team.ts`**

Replace the entire file with:

```ts
// apps/colign-frontend/src/api/team.ts
import { colignApi } from "./baseApi";
import { meApi, type MeDto } from "./me";
import type { SpringPage, TeamMemberDto } from "./types";

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface TeamDto {
  id: number;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  leadUserId: number | null;
}

export const teamApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    /** Manager roll-up: caller's direct reports + each report's latest plan. */
    getManagerTeam: build.query<
      SpringPage<TeamMemberDto>,
      { page?: number; size?: number; sort?: string }
    >({
      query: ({ page = 0, size = 25, sort = "displayName,asc" }) =>
        `manager/team?page=${page}&size=${size}&sort=${sort}`,
      providesTags: (result) =>
        result
          ? [
              ...result.content.map((m) => ({
                type: "Plan" as const,
                id: m.currentPlan?.id ?? `user-${m.userId}`,
              })),
              { type: "TeamPage" as const, id: "LIST" },
            ]
          : [{ type: "TeamPage" as const, id: "LIST" }],
    }),

    /** All members of the workspace (any role; not just reports). */
    getTeamMembers: build.query<
      SpringPage<TeamMemberDto>,
      { teamId: number; page?: number; size?: number }
    >({
      query: ({ teamId, page = 0, size = 50 }) =>
        `teams/${teamId}/members?page=${page}&size=${size}&sort=displayName,asc`,
      providesTags: (result, _err, { teamId }) =>
        result
          ? [
              ...result.content.map((m) => ({
                type: "TeamMembers" as const,
                id: `${teamId}:${m.userId}`,
              })),
              { type: "TeamMembers" as const, id: `${teamId}:LIST` },
            ]
          : [{ type: "TeamMembers" as const, id: `${teamId}:LIST` }],
    }),

    /** Read the team profile (used by the Team section in /settings). */
    getTeam: build.query<TeamDto, { teamId: number }>({
      // No GET /teams/{id} endpoint in the backend yet; until we add it, the
      // /me extension in PR 4 supplies teamName/teamAvatarUrl. For the Settings
      // page in PR 2 we read these from `useGetMeQuery` until /teams/{id} GET
      // lands. Mark the endpoint here so PR 4 wires its concrete URL.
      query: ({ teamId }) => `teams/${teamId}`,
      providesTags: (_r, _e, { teamId }) => [{ type: "Team" as const, id: teamId }],
    }),

    updateTeam: build.mutation<TeamDto, { teamId: number; body: UpdateTeamRequest }>({
      query: ({ teamId, body }) => ({
        url: `teams/${teamId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { teamId }) => [
        { type: "Team" as const, id: teamId },
        "Me",
      ],
    }),

    createTeam: build.mutation<MeDto, CreateTeamRequest>({
      query: (body) => ({ url: "teams", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(meApi.util.upsertQueryData("getMe", undefined, data));
      },
    }),
  }),
});

export const {
  useGetManagerTeamQuery,
  useGetTeamMembersQuery,
  useGetTeamQuery,
  useUpdateTeamMutation,
  useCreateTeamMutation,
} = teamApi;
```

- [ ] **Step 3: Update existing callers of `useGetTeamQuery` (manager dashboard)**

The previous `useGetTeamQuery` returned the manager roll-up. It's now renamed to `useGetManagerTeamQuery`. Update:

Run: `cd apps/colign-frontend && grep -rln "useGetTeamQuery\|useGetTeam(" src/`

Replace every occurrence in `src/pages/ManagerDashboardPage.tsx` (and anywhere else that uses it for the manager roll-up) with `useGetManagerTeamQuery`. The new `useGetTeamQuery` is for the team profile (Settings page).

- [ ] **Step 4: Run all FE tests**

Run: `cd apps/colign-frontend && yarn test`
Expected: PASS — including the existing ManagerDashboardPage tests.

- [ ] **Step 5: Commit**

```bash
git add apps/colign-frontend/src/api/baseApi.ts \
        apps/colign-frontend/src/api/team.ts \
        apps/colign-frontend/src/pages/ManagerDashboardPage.tsx
git commit -m "feat(api): extend teamApi with getTeamMembers + updateTeam

Renames the manager-roll-up hook to useGetManagerTeamQuery; the new
useGetTeamQuery / useGetTeamMembersQuery / useUpdateTeamMutation back
the Settings page. Adds the 'Team' tag for cache invalidation."
```

### Task 2.6: Build `<MembersSection>` + `<TeamSettingsSection>`

**Files:**
- Create: `apps/colign-frontend/src/components/workspace/MembersSection.tsx`
- Create: `apps/colign-frontend/src/components/workspace/MembersSection.test.tsx`
- Create: `apps/colign-frontend/src/components/workspace/TeamSettingsSection.tsx`
- Create: `apps/colign-frontend/src/components/workspace/TeamSettingsSection.test.tsx`

- [ ] **Step 1: Write `<MembersSection>` test**

```tsx
// apps/colign-frontend/src/components/workspace/MembersSection.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({ getMembers: vi.fn() }));

vi.mock("@/api/team", () => ({
  useGetTeamMembersQuery: (...args: unknown[]) => hoisted.getMembers(...args),
}));

import { MembersSection } from "./MembersSection";

describe("MembersSection", () => {
  beforeEach(() => {
    hoisted.getMembers.mockReturnValue(mockQueryResult({
      content: [
        { userId: 1, email: "lead@x", displayName: "Lead", role: "MANAGER", avatarUrl: null },
        { userId: 2, email: "ic@x", displayName: "IC", role: "IC", avatarUrl: null },
      ],
      totalElements: 2, totalPages: 1, number: 0, size: 50, first: true, last: true,
    }));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("renders one row per member", () => {
    renderWithRouter(<MembersSection teamId={42} canManage={true} currentUserId={1} teamLeadId={1} />);
    expect(screen.getByText("Lead")).toBeInTheDocument();
    expect(screen.getByText("IC")).toBeInTheDocument();
  });

  it("shows role on each row", () => {
    renderWithRouter(<MembersSection teamId={42} canManage={true} currentUserId={1} teamLeadId={1} />);
    expect(screen.getByText("MANAGER")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify fail, then implement**

Run: `cd apps/colign-frontend && yarn test src/components/workspace/MembersSection.test.tsx`
Expected: FAIL.

Write:
```tsx
// apps/colign-frontend/src/components/workspace/MembersSection.tsx
import { useGetTeamMembersQuery } from "@/api/team";

interface Props {
  teamId: number;
  canManage: boolean;
  currentUserId: number;
  teamLeadId: number | null;
}

/**
 * Workspace member roster. Read-only in PR 2; PR 3 adds the per-row remove
 * button (rendered only when canManage and the row isn't self or lead).
 */
export function MembersSection({ teamId, canManage, currentUserId, teamLeadId }: Props) {
  const { data, isLoading } = useGetTeamMembersQuery({ teamId });

  if (isLoading) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading members…</p>;
  }
  if (!data || data.content.length === 0) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">No members yet.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      {data.content.map((m) => {
        const isSelf = m.userId === currentUserId;
        const isLead = teamLeadId != null && m.userId === teamLeadId;
        return (
          <li key={m.userId} className="flex items-center gap-3 p-3">
            <div
              aria-hidden
              className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden"
            >
              {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : (m.displayName?.[0] ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                {m.displayName}
                {isSelf && <span className="ml-2 text-xs text-neutral-500">(you)</span>}
                {isLead && <span className="ml-2 text-xs text-neutral-500">(lead)</span>}
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{m.email}</div>
            </div>
            <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{m.role}</span>
            {/* Remove button lands in PR 3, gated on canManage && !isSelf && !isLead */}
            {canManage && !isSelf && !isLead && (
              <span data-cy={`member-${m.userId}-actions`} aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

Run again — expected PASS.

- [ ] **Step 3: Write `<TeamSettingsSection>` test**

```tsx
// apps/colign-frontend/src/components/workspace/TeamSettingsSection.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getTeam: vi.fn(),
  updateFn: vi.fn(),
}));

vi.mock("@/api/team", () => ({
  useGetTeamQuery: (...args: unknown[]) => hoisted.getTeam(...args),
  useUpdateTeamMutation: () => [hoisted.updateFn, { isLoading: false }],
}));

import { TeamSettingsSection } from "./TeamSettingsSection";

const TEAM = { id: 10, name: "Acme", description: "we build", avatarUrl: null, leadUserId: 1 };

describe("TeamSettingsSection", () => {
  beforeEach(() => {
    hoisted.getTeam.mockReturnValue(mockQueryResult(TEAM));
    hoisted.updateFn.mockReturnValue({ unwrap: () => Promise.resolve(TEAM) });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("disables inputs when canManage is false", () => {
    renderWithRouter(<TeamSettingsSection teamId={10} canManage={false} />);
    expect(screen.getByLabelText(/team name/i)).toBeDisabled();
    expect(screen.getByText(/only managers can edit/i)).toBeInTheDocument();
  });

  it("submits the trimmed name on Save", async () => {
    renderWithRouter(<TeamSettingsSection teamId={10} canManage={true} />);
    const input = screen.getByLabelText(/team name/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Acme, Inc.   ");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(hoisted.updateFn).toHaveBeenCalledWith({
      teamId: 10,
      body: expect.objectContaining({ name: "Acme, Inc." }),
    });
  });
});
```

- [ ] **Step 4: Write `<TeamSettingsSection>`**

```tsx
// apps/colign-frontend/src/components/workspace/TeamSettingsSection.tsx
import { useEffect, useState } from "react";
import { useGetTeamQuery, useUpdateTeamMutation } from "@/api/team";

interface Props {
  teamId: number;
  canManage: boolean;
}

export function TeamSettingsSection({ teamId, canManage }: Props) {
  const { data: team, isLoading } = useGetTeamQuery({ teamId });
  const [updateTeam, { isLoading: saving }] = useUpdateTeamMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description ?? "");
    }
  }, [team]);

  if (isLoading) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading team…</p>;
  }
  if (!team) return null;

  async function save() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Team name can't be empty.");
      return;
    }
    try {
      await updateTeam({
        teamId,
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
        },
      }).unwrap();
      setSavedAt(Date.now());
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 403 ? "You don't have permission to update this team."
          : status === 409 ? "Someone else updated this team — refresh and try again."
          : "Could not save changes."
      );
    }
  }

  const dirty = name.trim() !== team.name || (description.trim() || null) !== (team.description ?? null);

  return (
    <div className="space-y-4">
      {!canManage && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2">
          Only managers can edit team details.
        </p>
      )}
      <div>
        <label htmlFor="team-name" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
          Team name
        </label>
        <input
          id="team-name"
          data-cy="team-name-input"
          type="text"
          value={name}
          maxLength={120}
          disabled={!canManage}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-500"
        />
      </div>
      <div>
        <label htmlFor="team-description" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
          Description
        </label>
        <textarea
          id="team-description"
          data-cy="team-description-input"
          value={description}
          maxLength={2000}
          rows={3}
          disabled={!canManage}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-500"
        />
      </div>
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      {savedAt && !error && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
      )}
      <button
        type="button"
        data-cy="team-save"
        onClick={save}
        disabled={!canManage || !dirty || saving}
        className="rounded-lg bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-600 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run both tests**

Run: `cd apps/colign-frontend && yarn test src/components/workspace/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/colign-frontend/src/components/workspace/
git commit -m "feat(workspace): <MembersSection> + <TeamSettingsSection>

Members renders the roster with role + (you)/(lead) annotations.
Team form binds name + description, gates by canManage, surfaces 403/409
errors. Remove-row affordance lands in PR 3; avatar input in PR 4."
```

### Task 2.7: Wire sections into `<WorkspaceSettingsPage>`

**Files:**
- Modify: `apps/colign-frontend/src/pages/WorkspaceSettingsPage.tsx`
- Modify: `apps/colign-frontend/src/pages/WorkspaceSettingsPage.test.tsx`

- [ ] **Step 1: Update the page to render the new sections**

```tsx
// apps/colign-frontend/src/pages/WorkspaceSettingsPage.tsx
import { Navigate } from "react-router-dom";
import { useGetMeQuery } from "@/api/me";
import { useGetTeamQuery } from "@/api/team";
import { InviteForm } from "@/components/InviteForm";
import { MembersSection } from "@/components/workspace/MembersSection";
import { TeamSettingsSection } from "@/components/workspace/TeamSettingsSection";
import { canManageTeam } from "@/lib/permissions";

export function WorkspaceSettingsPage() {
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const teamId = me?.teamId ?? null;
  const { data: team } = useGetTeamQuery({ teamId: teamId ?? 0 }, { skip: teamId == null });

  if (meLoading) return <Loading />;
  if (me && me.teamId == null) return <Navigate to="onboarding" replace />;
  if (!me?.teamId) return null;

  const canManage = canManageTeam(me, team ?? null);

  return (
    <div className="px-4 sm:px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Workspace settings
      </h1>

      <section aria-labelledby="team-heading" className="mt-10">
        <h2 id="team-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4">Team</h2>
        <TeamSettingsSection teamId={me.teamId} canManage={canManage} />
      </section>

      <section aria-labelledby="members-heading" className="mt-12">
        <h2 id="members-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4">Members</h2>
        <MembersSection
          teamId={me.teamId}
          canManage={canManage}
          currentUserId={me.id}
          teamLeadId={team?.leadUserId ?? null}
        />
      </section>

      <section aria-labelledby="invitations-heading" className="mt-12">
        <h2 id="invitations-heading" className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4">Invitations</h2>
        <InviteForm teamId={me.teamId} />
      </section>
    </div>
  );
}

function Loading() {
  return (
    <div className="px-4 sm:px-6 py-10">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
    </div>
  );
}
```

- [ ] **Step 2: Update the page test to cover the wired sections**

Add an additional mock for `useGetTeamQuery` and `useGetTeamMembersQuery` in `WorkspaceSettingsPage.test.tsx`, mirroring the InviteForm pattern.

- [ ] **Step 3: Backend GET `/teams/{id}` missing — add a quick endpoint**

The FE `useGetTeamQuery` hits `GET /api/v1/teams/{id}`. The backend currently has no such endpoint. Add a tiny one to `TeamController`:

```java
@GetMapping("/{teamId}")
public TeamDto get(@PathVariable Long teamId) {
  User me = userResolver.resolveCurrent();
  Team t = teams.findById(teamId).orElseThrow(
      () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "team not found"));
  if (me.getTeamId() == null || !me.getTeamId().equals(teamId)) {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not a member of this team");
  }
  return teamService.toDto(t);
}
```

Add `ResponseStatusException`, `HttpStatus` imports if not present.

Extend `TeamControllerWiringTest`:
```java
@Test
void getTeam_returns200_forMember() throws Exception {
  mvc.perform(get("/api/v1/teams/" + team.getId()).with(jwtFor(lead)))
      .andExpect(r -> {
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(r.getResponse().getContentAsString()).contains("\"name\":\"TCW Team\"");
      });
}
```

- [ ] **Step 4: Run all tests (BE + FE)**

```bash
cd apps/colign-backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw test
cd apps/colign-frontend && yarn test
```
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/controller/TeamController.java \
        apps/colign-backend/src/test/java/com/colign/controller/TeamControllerWiringTest.java \
        apps/colign-frontend/src/pages/WorkspaceSettingsPage.tsx \
        apps/colign-frontend/src/pages/WorkspaceSettingsPage.test.tsx
git commit -m "feat(settings): wire <TeamSettingsSection> + <MembersSection>

Settings page now renders all three sections live. Backend adds
GET /teams/{id} so the page can read the team profile (used by both
sections + the canManageTeam check)."
```

### Task 2.8: Cypress scenarios — list members + rename

**Files:**
- Modify: `apps/colign-frontend/cypress/e2e/workspace-settings.feature`
- Modify: `apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts`

- [ ] **Step 1: Add scenarios**

Append to `workspace-settings.feature`:

```gherkin
  Scenario: Lead sees all team members in the Members section
    When I open the workspace settings from the user menu
    Then I should see the Members section
    And the Members list contains "lead@example.com"

  Scenario: Lead renames the team
    When I open the workspace settings from the user menu
    And I change the team name to "Renamed Acme"
    And I save the team settings
    Then I should see a saved confirmation
    And reloading the page keeps the team name as "Renamed Acme"
```

- [ ] **Step 2: Add step definitions**

Append to `workspace-settings.ts`:

```ts
Then("I should see the Members section", () => {
  cy.contains("h2", "Members").should("be.visible");
});

Then("the Members list contains {string}", (email: string) => {
  cy.contains(email).should("be.visible");
});

When("I change the team name to {string}", (name: string) => {
  cy.get('[data-cy="team-name-input"]').clear().type(name);
});

When("I save the team settings", () => {
  cy.get('[data-cy="team-save"]').click();
});

Then("I should see a saved confirmation", () => {
  cy.contains(/saved/i).should("be.visible");
});

Then("reloading the page keeps the team name as {string}", (name: string) => {
  cy.reload();
  cy.get('[data-cy="team-name-input"]').should("have.value", name);
});
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/colign-frontend && yarn cy:run --spec "cypress/e2e/workspace-settings.feature"
```
Expected: 3 scenarios PASS.

```bash
git add apps/colign-frontend/cypress/e2e/workspace-settings.feature \
        apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts
git commit -m "test(cypress): cover member-list + rename"
```

### Task 2.9: Open PR 2

```bash
git push
gh pr create --title "feat(settings): list workspace members + rename team" --body "$(cat <<'EOF'
## Summary
- Backend: `GET /api/v1/teams/{id}/members`, `GET /api/v1/teams/{id}`, `PATCH /api/v1/teams/{id}`. Permission-gated via new `TeamPermissions.canManage` (mirrors `canManageTeam` on the FE).
- Frontend: `<MembersSection>` lists the roster; `<TeamSettingsSection>` renames the team. `useGetTeamQuery` + `useGetTeamMembersQuery` + `useUpdateTeamMutation` added to `teamApi`. The pre-existing `useGetTeamQuery` is renamed to `useGetManagerTeamQuery` for clarity.
- Cypress: scenarios for member list + rename + reload-persists.

## Verify in dev
1. Sign in as your lead account.
2. `/settings` → confirm Members list shows everyone (including yourself).
3. Rename the team → Save → see green Saved. Refresh; name sticks.
4. Sign in as a non-lead IC on the same team. Confirm the Team form is disabled with the "Only managers can edit team details" explainer.

## Test plan
- [ ] `./mvnw test` — green, including TeamServiceTest (6), TeamPermissionsTest (5), TeamControllerWiringTest (5).
- [ ] `yarn test` — green, including 4 new component tests.
- [ ] `yarn cy:run` — green, 3 workspace scenarios.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

After merge + deploy, verify in prod before Phase 3.

---

## Phase 3 · PR 3: Remove member

**PR title:** `feat(settings): remove team members with orphan cascade`
**Risk:** Medium. New DELETE endpoint with cascading manager_id nulling. The cascade is data-touching but bounded to the removed user's reports; no other rows change. Optimistic concurrency via `version`.
**Verification:** Remove a teammate from the Members section; confirm orphan reports show no manager; confirm the removed user is bounced to /onboarding on next request.

### Task 3.1: Extend `TeamService` with `removeMember`

**Files:**
- Modify: `apps/colign-backend/src/main/java/com/colign/service/TeamService.java`
- Modify: `apps/colign-backend/src/test/java/com/colign/service/TeamServiceTest.java`

- [ ] **Step 1: Add failing test cases**

Append to `TeamServiceTest`:

```java
@Test
void removeMember_succeeds_andOrphanReports() {
  when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
  User manager = member(2L); manager.setRole(UserRole.IC);
  when(users.findById(2L)).thenReturn(Optional.of(manager));
  User report1 = member(3L); report1.setManagerId(2L);
  User report2 = member(4L); report2.setManagerId(2L);
  when(users.findByManagerId(2L)).thenReturn(List.of(report1, report2));
  when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

  svc.removeMember(TEAM_ID, 2L, lead());

  assertThat(report1.getManagerId()).isNull();
  assertThat(report2.getManagerId()).isNull();
  assertThat(manager.getTeamId()).isNull();
  assertThat(manager.getManagerId()).isNull();
}

@Test
void removeMember_blocksRemovingTheLead() {
  when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
  when(users.findById(LEAD_ID)).thenReturn(Optional.of(lead()));
  User admin = User.builder().role(UserRole.ADMIN).build();
  setId(admin, 99L); admin.setTeamId(TEAM_ID);
  assertThatThrownBy(() -> svc.removeMember(TEAM_ID, LEAD_ID, admin))
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("400");
}

@Test
void removeMember_blocksLeadFromLeavingThemselves() {
  when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
  when(users.findById(LEAD_ID)).thenReturn(Optional.of(lead()));
  assertThatThrownBy(() -> svc.removeMember(TEAM_ID, LEAD_ID, lead()))
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("400");
}

@Test
void removeMember_allowsSelfRemovalForNonLead() {
  when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
  User ic = member(2L);
  when(users.findById(2L)).thenReturn(Optional.of(ic));
  when(users.findByManagerId(2L)).thenReturn(List.of());
  when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

  svc.removeMember(TEAM_ID, 2L, ic);
  assertThat(ic.getTeamId()).isNull();
}

@Test
void removeMember_throws403_whenCallerCannotManageAndIsNotSelf() {
  when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
  User ic = member(2L);
  User other = member(3L);
  when(users.findById(3L)).thenReturn(Optional.of(other));
  assertThatThrownBy(() -> svc.removeMember(TEAM_ID, 3L, ic))
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("403");
}

@Test
void removeMember_throws404_whenUserNotOnTeam() {
  when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
  User outsider = User.builder().role(UserRole.IC).build();
  setId(outsider, 99L);
  outsider.setTeamId(999L);
  when(users.findById(99L)).thenReturn(Optional.of(outsider));
  assertThatThrownBy(() -> svc.removeMember(TEAM_ID, 99L, lead()))
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("404");
}
```

- [ ] **Step 2: Run, verify fail, implement**

Run: `./mvnw -Dtest=TeamServiceTest test`
Expected: FAIL.

Append to `TeamService.java`:

```java
@Transactional
public void removeMember(Long teamId, Long userIdToRemove, User caller) {
  Team t = teams.findById(teamId).orElseThrow(
      () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "team not found"));
  User target = users.findById(userIdToRemove).orElseThrow(
      () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
  if (target.getTeamId() == null || !target.getTeamId().equals(teamId)) {
    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "user is not on this team");
  }

  boolean isSelf = target.getId().equals(caller.getId());
  Long leadId = t.getLeadUserId();
  boolean isLead = leadId != null && leadId.equals(target.getId());

  if (isLead) {
    throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Cannot remove the team lead. Transfer the lead first (not yet supported).");
  }
  if (!isSelf && !TeamPermissions.canManage(caller, t)) {
    throw new ResponseStatusException(
        HttpStatus.FORBIDDEN, "only managers may remove other members");
  }

  // Orphan any reports — set manager_id null. Their derived role recomputes
  // on next /me; they remain on the team.
  users.findByManagerId(target.getId()).forEach(report -> {
    report.setManagerId(null);
    users.save(report);
  });

  target.setTeamId(null);
  target.setManagerId(null);
  users.save(target);
}
```

Run: `./mvnw -Dtest=TeamServiceTest test`
Expected: PASS (11 total — 6 from Phase 2 + 5 new).

- [ ] **Step 3: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/service/TeamService.java \
        apps/colign-backend/src/test/java/com/colign/service/TeamServiceTest.java
git commit -m "feat(teams): TeamService.removeMember with orphan cascade

Orphans the removed user's reports (manager_id=null) rather than
silently reassigning. Blocks removal of team lead until transfer-lead
is built; allows self-leave for non-lead members."
```

### Task 3.2: Add DELETE endpoint + wiring test

**Files:**
- Modify: `apps/colign-backend/src/main/java/com/colign/controller/TeamController.java`
- Modify: `apps/colign-backend/src/test/java/com/colign/controller/TeamControllerWiringTest.java`

- [ ] **Step 1: Add controller method**

Add import: `import org.springframework.web.bind.annotation.DeleteMapping;` and:

```java
@DeleteMapping("/{teamId}/members/{userId}")
public ResponseEntity<Void> removeMember(
    @PathVariable Long teamId,
    @PathVariable Long userId) {
  User me = userResolver.resolveCurrent();
  teamService.removeMember(teamId, userId, me);
  return ResponseEntity.noContent().build();
}
```

- [ ] **Step 2: Extend wiring test**

Append to `TeamControllerWiringTest`:

```java
@Test
void deleteMember_orphan_reports_and_returns204() throws Exception {
  User report = users.findByEmail("report-tcw@example.com").orElseGet(() ->
      users.save(User.builder()
          .email("report-tcw@example.com").displayName("Report")
          .role(UserRole.IC).auth0Sub("auth0|report-tcw").active(true)
          .build()));
  // Place report on the team, managed by a manager we'll then remove
  User manager = users.findByEmail("mgr-tcw@example.com").orElseGet(() ->
      users.save(User.builder()
          .email("mgr-tcw@example.com").displayName("Mgr")
          .role(UserRole.IC).auth0Sub("auth0|mgr-tcw").active(true)
          .build()));
  manager.setTeamId(team.getId());
  manager = users.save(manager);
  report.setTeamId(team.getId());
  report.setManagerId(manager.getId());
  users.save(report);

  mvc.perform(delete("/api/v1/teams/" + team.getId() + "/members/" + manager.getId())
          .with(jwtFor(lead)))
      .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(204));

  assertThat(users.findById(manager.getId()).orElseThrow().getTeamId()).isNull();
  assertThat(users.findById(report.getId()).orElseThrow().getManagerId()).isNull();
}

@Test
void deleteMember_400_whenRemovingLead() throws Exception {
  mvc.perform(delete("/api/v1/teams/" + team.getId() + "/members/" + lead.getId())
          .with(jwtFor(lead)))
      .andExpect(r -> assertThat(r.getResponse().getStatus()).isEqualTo(400));
}
```

Add import: `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;`

Run: `./mvnw test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/controller/TeamController.java \
        apps/colign-backend/src/test/java/com/colign/controller/TeamControllerWiringTest.java
git commit -m "feat(teams): DELETE /teams/{id}/members/{userId} endpoint"
```

### Task 3.3: Extend `teamApi` with `removeTeamMember`

**Files:**
- Modify: `apps/colign-frontend/src/api/team.ts`

- [ ] **Step 1: Add mutation**

Insert before `createTeam` in the `endpoints` block:

```ts
    removeTeamMember: build.mutation<void, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `teams/${teamId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { teamId }) => [
        { type: "TeamMembers" as const, id: `${teamId}:LIST` },
        "Me",
        { type: "TeamPage" as const, id: "LIST" },
      ],
    }),
```

Add `useRemoveTeamMemberMutation` to the bottom `export const { ... }` block.

- [ ] **Step 2: Commit**

```bash
git add apps/colign-frontend/src/api/team.ts
git commit -m "feat(api): useRemoveTeamMemberMutation"
```

### Task 3.4: Build `<ConfirmDialog>` reusable modal

**Files:**
- Create: `apps/colign-frontend/src/components/ConfirmDialog.tsx`
- Create: `apps/colign-frontend/src/components/ConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/colign-frontend/src/components/ConfirmDialog.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/render";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("renders nothing when closed", () => {
    renderWithRouter(
      <ConfirmDialog open={false} onCancel={() => {}} onConfirm={() => {}} title="x" body="b" confirmLabel="Yes" />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with title + body when open", () => {
    renderWithRouter(
      <ConfirmDialog open={true} onCancel={() => {}} onConfirm={() => {}} title="Remove?" body="Are you sure?" confirmLabel="Remove" />,
    );
    const dialog = screen.getByRole("dialog", { name: /remove\?/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onConfirm when Confirm clicked", async () => {
    const onConfirm = vi.fn();
    renderWithRouter(
      <ConfirmDialog open={true} onCancel={() => {}} onConfirm={onConfirm} title="x" body="b" confirmLabel="Yes" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel on Escape", async () => {
    const onCancel = vi.fn();
    renderWithRouter(
      <ConfirmDialog open={true} onCancel={onCancel} onConfirm={() => {}} title="x" body="b" confirmLabel="Yes" />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// apps/colign-frontend/src/components/ConfirmDialog.tsx
import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Minimal accessible confirm modal. role=dialog, aria-labelledby on title,
 * focus trapped to the dialog while open, Escape closes. No portal — the
 * dialog renders in place; the .fixed wrapper handles the overlay. Good
 * enough for v1; swap for Radix Dialog if we ever need scroll-locking or
 * deeply-nested portals.
 */
export function ConfirmDialog({
  open, title, body, confirmLabel, cancelLabel = "Cancel",
  destructive = false, onCancel, onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </h2>
        <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{body}</div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            data-cy="confirm-dialog-confirm"
            className={
              "rounded-lg px-4 py-2 text-sm font-medium text-white " +
              (destructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run + commit**

Run: `cd apps/colign-frontend && yarn test src/components/ConfirmDialog.test.tsx`
Expected: PASS.

```bash
git add apps/colign-frontend/src/components/ConfirmDialog.tsx \
        apps/colign-frontend/src/components/ConfirmDialog.test.tsx
git commit -m "feat(ui): <ConfirmDialog> minimal accessible modal"
```

### Task 3.5: Wire Remove in `<MembersSection>`

**Files:**
- Modify: `apps/colign-frontend/src/components/workspace/MembersSection.tsx`
- Modify: `apps/colign-frontend/src/components/workspace/MembersSection.test.tsx`

- [ ] **Step 1: Update test with remove flow**

Replace the `MembersSection.test.tsx` with an extended version:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getMembers: vi.fn(),
  removeFn: vi.fn(),
}));

vi.mock("@/api/team", () => ({
  useGetTeamMembersQuery: (...args: unknown[]) => hoisted.getMembers(...args),
  useRemoveTeamMemberMutation: () => [hoisted.removeFn, { isLoading: false }],
}));

import { MembersSection } from "./MembersSection";

const ROSTER = {
  content: [
    { userId: 1, email: "lead@x", displayName: "Lead", role: "MANAGER", avatarUrl: null },
    { userId: 2, email: "ic@x", displayName: "IC", role: "IC", avatarUrl: null },
  ],
  totalElements: 2, totalPages: 1, number: 0, size: 50, first: true, last: true,
};

describe("MembersSection", () => {
  beforeEach(() => {
    hoisted.getMembers.mockReturnValue(mockQueryResult(ROSTER));
    hoisted.removeFn.mockReturnValue({ unwrap: () => Promise.resolve() });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("renders Remove button only for non-self non-lead rows when canManage", () => {
    renderWithRouter(<MembersSection teamId={42} canManage={true} currentUserId={1} teamLeadId={1} />);
    // Lead row (id=1) is self AND lead — no Remove.
    expect(screen.queryByRole("button", { name: /remove lead/i })).not.toBeInTheDocument();
    // IC row (id=2) — Remove visible.
    expect(screen.getByRole("button", { name: /remove ic/i })).toBeInTheDocument();
  });

  it("does not render Remove buttons when canManage is false", () => {
    renderWithRouter(<MembersSection teamId={42} canManage={false} currentUserId={1} teamLeadId={1} />);
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("opens a confirm dialog and calls removeTeamMember on confirm", async () => {
    renderWithRouter(<MembersSection teamId={42} canManage={true} currentUserId={1} teamLeadId={1} />);
    await userEvent.click(screen.getByRole("button", { name: /remove ic/i }));
    expect(screen.getByRole("dialog", { name: /remove ic/i })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(hoisted.removeFn).toHaveBeenCalledWith({ teamId: 42, userId: 2 });
  });
});
```

- [ ] **Step 2: Update implementation**

```tsx
// apps/colign-frontend/src/components/workspace/MembersSection.tsx
import { useState } from "react";
import { useGetTeamMembersQuery, useRemoveTeamMemberMutation } from "@/api/team";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { TeamMemberDto } from "@/api/types";

interface Props {
  teamId: number;
  canManage: boolean;
  currentUserId: number;
  teamLeadId: number | null;
}

export function MembersSection({ teamId, canManage, currentUserId, teamLeadId }: Props) {
  const { data, isLoading } = useGetTeamMembersQuery({ teamId });
  const [removeMember, { isLoading: removing }] = useRemoveTeamMemberMutation();
  const [target, setTarget] = useState<TeamMemberDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading members…</p>;
  if (!data || data.content.length === 0) return <p className="text-sm text-neutral-600 dark:text-neutral-400">No members yet.</p>;

  async function confirm() {
    if (!target) return;
    setError(null);
    try {
      await removeMember({ teamId, userId: target.userId }).unwrap();
      setTarget(null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(status === 400
        ? "Couldn't remove this member (likely the team lead)."
        : status === 403 ? "You don't have permission."
        : "Could not remove the member.");
    }
  }

  return (
    <>
      {error && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        {data.content.map((m) => {
          const isSelf = m.userId === currentUserId;
          const isLead = teamLeadId != null && m.userId === teamLeadId;
          const showRemove = canManage && !isSelf && !isLead;
          return (
            <li key={m.userId} className="flex items-center gap-3 p-3">
              <div aria-hidden className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden">
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : (m.displayName?.[0] ?? "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                  {m.displayName}
                  {isSelf && <span className="ml-2 text-xs text-neutral-500">(you)</span>}
                  {isLead && <span className="ml-2 text-xs text-neutral-500">(lead)</span>}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{m.email}</div>
              </div>
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{m.role}</span>
              {showRemove && (
                <button
                  type="button"
                  onClick={() => setTarget(m)}
                  aria-label={`Remove ${m.displayName}`}
                  data-cy={`remove-member-${m.userId}`}
                  className="text-xs text-rose-700 dark:text-rose-400 hover:underline px-2"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={target != null}
        title={target ? `Remove ${target.displayName}?` : ""}
        body={
          <div className="space-y-2">
            <p>{target?.email} will lose access to this workspace immediately.</p>
            <p className="text-xs text-neutral-500">
              Anyone reporting to this person will be left without a manager
              and can be re-attached via re-invitation later.
            </p>
          </div>
        }
        confirmLabel={removing ? "Removing…" : "Remove member"}
        destructive
        onCancel={() => setTarget(null)}
        onConfirm={confirm}
      />
    </>
  );
}
```

- [ ] **Step 3: Run + commit**

Run: `cd apps/colign-frontend && yarn test`
Expected: PASS — all `MembersSection.test.tsx` cases.

```bash
git add apps/colign-frontend/src/components/workspace/MembersSection.tsx \
        apps/colign-frontend/src/components/workspace/MembersSection.test.tsx
git commit -m "feat(workspace): per-row Remove member with ConfirmDialog

Gated on canManage && !isSelf && !isLead. Confirm copy warns about
the orphan-reports cascade; surfaces 400/403/500 errors inline."
```

### Task 3.6: Cypress scenario — remove member + orphan reports

**Files:**
- Modify: `apps/colign-frontend/cypress/e2e/workspace-settings.feature`
- Modify: `apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts`

- [ ] **Step 1: Append scenario**

```gherkin
  Scenario: Lead removes a teammate
    When I open the workspace settings from the user menu
    And I click Remove on the member with email "ic@example.com"
    And I confirm the removal
    Then the Members list no longer contains "ic@example.com"
```

- [ ] **Step 2: Add steps**

```ts
When("I click Remove on the member with email {string}", (email: string) => {
  cy.contains("li", email).within(() => {
    cy.contains("button", /remove/i).click();
  });
});

When("I confirm the removal", () => {
  cy.get('[data-cy="confirm-dialog-confirm"]').click();
});

Then("the Members list no longer contains {string}", (email: string) => {
  cy.contains(email).should("not.exist");
});
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/colign-frontend && yarn cy:run
```
Expected: 4 scenarios PASS.

```bash
git add apps/colign-frontend/cypress/e2e/
git commit -m "test(cypress): cover remove-member happy path"
```

### Task 3.7: Open PR 3

```bash
git push
gh pr create --title "feat(settings): remove team members with orphan cascade" --body "$(cat <<'EOF'
## Summary
- Backend: `DELETE /api/v1/teams/{id}/members/{userId}`. Blocks lead removal, allows self-leave for non-leads, orphans the removed user's reports (manager_id null).
- Frontend: per-row Remove in `<MembersSection>` opens `<ConfirmDialog>` that explains the orphan cascade. RTK Query mutation invalidates the members + Me + manager-roll-up caches.
- Cypress scenario covers the happy path.

## Verify in dev
1. Sign in as lead. Invite + accept a test IC. Then make that IC a manager (have them invite a REPORT).
2. Settings → Members → Remove the mid-tier manager. Confirm the dialog explains orphan cascade.
3. After confirm: the IC is gone, the IC's report (still on the team) has `managerId: null` (check `/api/v1/manager/team` from the lead's account — they should now be a direct report).
4. Sign in as the removed user: bounced to `/onboarding`.

## Test plan
- [ ] `./mvnw test` — green, including 5 new `removeMember` service tests + 2 controller tests.
- [ ] `yarn test` — green, including `ConfirmDialog` + `MembersSection` remove flow.
- [ ] `yarn cy:run` — green, 4 workspace scenarios.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

After merge + deploy, verify in prod before Phase 4.

---

## Phase 4 · PR 4: Team avatar + header identity display

**PR title:** `feat(settings): team avatar URL + AppShell identity pill`
**Risk:** Low. Additive column on `team` (NULL default), additive field on `MeDto`, additive component in `AppShell`.
**Verification:** Settings → Team → paste an image URL → Save. Avatar renders in the header pill + on Settings + (optionally) invite emails.

### Task 4.1: V5 Flyway migration

**Files:**
- Create: `apps/colign-backend/src/main/resources/db/migration/V5__team_avatar.sql`

- [ ] **Step 1: Write migration**

```sql
-- V5__team_avatar.sql
-- Adds team.avatar_url for the workspace-management feature.
-- Backwards-compatible: existing rows get NULL; FE falls back to a generated
-- initial. No backfill.
SET search_path TO wc;

ALTER TABLE team ADD COLUMN avatar_url VARCHAR(500);
```

- [ ] **Step 2: Run backend tests to verify Flyway applies cleanly**

Run: `cd apps/colign-backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:/opt/homebrew/bin:$PATH ./mvnw clean test`
Expected: PASS — `clean` clears any stale target/classes Flyway state from previous V5 attempts.

- [ ] **Step 3: Commit**

```bash
git add apps/colign-backend/src/main/resources/db/migration/V5__team_avatar.sql
git commit -m "feat(db): V5 add team.avatar_url"
```

### Task 4.2: Add `avatarUrl` to `Team` domain + `MeDto` extension

**Files:**
- Modify: `apps/colign-backend/src/main/java/com/colign/domain/Team.java`
- Modify: `apps/colign-backend/src/main/java/com/colign/dto/MeDto.java`
- Modify: `apps/colign-backend/src/main/java/com/colign/service/UserResolver.java`
- Modify: `apps/colign-backend/src/main/java/com/colign/service/TeamService.java`

- [ ] **Step 1: Add `avatarUrl` field to `Team`**

In `Team.java`, add the column annotation + field (matching the existing Lombok pattern; assume `@Getter @Setter @Builder` style):

```java
@Column(name = "avatar_url", length = 500)
private String avatarUrl;
```

- [ ] **Step 2: Remove reflection bridge from `TeamService.toDto`**

Replace `safeAvatarUrl(t)` with the direct getter:
```java
public TeamDto toDto(Team t) {
  return new TeamDto(t.getId(), t.getName(), t.getDescription(), t.getAvatarUrl(), t.getLeadUserId());
}
```
Delete the `safeAvatarUrl` helper.

- [ ] **Step 3: Extend `MeDto` with team name + avatar**

```java
// MeDto.java — add two fields to the @Builder record. Existing FE callers
// already tolerate optional fields (TS marks them `string | null`).
public record MeDto(
    Long id,
    String email,
    String displayName,
    String role,
    Long teamId,
    Long managerId,
    boolean needsInvite,
    String teamName,
    String teamAvatarUrl
) {
  @lombok.Builder public MeDto {}
}
```

(If the existing `MeDto` uses `@Builder` on a class rather than a record, adapt the change — add the two fields + their builder methods.)

- [ ] **Step 4: Populate the new fields in `UserResolver.toMeDto`**

```java
public com.colign.dto.MeDto toMeDto(User user) {
  Long teamId = user.getTeamId();
  String teamName = null, teamAvatarUrl = null;
  if (teamId != null) {
    Team t = teams.findById(teamId).orElse(null);
    if (t != null) {
      teamName = t.getName();
      teamAvatarUrl = t.getAvatarUrl();
    }
  }
  return com.colign.dto.MeDto.builder()
      .id(user.getId())
      .email(user.getEmail())
      .displayName(user.getDisplayName())
      .role(derivedRole(user).name())
      .teamId(teamId)
      .managerId(user.getManagerId())
      .needsInvite(needsInvite(teamId))
      .teamName(teamName)
      .teamAvatarUrl(teamAvatarUrl)
      .build();
}
```

This requires `UserResolver` to gain a `TeamRepository` field. Add:
```java
private final TeamRepository teams;
// constructor parameter + assignment
```

- [ ] **Step 5: Run all backend tests**

Run: `./mvnw test`
Expected: PASS. Tests that asserted exact `MeDto` shape may need to add the two new optional fields.

- [ ] **Step 6: Commit**

```bash
git add apps/colign-backend/src/main/java/com/colign/domain/Team.java \
        apps/colign-backend/src/main/java/com/colign/dto/MeDto.java \
        apps/colign-backend/src/main/java/com/colign/service/UserResolver.java \
        apps/colign-backend/src/main/java/com/colign/service/TeamService.java
git commit -m "feat(team): expose avatar_url; embed teamName + teamAvatarUrl in /me"
```

### Task 4.3: Extend FE `MeDto` interface + `TeamPill` component

**Files:**
- Modify: `apps/colign-frontend/src/api/me.ts`
- Create: `apps/colign-frontend/src/components/TeamPill.tsx`
- Create: `apps/colign-frontend/src/components/TeamPill.test.tsx`

- [ ] **Step 1: Extend `MeDto`**

```ts
export interface MeDto {
  id: number;
  email: string;
  displayName: string;
  role: "IC" | "MANAGER" | "ADMIN";
  teamId: number | null;
  managerId: number | null;
  needsInvite: boolean;
  teamName: string | null;
  teamAvatarUrl: string | null;
}
```

- [ ] **Step 2: Write `<TeamPill>` test**

```tsx
// apps/colign-frontend/src/components/TeamPill.test.tsx
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TeamPill } from "./TeamPill";

describe("TeamPill", () => {
  afterEach(cleanup);

  it("renders team name", () => {
    render(<TeamPill name="Acme Co" avatarUrl={null} />);
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is set", () => {
    render(<TeamPill name="Acme Co" avatarUrl="https://x/a.png" />);
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("src", "https://x/a.png");
  });

  it("falls back to initial when avatarUrl is null", () => {
    render(<TeamPill name="Acme Co" avatarUrl={null} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("returns null when name is empty", () => {
    const { container } = render(<TeamPill name="" avatarUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 3: Implement**

```tsx
// apps/colign-frontend/src/components/TeamPill.tsx
interface Props {
  name: string;
  avatarUrl: string | null;
}

export function TeamPill({ name, avatarUrl }: Props) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1.5 max-w-[200px]"
      title={name}
    >
      <span
        aria-hidden
        className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center overflow-hidden flex-shrink-0"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          : initial}
      </span>
      <span className="text-sm text-neutral-900 dark:text-neutral-50 truncate">{name}</span>
    </span>
  );
}
```

- [ ] **Step 4: Run + commit**

Run: `cd apps/colign-frontend && yarn test src/components/TeamPill.test.tsx`
Expected: PASS.

```bash
git add apps/colign-frontend/src/api/me.ts \
        apps/colign-frontend/src/components/TeamPill.tsx \
        apps/colign-frontend/src/components/TeamPill.test.tsx
git commit -m "feat(workspace): <TeamPill> + teamName/teamAvatarUrl on MeDto"
```

### Task 4.4: Mount `<TeamPill>` in AppShell + avatar input in TeamSettingsSection

**Files:**
- Modify: `apps/colign-frontend/src/components/AppShell.tsx`
- Modify: `apps/colign-frontend/src/components/workspace/TeamSettingsSection.tsx`

- [ ] **Step 1: Render `<TeamPill>` next to the brand**

In `AppShell.tsx`, after the `<Link to="."><ColignBrand /></Link>` block, add:

```tsx
{me?.teamName && (
  <>
    <span aria-hidden className="text-neutral-300 dark:text-neutral-700">/</span>
    <TeamPill name={me.teamName} avatarUrl={me.teamAvatarUrl} />
  </>
)}
```

Add import: `import { TeamPill } from "@/components/TeamPill";`

- [ ] **Step 2: Add avatar URL input to `<TeamSettingsSection>`**

After the description textarea, before the error/saved/Save block:

```tsx
<div>
  <label htmlFor="team-avatar-url" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
    Avatar URL
  </label>
  <input
    id="team-avatar-url"
    data-cy="team-avatar-input"
    type="url"
    value={avatarUrl}
    maxLength={500}
    disabled={!canManage}
    onChange={(e) => setAvatarUrl(e.target.value)}
    placeholder="https://…"
    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-500"
  />
  {avatarUrl && (
    <div className="mt-2 flex items-center gap-2">
      <img
        src={avatarUrl}
        alt=""
        className="h-10 w-10 rounded object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="text-xs text-neutral-500">Preview</span>
    </div>
  )}
</div>
```

Add `avatarUrl` to the component state:
```tsx
const [avatarUrl, setAvatarUrl] = useState("");
// in the useEffect that seeds from `team`:
setAvatarUrl(team.avatarUrl ?? "");
```

Update the `save` body:
```ts
await updateTeam({
  teamId,
  body: {
    name: trimmedName,
    description: description.trim() || undefined,
    avatarUrl: avatarUrl.trim() || undefined,
  },
}).unwrap();
```

Update the `dirty` check to include avatarUrl:
```ts
const dirty =
  name.trim() !== team.name ||
  (description.trim() || null) !== (team.description ?? null) ||
  (avatarUrl.trim() || null) !== (team.avatarUrl ?? null);
```

- [ ] **Step 3: Run + commit**

Run: `cd apps/colign-frontend && yarn test`
Expected: PASS. Update `TeamSettingsSection.test.tsx` if it asserted the exact field set.

```bash
git add apps/colign-frontend/src/components/AppShell.tsx \
        apps/colign-frontend/src/components/workspace/TeamSettingsSection.tsx
git commit -m "feat(workspace): TeamPill in header + avatar URL input in Settings"
```

### Task 4.5: Update invite email template to render team avatar

**Files:**
- Modify: `apps/colign-backend/src/main/resources/templates/email/invitation.html` (or actual path; find via `grep -rln "invitation" apps/colign-backend/src/main/resources/templates`)

- [ ] **Step 1: Find the template**

Run: `grep -rln "inviter\|teamName" apps/colign-backend/src/main/resources/`

Locate the invitation email template. If it's a Thymeleaf file with a header section, add:

```html
<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
  <img th:if="${teamAvatarUrl != null}"
       th:src="${teamAvatarUrl}" alt="" width="32" height="32"
       style="border-radius:6px;object-fit:cover" />
  <span style="font-size:14px;color:#111827;font-weight:600" th:text="${teamName}">Team</span>
</div>
```

Pass `teamAvatarUrl` through the model from `InvitationService` (look for where the template is rendered). If the avatar isn't loaded, skip this step and ship without — the email already works.

- [ ] **Step 2: Commit (only if a template was found and changed)**

```bash
git add apps/colign-backend/src/main/resources/templates/email/invitation.html \
        apps/colign-backend/src/main/java/com/colign/service/InvitationService.java
git commit -m "feat(invite-email): render team avatar in invitation header"
```

### Task 4.6: Cypress — set avatar + verify renders

**Files:**
- Modify: `apps/colign-frontend/cypress/e2e/workspace-settings.feature`
- Modify: `apps/colign-frontend/cypress/e2e/workspace-settings/workspace-settings.ts`

- [ ] **Step 1: Append scenario**

```gherkin
  Scenario: Lead sets team avatar
    When I open the workspace settings from the user menu
    And I set the team avatar URL to "https://placehold.co/64x64.png"
    And I save the team settings
    Then I should see a saved confirmation
    And the AppShell header shows the team name
```

- [ ] **Step 2: Add steps**

```ts
When("I set the team avatar URL to {string}", (url: string) => {
  cy.get('[data-cy="team-avatar-input"]').clear().type(url);
});

Then("the AppShell header shows the team name", () => {
  cy.get("header").contains(/acme|renamed/i).should("be.visible");
});
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/colign-frontend && yarn cy:run
```
Expected: 5 scenarios PASS.

```bash
git add apps/colign-frontend/cypress/e2e/
git commit -m "test(cypress): cover team avatar set + header render"
```

### Task 4.7: Open PR 4

```bash
git push
gh pr create --title "feat(settings): team avatar URL + AppShell identity pill" --body "$(cat <<'EOF'
## Summary
- Backend: V5 Flyway adds `team.avatar_url`. PATCH endpoint already accepted `avatarUrl` (Phase 2 plumbed it). `/me` now embeds `teamName` + `teamAvatarUrl` so the AppShell renders the workspace identity without an extra query.
- Frontend: avatar URL input + preview in `<TeamSettingsSection>`. `<TeamPill>` mounted next to the Colign brand in `AppShell` shows the team name (always) + avatar (when set), truncated at 200px.
- Email: invitation header gets the team avatar (only if the template was found; safe no-op otherwise).
- Cypress scenario covers the round-trip.

## Verify in dev
1. Sign in as lead. `/settings` → Team → paste any image URL → see preview.
2. Save → header pill shows the avatar.
3. Invite a real address → check the email; if templated correctly, the avatar shows in the header.
4. Sign in as another team member: pill renders for them too.

## Test plan
- [ ] `./mvnw clean test` — green (clean clears stale Flyway state).
- [ ] `yarn test` — green, including `<TeamPill>` + extended `<TeamSettingsSection>`.
- [ ] `yarn cy:run` — green, 5 workspace scenarios.

## Definition of done
This PR closes the full workspace-management feature defined in
`docs/superpowers/specs/2026-05-31-workspace-management-ia-design.md`.
A user can: sign up → create team → invite teammate from inside the
app → see all members → rename team → set avatar → remove a member —
without ever leaving the SPA.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 5 · Handoff doc

### Task 5.1: Write the shipped handoff

**Files:**
- Create: `docs/handoffs/YYYY-MM-DD-workspace-management-shipped.md` (date is the day all 4 PRs are merged).

- [ ] **Step 1: Write the handoff using the project convention**

Match frontmatter style from existing handoffs in `docs/handoffs/`. Summarize: 4 PRs merged, what shipped per PR, where the spec/plan live, prod verification status, what's parked for next time (per spec §4).

- [ ] **Step 2: Commit + push**

```bash
git add docs/handoffs/YYYY-MM-DD-workspace-management-shipped.md
git commit -m "docs(handoff): workspace-management shipped (4 PRs)"
git push
```

---

## Self-review (run after finishing the plan)

**Spec coverage** — every F# from spec §3 maps to at least one phase:

| Spec | Phase |
|------|-------|
| F1 (in-app invite) | Phase 1, Tasks 1.2, 1.5 |
| F2 (members list) | Phase 2, Tasks 2.3, 2.4, 2.6, 2.7 |
| F3 (rename team) | Phase 2, Tasks 2.3, 2.4, 2.6, 2.7 |
| F4 (remove member) | Phase 3, all tasks |
| F5 (team avatar) | Phase 4, all tasks |
| F6 (entry point) | Phase 1, Tasks 1.3, 1.4 |

**Permissions** (spec §7) — Tasks 1.1, 2.2 (TeamPermissions + canManageTeam), gated everywhere they apply.

**Edge cases** (spec §8): orphan-on-remove → Task 3.1; rename-to-empty → Tasks 2.3, 2.4; concurrent rename via `version` → uses existing `AbstractAuditingEntity.version`, surfaced via 409 in Task 2.6; lead can't leave → Task 3.1; avatar URL fallback → `<TeamPill>` and `<MembersSection>` use `onError` fallback.

**Testing** (spec §10): Vitest, JaCoCo, Cypress all covered. Accessibility patterns (`role="dialog"`, `role="menu"`, `aria-labelledby`, Escape) explicit in components.

**Open questions resolved** at the top of this plan.

**Placeholder scan:** searched for "TBD", "TODO", "later", "..." — none in code blocks.

**Type consistency:** `TeamDto` shape identical across BE (record) and FE (interface). `UpdateTeamRequest` fields identical. Hook names consistent: `useGetTeamQuery`, `useGetTeamMembersQuery`, `useUpdateTeamMutation`, `useRemoveTeamMemberMutation`.

---

## Execution Handoff

Plan complete and saved to [docs/superpowers/plans/2026-05-31-workspace-management.md](docs/superpowers/plans/2026-05-31-workspace-management.md). Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Pick one to proceed.
