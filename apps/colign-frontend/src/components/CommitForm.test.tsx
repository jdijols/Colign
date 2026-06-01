import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter, mockQueryResult } from "@/test/render";

const hoisted = vi.hoisted(() => ({
  addCommit: vi.fn(),
  listOutcomes: vi.fn(),
  listTags: vi.fn(),
}));

vi.mock("@/api/commits", () => ({
  useAddCommitMutation: () => [hoisted.addCommit, { isLoading: false }],
}));

vi.mock("@/api/outcomes", () => ({
  useListOutcomesQuery: (...args: unknown[]) => hoisted.listOutcomes(...args),
}));

vi.mock("@/api/chessTags", () => ({
  useListChessTagsQuery: (...args: unknown[]) => hoisted.listTags(...args),
}));

import { CommitForm } from "./CommitForm";

const OUTCOMES_PAGE = {
  content: [
    {
      id: 11,
      title: "Ship onboarding redesign",
      priorityTier: "P0",
      definingObjectiveTitle: "Reduce p50 onboarding time",
      rallyCryTitle: "Ship faster, support stronger",
    },
    {
      id: 12,
      title: "Cache user permissions",
      priorityTier: "P1",
      definingObjectiveTitle: "Cut p95 API latency",
      rallyCryTitle: "Ship faster, support stronger",
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 200,
  first: true,
  last: true,
};

const CHESS_TAGS = [
  { id: 1, code: "OFFENSE", label: "Offense", priorityRank: 1 },
  { id: 2, code: "DEFENSE", label: "Defense", priorityRank: 2 },
  { id: 3, code: "MAINTENANCE", label: "Maintenance", priorityRank: 3 },
];

describe("CommitForm", () => {
  beforeEach(() => {
    hoisted.listOutcomes.mockReturnValue(mockQueryResult(OUTCOMES_PAGE));
    hoisted.listTags.mockReturnValue(mockQueryResult(CHESS_TAGS));
    hoisted.addCommit.mockReturnValue({ unwrap: () => Promise.resolve({ id: 99 }) });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("disables the submit button until both title and outcome are filled", async () => {
    renderWithRouter(<CommitForm planId={7} onDone={vi.fn()} onCancel={vi.fn()} />);
    const submit = screen.getByRole("button", { name: /save commit/i });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/what are you committing to/i), "Wire RCDO picker");
    expect(submit).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText(/which outcome does this support/i), "11");
    expect(submit).not.toBeDisabled();
  });

  it("submits with the selected outcome id and calls onDone", async () => {
    const onDone = vi.fn();
    renderWithRouter(<CommitForm planId={7} onDone={onDone} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/what are you committing to/i), "Wire RCDO picker");
    await userEvent.selectOptions(screen.getByLabelText(/which outcome does this support/i), "11");
    await userEvent.click(screen.getByRole("button", { name: /save commit/i }));

    expect(hoisted.addCommit).toHaveBeenCalledWith({
      planId: 7,
      body: expect.objectContaining({ title: "Wire RCDO picker", outcomeId: 11 }),
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("surfaces the mutation error when the API rejects", async () => {
    hoisted.addCommit.mockReturnValue({
      unwrap: () => Promise.reject(new Error("network exploded")),
    });
    renderWithRouter(<CommitForm planId={7} onDone={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/what are you committing to/i), "Wire RCDO picker");
    await userEvent.selectOptions(screen.getByLabelText(/which outcome does this support/i), "11");
    await userEvent.click(screen.getByRole("button", { name: /save commit/i }));

    expect(await screen.findByText(/network exploded/i)).toBeInTheDocument();
  });
});
