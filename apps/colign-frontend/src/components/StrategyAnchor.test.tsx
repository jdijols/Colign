import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { mockQueryLoading, mockQueryResult, renderWithRouter } from "@/test/render";
import type { OutcomeRefDto } from "@/api/types";

const hoisted = vi.hoisted(() => ({
  listOutcomes: vi.fn(),
}));

vi.mock("@/api/outcomes", () => ({
  useListOutcomesQuery: (...args: unknown[]) => hoisted.listOutcomes(...args),
}));

import { StrategyAnchor } from "./StrategyAnchor";

function outcome(over: Partial<OutcomeRefDto> = {}): OutcomeRefDto {
  return {
    id: 1,
    title: "Migrate auth to JWT",
    priorityTier: "P0",
    definingObjectiveId: 10,
    definingObjectiveTitle: "Cut p95 by 50%",
    rallyCryId: 100,
    rallyCryTitle: "Ship 10x faster",
    ...over,
  };
}

function pageOf(items: OutcomeRefDto[]) {
  return {
    content: items,
    totalElements: items.length,
    totalPages: 1,
    number: 0,
    size: 200,
    first: true,
    last: true,
  };
}

describe("StrategyAnchor", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    hoisted.listOutcomes.mockReturnValue(mockQueryResult(pageOf([outcome()])));
  });

  it("renders the full RC → DO → Outcome chain when the team has exactly one Outcome", () => {
    renderWithRouter(<StrategyAnchor />);
    expect(screen.getByText(/aiming for/i)).toBeInTheDocument();
    expect(screen.getByText("Ship 10x faster")).toBeInTheDocument();
    expect(screen.getByText("Cut p95 by 50%")).toBeInTheDocument();
    expect(screen.getByText("Migrate auth to JWT")).toBeInTheDocument();
    // Priority tier badge surfaces explicitly so users see strategic weight at a glance.
    expect(screen.getByText("P0")).toBeInTheDocument();
  });

  it("compacts to a summary when the team has multiple Outcomes", () => {
    hoisted.listOutcomes.mockReturnValue(
      mockQueryResult(
        pageOf([
          outcome({ id: 1, title: "Migrate auth to JWT" }),
          outcome({
            id: 2,
            title: "Cache layer",
            definingObjectiveId: 11,
            definingObjectiveTitle: "Improve perf",
          }),
          outcome({
            id: 3,
            title: "Onboarding wizard",
            definingObjectiveId: 11,
            definingObjectiveTitle: "Improve perf",
          }),
        ]),
      ),
    );
    renderWithRouter(<StrategyAnchor />);
    // RC remains visible — the locked §11 breadcrumb shape is
    // "Aiming for · {Rally Cry}". The previous "· N Objectives · M Outcomes"
    // count tail was dropped (cycle-3 critic #3 / DESIGN.md §10): structural
    // node counts are taxonomy noise that don't help an IC act on their week,
    // and the wrap they caused at 375px regressed §12's pill anti-pattern.
    expect(screen.getByText("Ship 10x faster")).toBeInTheDocument();
    // Pin the absence: the surface must not regress to count metadata.
    expect(screen.queryByText(/Objectives/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Outcomes/i)).not.toBeInTheDocument();
    // Full-chain bits NOT rendered (the deriver still routes to summary mode).
    expect(screen.queryByText("Migrate auth to JWT")).not.toBeInTheDocument();
  });

  it("singularizes labels for 1 Objective + 1 Outcome of distinct kinds", () => {
    // Edge case the deriver guards against: one Outcome under one DO under
    // one RC still chooses the "full" shape, not "summary". This test pins
    // the boundary so a future tweak doesn't silently widen the summary path.
    hoisted.listOutcomes.mockReturnValue(mockQueryResult(pageOf([outcome()])));
    renderWithRouter(<StrategyAnchor />);
    // We're in full mode, so no summary line surfaces.
    expect(screen.queryByText(/Objectives/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Outcomes/i)).not.toBeInTheDocument();
  });

  it("renders nothing while outcomes are loading (avoid a flash of empty anchor)", () => {
    hoisted.listOutcomes.mockReturnValue(mockQueryLoading());
    const { container } = renderWithRouter(<StrategyAnchor />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the team has no Outcomes yet (defensive — OnboardingGate should have caught this)", () => {
    hoisted.listOutcomes.mockReturnValue(mockQueryResult(pageOf([])));
    const { container } = renderWithRouter(<StrategyAnchor />);
    expect(container.firstChild).toBeNull();
  });
});
