import { describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { PlanStatePill } from "./PlanStatePill";
import type { PlanState } from "@/api/types";

const STATES: { state: PlanState; label: string }[] = [
  { state: "DRAFT", label: /draft/i.source },
  { state: "LOCKED", label: /submitted/i.source },
  { state: "RECONCILING", label: /reconciling/i.source },
  { state: "RECONCILED", label: /reconciled/i.source },
  { state: "CARRIED_FORWARD", label: /carried forward/i.source },
];

describe("PlanStatePill", () => {
  afterEach(() => cleanup());

  it.each(STATES)("renders the human label for $state", ({ state, label }) => {
    render(<PlanStatePill state={state} />);
    expect(screen.getByText(new RegExp(label, "i"))).toBeInTheDocument();
  });

  it("renders a different dot tone per state", () => {
    // DESIGN.md §11 — every state shares the same hairline-pill chrome; only
    // the leading 6px dot's color differs. The dot is the first child of the
    // pill (an aria-hidden <span>).
    const { container: draftEl } = render(<PlanStatePill state="DRAFT" />);
    const draftDotClass = draftEl.firstElementChild?.firstElementChild?.className ?? "";
    cleanup();

    const { container: reconciledEl } = render(<PlanStatePill state="RECONCILED" />);
    const reconciledDotClass = reconciledEl.firstElementChild?.firstElementChild?.className ?? "";

    expect(draftDotClass).not.toEqual(reconciledDotClass);
  });
});
