import { afterEach, describe, expect, it } from "vitest";
import { clearWizardState, readWizardState, writeWizardState } from "./strategyWizard";

describe("strategyWizard resume state", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns empty state for a null team or before anything is written", () => {
    expect(readWizardState(null)).toEqual({});
    expect(readWizardState(42)).toEqual({});
  });

  it("merges patches rather than overwriting (Rally Cry then Objective)", () => {
    writeWizardState(42, { rallyCryId: 7 });
    writeWizardState(42, { definingObjectiveId: 9 });
    expect(readWizardState(42)).toEqual({ rallyCryId: 7, definingObjectiveId: 9 });
  });

  it("scopes state per team", () => {
    writeWizardState(1, { rallyCryId: 100 });
    writeWizardState(2, { rallyCryId: 200 });
    expect(readWizardState(1)).toEqual({ rallyCryId: 100 });
    expect(readWizardState(2)).toEqual({ rallyCryId: 200 });
  });

  it("clears state on completion", () => {
    writeWizardState(42, { rallyCryId: 7, definingObjectiveId: 9 });
    clearWizardState(42);
    expect(readWizardState(42)).toEqual({});
  });

  it("survives a fresh read (simulating browser close / re-open)", () => {
    writeWizardState(42, { rallyCryId: 7 });
    // No in-memory state carried over — a brand-new read still sees it.
    expect(readWizardState(42)).toEqual({ rallyCryId: 7 });
  });
});
