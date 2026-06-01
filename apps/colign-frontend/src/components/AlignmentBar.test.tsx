import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AlignmentBar } from "./AlignmentBar";

function fixture(alignmentPct: number, total = 8, linked = 6) {
  return { totalCommits: total, linkedToHighPriority: linked, alignmentPct };
}

describe("AlignmentBar", () => {
  afterEach(() => cleanup());

  it("uses the high-priority alignment a11y label on the progressbar", () => {
    render(<AlignmentBar alignment={fixture(75)} />);
    // Three "High-priority alignment …" labelled elements exist (wrapper,
    // progressbar, sr-only). The progressbar is the load-bearing one for
    // screen readers; assert it carries the new copy.
    expect(
      screen.getByRole("progressbar", { name: /high-priority alignment 75%/i }),
    ).toBeInTheDocument();
  });

  it("renders the live progressbar with aria-valuenow matching the pct", () => {
    render(<AlignmentBar alignment={fixture(42)} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps the rendered width when pct is out of range", () => {
    const { rerender } = render(<AlignmentBar alignment={fixture(-10)} />);
    expect(screen.getByRole("progressbar").getAttribute("style") ?? "").toContain("width: 0%");

    rerender(<AlignmentBar alignment={fixture(150)} />);
    expect(screen.getByRole("progressbar").getAttribute("style") ?? "").toContain("width: 100%");
  });

  it("falls back to an 'unavailable' sr-only message when there are no commits", () => {
    render(
      <AlignmentBar alignment={{ totalCommits: 0, linkedToHighPriority: 0, alignmentPct: 0 }} />,
    );
    expect(
      screen.getByText(/high-priority alignment unavailable: no commits yet/i),
    ).toBeInTheDocument();
  });

  it("announces a full sentence in the live region when commits exist", () => {
    render(<AlignmentBar alignment={fixture(50, 4, 2)} />);
    expect(
      screen.getByText(
        /high-priority alignment 50 percent\. 2 of 4 commits on p0 or p1 outcomes\./i,
      ),
    ).toBeInTheDocument();
  });
});
