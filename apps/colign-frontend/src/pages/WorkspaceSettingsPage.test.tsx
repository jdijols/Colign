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
