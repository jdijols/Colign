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
        { userId: 2, email: "ic@x", displayName: "IC", role: "ADMIN", avatarUrl: null },
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
