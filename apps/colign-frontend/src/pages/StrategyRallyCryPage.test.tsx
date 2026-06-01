import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockQueryResult, renderWithRouter } from "@/test/render";
import { readWizardState } from "@/lib/strategyWizard";

const hoisted = vi.hoisted(() => ({
  getMe: vi.fn(),
  createRallyCry: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/api/me", () => ({ useGetMeQuery: () => hoisted.getMe() }));
vi.mock("@/api/strategy", () => ({
  useCreateRallyCryMutation: () => [hoisted.createRallyCry, { isLoading: false }],
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

import { StrategyRallyCryPage } from "./StrategyRallyCryPage";

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

describe("StrategyRallyCryPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    hoisted.getMe.mockReturnValue(mockQueryResult(ME));
    hoisted.createRallyCry.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 7, title: "Win", teamId: 42 }),
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Step 1 with the Rally Cry headline and CTA", () => {
    renderWithRouter(<StrategyRallyCryPage />);
    expect(
      screen.getByRole("heading", { name: /name your team's rally cry/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create rally cry/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it("creates the Rally Cry, persists its id, and advances to the objective step", async () => {
    renderWithRouter(<StrategyRallyCryPage />);
    await userEvent.type(screen.getByPlaceholderText(/ship faster/i), "Win the quarter");
    await userEvent.click(screen.getByRole("button", { name: /create rally cry/i }));

    expect(hoisted.createRallyCry).toHaveBeenCalledWith({ title: "Win the quarter" });
    expect(readWizardState(42)).toEqual({ rallyCryId: 7 });
    expect(hoisted.navigate).toHaveBeenCalledWith("../objective", { relative: "path" });
  });

  it("redirects to the app when strategy is already complete", () => {
    hoisted.getMe.mockReturnValue(mockQueryResult({ ...ME, strategySetupComplete: true }));
    renderWithRouter(<StrategyRallyCryPage />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("../../..");
  });

  it("redirects teamless users out of the wizard", () => {
    hoisted.getMe.mockReturnValue(mockQueryResult({ ...ME, teamId: null }));
    renderWithRouter(<StrategyRallyCryPage />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("../..");
  });
});
