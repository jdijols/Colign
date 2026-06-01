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
    { userId: 2, email: "ic@x", displayName: "IC Member", role: "ADMIN", avatarUrl: null },
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
    // IC Member row (id=2) — Remove visible.
    expect(screen.getByRole("button", { name: /remove ic member/i })).toBeInTheDocument();
  });

  it("does not render Remove buttons when canManage is false", () => {
    renderWithRouter(<MembersSection teamId={42} canManage={false} currentUserId={1} teamLeadId={1} />);
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("opens a confirm dialog and calls removeTeamMember on confirm", async () => {
    renderWithRouter(<MembersSection teamId={42} canManage={true} currentUserId={1} teamLeadId={1} />);
    await userEvent.click(screen.getByRole("button", { name: /remove ic member/i }));
    expect(screen.getByRole("dialog", { name: /remove ic member/i })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    expect(hoisted.removeFn).toHaveBeenCalledWith({ teamId: 42, userId: 2 });
  });
});
