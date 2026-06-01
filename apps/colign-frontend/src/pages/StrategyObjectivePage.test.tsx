import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockQueryResult, renderWithRouter } from "@/test/render";
import { readWizardState, writeWizardState } from "@/lib/strategyWizard";

const hoisted = vi.hoisted(() => ({
  getMe: vi.fn(),
  createObjective: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/api/me", () => ({ useGetMeQuery: () => hoisted.getMe() }));
vi.mock("@/api/strategy", () => ({
  useCreateDefiningObjectiveMutation: () => [hoisted.createObjective, { isLoading: false }],
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigate,
    Navigate: ({ to }: { to: string }) => <span data-testid="redirect">{to}</span>,
  };
});
vi.mock("@/components/Brand", () => ({ ColignBrand: () => <span>colign</span> }));

import { StrategyObjectivePage } from "./StrategyObjectivePage";

const ME = {
  id: 1,
  email: "u@example.com",
  displayName: "U",
  role: "IC" as const,
  teamId: 42,
  managerId: null,
  needsInvite: false,
  teamName: "Acme",
  teamAvatarUrl: null,
  strategySetupComplete: false,
};

describe("StrategyObjectivePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    hoisted.getMe.mockReturnValue(mockQueryResult(ME));
    hoisted.createObjective.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 9, rallyCryId: 7, teamId: 42, title: "Obj" }),
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("redirects back to Step 1 when no Rally Cry has been created", () => {
    renderWithRouter(<StrategyObjectivePage />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("../rally-cry");
  });

  it("resumes at Step 2 when a Rally Cry id is present (browser-close resume)", () => {
    writeWizardState(42, { rallyCryId: 7 });
    renderWithRouter(<StrategyObjectivePage />);
    expect(
      screen.getByRole("heading", { name: /name your team's defining objective/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/step 2 of 3/i)).toBeInTheDocument();
  });

  it("Back preserves the Rally Cry (does not destroy the Step-1 node)", async () => {
    writeWizardState(42, { rallyCryId: 7 });
    renderWithRouter(<StrategyObjectivePage />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(hoisted.navigate).toHaveBeenCalledWith("../rally-cry", { relative: "path" });
    // The Rally Cry id is still cached — going Back never deletes it.
    expect(readWizardState(42)).toEqual({ rallyCryId: 7 });
  });

  it("creates the Objective, persists its id, and advances to the outcome step", async () => {
    writeWizardState(42, { rallyCryId: 7 });
    renderWithRouter(<StrategyObjectivePage />);
    await userEvent.type(screen.getByPlaceholderText(/time-to-first-value/i), "Cut TTV");
    await userEvent.click(screen.getByRole("button", { name: /create objective/i }));

    expect(hoisted.createObjective).toHaveBeenCalledWith({ rallyCryId: 7, title: "Cut TTV" });
    expect(readWizardState(42)).toEqual({ rallyCryId: 7, definingObjectiveId: 9 });
    expect(hoisted.navigate).toHaveBeenCalledWith("../outcome", { relative: "path" });
  });
});
