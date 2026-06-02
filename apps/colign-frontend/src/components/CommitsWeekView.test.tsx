import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  getPlanByWeek: vi.fn(),
  listOutcomes: vi.fn(),
}));
vi.mock("@/api/plans", () => ({
  useGetPlanByWeekQuery: (...args: unknown[]) => hoisted.getPlanByWeek(...args),
}));
// CommitsWeekView reads outcomes to source the Rally Cry on the empty branch
// (DESIGN.md §1: page never loads without strategic context). Mocked here so
// the populated tests don't accidentally exercise the fallback path.
vi.mock("@/api/outcomes", () => ({
  useListOutcomesQuery: (...args: unknown[]) => hoisted.listOutcomes(...args),
}));

import { CommitsWeekView } from "./CommitsWeekView";

function renderInRouter(week: string) {
  return render(
    <MemoryRouter>
      <CommitsWeekView week={week} />
    </MemoryRouter>,
  );
}

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
  beforeEach(() => {
    // Default to "no outcomes" so the empty-state Rally-Cry-Goals fallback is
    // exercised when not overridden. Populated tests can re-stub as needed.
    hoisted.listOutcomes.mockReturnValue(mockQueryResult({ content: [] }));
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the week's commits with posture and hours, grouped under the Outcome", () => {
    hoisted.getPlanByWeek.mockReturnValue(mockQueryResult(PLAN));
    renderInRouter("2026-06-01");
    expect(screen.getByText("Wire the auth flow")).toBeInTheDocument();
    // DESIGN.md §9: Outcome is the section header (left-rule cascade), not a
    // "→ outcome" subtitle on each commit row.
    expect(screen.getByText("Ship the MVP")).toBeInTheDocument();
    expect(screen.getByText("Offense")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
    // DESIGN.md §10: priority is surfaced as "Medium" (consumer-friendly tone),
    // translated from the internal P1 code.
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("shows the empty state when there is no plan for the week", () => {
    hoisted.getPlanByWeek.mockReturnValue(mockQueryResult(null));
    renderInRouter("2026-05-25");
    expect(screen.getByText(/no commits this week/i)).toBeInTheDocument();
    // DESIGN.md §1 + §11: Strategy anchor must render even on empty so the
    // page never loads without strategic context.
    expect(screen.getByText(/aiming for/i)).toBeInTheDocument();
    // DESIGN.md §11: ghost CTA pointing to Goals, lifted out of prose so the
    // next action is discoverable.
    expect(screen.getByText(/add a commit in goals/i)).toBeInTheDocument();
  });

  it("shows the empty state when the plan exists but has no commits", () => {
    hoisted.getPlanByWeek.mockReturnValue(mockQueryResult({ ...PLAN, commits: [] }));
    renderInRouter("2026-06-01");
    expect(screen.getByText(/no commits this week/i)).toBeInTheDocument();
  });
});
