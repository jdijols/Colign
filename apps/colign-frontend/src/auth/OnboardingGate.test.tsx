import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { mockQueryResult, mockQueryLoading, renderWithRouter } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getMe: vi.fn(),
  getTeam: vi.fn(),
}));

vi.mock("@/api/me", () => ({
  useGetMeQuery: () => hoisted.getMe(),
}));

vi.mock("@/api/team", () => ({
  useGetTeamQuery: (...args: unknown[]) => hoisted.getTeam(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <span data-testid="redirect">{to}</span>,
  };
});

import { OnboardingGate } from "./OnboardingGate";

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

function child() {
  return <div data-testid="app">the app</div>;
}

describe("OnboardingGate", () => {
  beforeEach(() => {
    hoisted.getTeam.mockReturnValue(mockQueryResult({ id: 42, leadUserId: 1 }));
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("redirects teamless users to onboarding", () => {
    hoisted.getMe.mockReturnValue(mockQueryResult({ ...ME, teamId: null }));
    renderWithRouter(<OnboardingGate>{child()}</OnboardingGate>);
    expect(screen.getByTestId("redirect")).toHaveTextContent("onboarding");
  });

  it("routes an author (team lead) with incomplete strategy to the wizard", () => {
    // me.id === team.leadUserId → canManageTeam true even as a derived IC
    hoisted.getMe.mockReturnValue(mockQueryResult({ ...ME, strategySetupComplete: false }));
    hoisted.getTeam.mockReturnValue(mockQueryResult({ id: 42, leadUserId: 1 }));
    renderWithRouter(<OnboardingGate>{child()}</OnboardingGate>);
    expect(screen.getByTestId("redirect")).toHaveTextContent("onboarding/strategy/rally-cry");
  });

  it("routes a MANAGER with incomplete strategy to the wizard", () => {
    hoisted.getMe.mockReturnValue(
      mockQueryResult({ ...ME, role: "MANAGER", strategySetupComplete: false }),
    );
    hoisted.getTeam.mockReturnValue(mockQueryResult({ id: 42, leadUserId: 999 }));
    renderWithRouter(<OnboardingGate>{child()}</OnboardingGate>);
    expect(screen.getByTestId("redirect")).toHaveTextContent("onboarding/strategy/rally-cry");
  });

  it("shows the ask-your-admin empty state to a plain IC with incomplete strategy", () => {
    // IC who is NOT the lead → no authority → empty state, not the wizard
    hoisted.getMe.mockReturnValue(mockQueryResult({ ...ME, strategySetupComplete: false }));
    hoisted.getTeam.mockReturnValue(mockQueryResult({ id: 42, leadUserId: 999 }));
    renderWithRouter(<OnboardingGate>{child()}</OnboardingGate>);
    expect(screen.queryByTestId("redirect")).not.toBeInTheDocument();
    expect(screen.getByText(/strategy setup in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/ask your team admin/i)).toBeInTheDocument();
  });

  it("renders the app once strategy is complete", () => {
    hoisted.getMe.mockReturnValue(mockQueryResult({ ...ME, strategySetupComplete: true }));
    renderWithRouter(<OnboardingGate>{child()}</OnboardingGate>);
    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("waits (no decision) while /me is loading", () => {
    hoisted.getMe.mockReturnValue(mockQueryLoading());
    renderWithRouter(<OnboardingGate>{child()}</OnboardingGate>);
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(screen.queryByTestId("redirect")).not.toBeInTheDocument();
    expect(screen.getByText(/loading your workspace/i)).toBeInTheDocument();
  });
});
