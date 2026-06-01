import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getMe: vi.fn(),
  listInvitations: vi.fn(),
  createMutationFn: vi.fn(),
  getTeam: vi.fn(),
  getTeamMembers: vi.fn(),
  updateFn: vi.fn(),
  removeFn: vi.fn(),
}));

vi.mock("@/api/me", () => ({
  useGetMeQuery: () => hoisted.getMe(),
}));
vi.mock("@/api/invites", () => ({
  useListInvitationsQuery: (...args: unknown[]) => hoisted.listInvitations(...args),
  useCreateInvitationMutation: () => [hoisted.createMutationFn, { isLoading: false }],
}));
vi.mock("@/api/team", () => ({
  useGetTeamQuery: (...args: unknown[]) => hoisted.getTeam(...args),
  useGetTeamMembersQuery: (...args: unknown[]) => hoisted.getTeamMembers(...args),
  useUpdateTeamMutation: () => [hoisted.updateFn, { isLoading: false }],
  useRemoveTeamMemberMutation: () => [hoisted.removeFn, { isLoading: false }],
}));

import { WorkspaceSettingsPage } from "./WorkspaceSettingsPage";

const ME = {
  id: 1,
  email: "u@example.com",
  displayName: "U",
  role: "IC" as const,
  teamId: 42,
  managerId: null,
  needsInvite: false,
};

const TEAM = { id: 42, name: "Acme", description: null, avatarUrl: null, leadUserId: 1 };

describe("WorkspaceSettingsPage", () => {
  beforeEach(() => {
    hoisted.getMe.mockReturnValue(mockQueryResult(ME));
    hoisted.listInvitations.mockReturnValue(mockQueryResult([]));
    hoisted.getTeam.mockReturnValue(mockQueryResult(TEAM));
    hoisted.getTeamMembers.mockReturnValue(
      mockQueryResult({
        content: [
          { userId: 1, email: "u@example.com", displayName: "U", role: "IC", avatarUrl: null },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 50,
        first: true,
        last: true,
      }),
    );
    hoisted.updateFn.mockReturnValue({ unwrap: () => Promise.resolve(TEAM) });
    hoisted.removeFn.mockReturnValue({ unwrap: () => Promise.resolve() });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders four sections including Appearance", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    expect(screen.getByRole("region", { name: /team/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /appearance/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /members/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /invitations/i })).toBeInTheDocument();
  });

  it("renders three appearance options (Light / Dark / System) as a radio group", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    const group = screen.getByRole("radiogroup", { name: /appearance/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /system/i })).toBeInTheDocument();
  });

  it("renders the team name input in the Team section", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
  });

  it("renders the members list in the Members section", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    expect(screen.getByText("u@example.com")).toBeInTheDocument();
  });

  it("renders the InviteForm under the Invitations section", () => {
    renderWithRouter(<WorkspaceSettingsPage />);
    expect(screen.getByPlaceholderText(/teammate@company\.com/i)).toBeInTheDocument();
  });
});
