import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({ listOutcomes: vi.fn() }));
vi.mock("@/api/outcomes", () => ({
  useListOutcomesQuery: (...args: unknown[]) => hoisted.listOutcomes(...args),
}));
vi.mock("@/api/strategy", () => ({
  useCreateOutcomeMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteOutcomeMutation: () => [vi.fn(), { isLoading: false }],
}));

import { StrategyWeekView } from "./StrategyWeekView";

const OUTCOME = {
  id: 1,
  title: "Ship the MVP",
  priorityTier: "P1",
  definingObjectiveId: 10,
  definingObjectiveTitle: "Launch v1",
  rallyCryId: 100,
  rallyCryTitle: "Win the quarter",
  createdDate: "2026-06-01T12:00:00Z",
  effectiveTo: null,
};

function outcomePage(content: unknown[]) {
  return mockQueryResult({
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 200,
    first: true,
    last: true,
  });
}

describe("StrategyWeekView", () => {
  beforeEach(() => hoisted.listOutcomes.mockReturnValue(outcomePage([OUTCOME])));
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the RC → DO → Outcome tree for a week at/after establishment", () => {
    render(<StrategyWeekView week="2026-06-01" />);
    expect(screen.getByText("Win the quarter")).toBeInTheDocument();
    expect(screen.getByText("Launch v1")).toBeInTheDocument();
    expect(screen.getByText("Ship the MVP")).toBeInTheDocument();
  });

  it("shows the empty state for a week before anything was established", () => {
    render(<StrategyWeekView week="2026-05-25" />);
    expect(screen.getByText(/no goals established yet/i)).toBeInTheDocument();
  });

  it("hides a retired Outcome in weeks after its retirement, keeps it before", () => {
    hoisted.listOutcomes.mockReturnValue(
      outcomePage([{ ...OUTCOME, effectiveTo: "2026-06-15T00:00:00Z" }]),
    );
    // Week of Jun 1 — created and not yet retired → visible.
    const { unmount } = render(<StrategyWeekView week="2026-06-01" />);
    expect(screen.getByText("Ship the MVP")).toBeInTheDocument();
    unmount();
    // Week of Jun 22 — retired Jun 15 → gone.
    render(<StrategyWeekView week="2026-06-22" />);
    expect(screen.queryByText("Ship the MVP")).not.toBeInTheDocument();
  });

  it("treats an outcome with no createdDate as always established", () => {
    hoisted.listOutcomes.mockReturnValue(outcomePage([{ ...OUTCOME, createdDate: undefined }]));
    render(<StrategyWeekView week="2026-01-05" />);
    expect(screen.getByText("Ship the MVP")).toBeInTheDocument();
  });

  it("shows add/remove affordances only when editable", () => {
    const { unmount } = render(<StrategyWeekView week="2026-06-01" />);
    expect(document.querySelector('[data-cy="add-outcome"]')).toBeNull();
    expect(document.querySelector('[data-cy="remove-outcome-1"]')).toBeNull();
    unmount();
    render(<StrategyWeekView week="2026-06-01" editable />);
    expect(document.querySelector('[data-cy="add-outcome"]')).toBeTruthy();
    expect(document.querySelector('[data-cy="remove-outcome-1"]')).toBeTruthy();
  });
});
