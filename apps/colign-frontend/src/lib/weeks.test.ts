import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_WEEK,
  LAST_WEEK,
  addWeeks,
  canGoNext,
  canGoPrev,
  clampWeek,
  currentWeek,
  formatWeekOf,
  mondayOf,
  weekEnd,
} from "./weeks";

describe("weeks", () => {
  afterEach(() => vi.useRealTimers());

  describe("mondayOf", () => {
    it("returns the same day when the date is already a Monday", () => {
      expect(mondayOf(new Date(2026, 5, 1))).toBe("2026-06-01"); // Mon Jun 1 2026
    });

    it("snaps a midweek day back to its Monday", () => {
      expect(mondayOf(new Date(2026, 5, 3))).toBe("2026-06-01"); // Wed → Mon
    });

    it("treats Sunday as belonging to the week that started the previous Monday", () => {
      expect(mondayOf(new Date(2026, 5, 7))).toBe("2026-06-01"); // Sun Jun 7 → Mon Jun 1
    });
  });

  describe("addWeeks", () => {
    it("steps forward and back by exactly 7 days", () => {
      expect(addWeeks("2026-06-01", 1)).toBe("2026-06-08");
      expect(addWeeks("2026-06-01", -1)).toBe("2026-05-25");
    });

    it("crosses month and year boundaries", () => {
      expect(addWeeks("2026-12-28", 1)).toBe("2027-01-04");
      expect(addWeeks("2026-01-05", -1)).toBe("2025-12-29");
    });
  });

  describe("weekEnd", () => {
    it("returns the Sunday that closes the week", () => {
      expect(weekEnd("2026-06-01")).toBe("2026-06-07");
      expect(weekEnd("2026-01-05")).toBe("2026-01-11");
      expect(weekEnd("2026-12-28")).toBe("2027-01-03");
    });
  });

  describe("clampWeek", () => {
    it("clamps below the window up to the first week", () => {
      expect(clampWeek("2025-12-29")).toBe(FIRST_WEEK);
    });
    it("clamps above the window down to the last week", () => {
      expect(clampWeek("2027-01-04")).toBe(LAST_WEEK);
    });
    it("leaves an in-window week untouched", () => {
      expect(clampWeek("2026-06-01")).toBe("2026-06-01");
    });
  });

  describe("formatWeekOf", () => {
    it("formats without a leading zero", () => {
      expect(formatWeekOf("2026-06-01")).toBe("Jun 1");
      expect(formatWeekOf("2026-01-05")).toBe("Jan 5");
      expect(formatWeekOf("2026-12-28")).toBe("Dec 28");
    });
  });

  describe("bounds helpers", () => {
    it("disables prev at the first week, enables it elsewhere", () => {
      expect(canGoPrev(FIRST_WEEK)).toBe(false);
      expect(canGoPrev("2026-06-01")).toBe(true);
    });
    it("disables next at the last week, enables it elsewhere", () => {
      expect(canGoNext(LAST_WEEK)).toBe(false);
      expect(canGoNext("2026-06-01")).toBe(true);
    });
  });

  describe("currentWeek", () => {
    it("returns this week's Monday when inside the window", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0)); // Wed Jun 3 2026
      expect(currentWeek()).toBe("2026-06-01");
    });

    it("clamps to the last week when the clock is past the window", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2027, 2, 1, 10, 0, 0)); // Mar 2027
      expect(currentWeek()).toBe(LAST_WEEK);
    });
  });
});
