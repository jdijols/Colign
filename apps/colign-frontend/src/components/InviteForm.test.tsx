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
