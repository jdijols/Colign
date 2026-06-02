import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekNavigator } from "./WeekNavigator";
import { FIRST_WEEK, LAST_WEEK } from "@/lib/weeks";

describe("WeekNavigator", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the 'Week of {Mon D}' label for the selected week", () => {
    render(<WeekNavigator week="2026-06-01" onWeekChange={() => {}} />);
    expect(screen.getByText("Week of Jun 1")).toBeInTheDocument();
  });

  it("steps forward a week on the next arrow", async () => {
    const onWeekChange = vi.fn();
    const user = userEvent.setup();
    render(<WeekNavigator week="2026-06-01" onWeekChange={onWeekChange} />);
    await user.click(screen.getByRole("button", { name: /next week/i }));
    expect(onWeekChange).toHaveBeenCalledWith("2026-06-08");
  });

  it("steps back a week on the previous arrow", async () => {
    const onWeekChange = vi.fn();
    const user = userEvent.setup();
    render(<WeekNavigator week="2026-06-01" onWeekChange={onWeekChange} />);
    await user.click(screen.getByRole("button", { name: /previous week/i }));
    expect(onWeekChange).toHaveBeenCalledWith("2026-05-25");
  });

  it("disables the previous arrow at the first week of the window", () => {
    render(<WeekNavigator week={FIRST_WEEK} onWeekChange={() => {}} />);
    expect(screen.getByRole("button", { name: /previous week/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next week/i })).toBeEnabled();
  });

  it("disables the next arrow at the last week of the window", () => {
    render(<WeekNavigator week={LAST_WEEK} onWeekChange={() => {}} />);
    expect(screen.getByRole("button", { name: /next week/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous week/i })).toBeEnabled();
  });
});
