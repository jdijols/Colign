import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({ getPlanByWeek: vi.fn() }));
vi.mock("@/api/plans", () => ({
  useGetPlanByWeekQuery: (...args: unknown[]) => hoisted.getPlanByWeek(...args),
}));

import { CommitsWeekView } from "./CommitsWeekView";

const COMMIT = {
  id: 1,
  planId: 5,
  outcomeId: 9,
  outcomeTitle: "Ship the MVP",
  outcomePriority: "P1",
  chessTagId: 1,
  chessTagCode: "OFFENSE",
  title: "Wire the auth flow",
  description: null,
  plannedEffortHours: 8,
  status: "PLANNED",
  ordinal: 0,
  carriedFromCommitId: null,
  reconciliation: null,
};

const PLAN = {
  id: 5,
  userId: 1,
  weekStartDate: "2026-06-01",
  state: "DRAFT",
  commits: [COMMIT],
};

describe("CommitsWeekView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the week's commits with posture and hours", () => {
    hoisted.getPlanByWeek.mockReturnValue(mockQueryResult(PLAN));
    render(<CommitsWeekView week="2026-06-01" />);
    expect(screen.getByText("Wire the auth flow")).toBeInTheDocument();
    expect(screen.getByText("→ Ship the MVP")).toBeInTheDocument();
    expect(screen.getByText("Offense")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
  });

  it("shows the empty state when there is no plan for the week", () => {
    hoisted.getPlanByWeek.mockReturnValue(mockQueryResult(null));
    render(<CommitsWeekView week="2026-05-25" />);
    expect(screen.getByText(/no commits this week/i)).toBeInTheDocument();
  });

  it("shows the empty state when the plan exists but has no commits", () => {
    hoisted.getPlanByWeek.mockReturnValue(mockQueryResult({ ...PLAN, commits: [] }));
    render(<CommitsWeekView week="2026-06-01" />);
    expect(screen.getByText(/no commits this week/i)).toBeInTheDocument();
  });
});
