/**
 * Week math for the timeline views (Goals now, Commits later).
 *
 * A "week" is identified by its Monday (ISO week start), stored as a
 * LocalDate-style "YYYY-MM-DD" string — the same shape the backend uses for
 * Plan.weekStartDate. All arithmetic runs in UTC so date-only values never
 * drift across DST or timezone offsets.
 *
 * Bounds match the database window: the first Monday of 2026 through the last
 * Monday of 2026.
 */

/** First selectable Monday — first Monday of 2026. */
export const FIRST_WEEK = "2026-01-05";
/** Last selectable Monday — last Monday of 2026. */
export const LAST_WEEK = "2026-12-28";

const MS_PER_DAY = 86_400_000;

/** Parse "YYYY-MM-DD" to a UTC-midnight Date. */
function parse(iso: string): Date {
  const [y, m, d] = iso.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

/** Format a UTC-midnight Date back to "YYYY-MM-DD". */
function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The Monday (ISO week start) of the week containing `date`. Uses the local
 * calendar day, then computes in UTC. Sunday belongs to the week that started
 * the previous Monday.
 */
export function mondayOf(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = utc.getUTCDay(); // 0=Sun .. 6=Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  utc.setUTCDate(utc.getUTCDate() + delta);
  return toIso(utc);
}

/** Add (or subtract) `n` weeks to a Monday ISO string, returning a Monday ISO. */
export function addWeeks(weekStart: string, n: number): string {
  return toIso(new Date(parse(weekStart).getTime() + n * 7 * MS_PER_DAY));
}

/** The Sunday that ends the given Monday's week ("YYYY-MM-DD"). */
export function weekEnd(weekStart: string): string {
  return toIso(new Date(parse(weekStart).getTime() + 6 * MS_PER_DAY));
}

/** Clamp a Monday ISO into [FIRST_WEEK, LAST_WEEK] (string compare is safe for ISO dates). */
export function clampWeek(weekStart: string): string {
  if (weekStart < FIRST_WEEK) return FIRST_WEEK;
  if (weekStart > LAST_WEEK) return LAST_WEEK;
  return weekStart;
}

/** "Jun 1" / "Dec 28" label (no leading zero) for a Monday ISO string. */
export function formatWeekOf(weekStart: string): string {
  const d = parse(weekStart);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${d.getUTCDate()}`;
}

/** The current week's Monday, clamped to the 2026 window. */
export function currentWeek(): string {
  return clampWeek(mondayOf(new Date()));
}

/** Whether the previous-week arrow should be enabled. */
export function canGoPrev(weekStart: string): boolean {
  return weekStart > FIRST_WEEK;
}

/** Whether the next-week arrow should be enabled. */
export function canGoNext(weekStart: string): boolean {
  return weekStart < LAST_WEEK;
}
