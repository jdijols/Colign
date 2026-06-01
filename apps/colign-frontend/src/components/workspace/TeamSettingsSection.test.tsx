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
