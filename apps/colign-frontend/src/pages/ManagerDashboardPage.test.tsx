import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockQueryResult, mockQueryLoading, renderWithRouter } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getManagerTeam: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/api/team", () => ({
  useGetManagerTeamQuery: (...args: unknown[]) => hoisted.getManagerTeam(...args),
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => hoisted.navigate };
});

import { ManagerDashboardPage } from "./ManagerDashboardPage";

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 25,
  first: true,
  last: true,
};

const onePage = {
  content: [
    {
      userId: 2,
      email: "ic@example.com",
      displayName: "Ima IC",
      role: "IC",
      avatarUrl: null,
      currentPlan: null,
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 25,
  first: true,
  last: true,
};

describe("ManagerDashboardPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("with no direct reports (solo lead / emptied team)", () => {
    beforeEach(() => {
      hoisted.getManagerTeam.mockReturnValue(mockQueryResult(emptyPage));
    });

    it("shows the empty state with an Invite teammates CTA instead of KPI zeros", () => {
      renderWithRouter(<ManagerDashboardPage />);
      expect(screen.getByText(/no teammates yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /invite teammates/i })).toBeInTheDocument();
      // The KPI grid + roll-up table are replaced by the empty state. Match the
      // exact KPI label so the header subtitle ("...your direct reports...")
      // doesn't count as a false positive.
      expect(screen.queryByText("Direct reports")).not.toBeInTheDocument();
    });

    it("does NOT leak the dev-seed account names", () => {
      renderWithRouter(<ManagerDashboardPage />);
      expect(screen.queryByText(/manager@st6\.dev/i)).not.toBeInTheDocument();
    });

    it("routes the Invite teammates CTA to /settings", async () => {
      const user = userEvent.setup();
      renderWithRouter(<ManagerDashboardPage />);
      await user.click(screen.getByRole("button", { name: /invite teammates/i }));
      expect(hoisted.navigate).toHaveBeenCalledWith("../settings", { relative: "path" });
    });
  });

  it("does not flash the empty state while the first request is loading", () => {
    hoisted.getManagerTeam.mockReturnValue(mockQueryLoading());
    renderWithRouter(<ManagerDashboardPage />);
    expect(screen.queryByText(/no teammates yet/i)).not.toBeInTheDocument();
  });

  it("shows the KPI roll-up (not the empty state) once reports exist", () => {
    hoisted.getManagerTeam.mockReturnValue(mockQueryResult(onePage));
    renderWithRouter(<ManagerDashboardPage />);
    expect(screen.queryByText(/no teammates yet/i)).not.toBeInTheDocument();
    expect(screen.getByText("Direct reports")).toBeInTheDocument();
  });
});
