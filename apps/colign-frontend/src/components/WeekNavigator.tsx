import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { addWeeks, canGoNext, canGoPrev, clampWeek, formatWeekOf } from "@/lib/weeks";

interface Props {
  /** The selected week, identified by its Monday ("YYYY-MM-DD"). */
  week: string;
  /** Called with the new Monday when the user steps a week (already clamped). */
  onWeekChange: (week: string) => void;
  /** Optional uppercase eyebrow above the title (e.g. "Goals", "Commits"), matching the other tabs' header pattern. */
  eyebrow?: string;
}

const ARROW =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 " +
  "hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-600";

/**
 * "Week of {Mon D}" with ← / → that step the selected week by exactly 7 days.
 * A week is its Monday; stepping is clamped to the 2026 window and the arrows
 * disable at the ends. Controlled — the parent owns the week state so the same
 * navigator drives Goals now and Commits later.
 *
 * The title uses the same eyebrow + text-3xl heading the other tabs use
 * (Plan, Team) so it reads identically across the app.
 */
export function WeekNavigator({ week, onWeekChange, eyebrow }: Props) {
  const step = (n: number) => onWeekChange(clampWeek(addWeeks(week, n)));

  return (
    // Display heading lives at the --t-display tier (DESIGN.md §3 + §9) using the
    // editorial Cabinet Grotesk face — Geist alone doesn't carry display sizes per
    // §3 ("Carries personality at display sizes that Geist alone doesn't").
    // Arrows sit inline immediately adjacent to the title per the §9 "week
    // navigation pattern" — no pill row, no week-of-year subscript.
    <header className="flex items-end gap-3 flex-wrap">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="mt-2 font-['Cabinet_Grotesk',_Geist,_system-ui,_sans-serif] text-[clamp(2rem,1.5rem+2vw,2.75rem)] leading-tight font-medium tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums"
          data-cy="week-label"
        >
          Week of {formatWeekOf(week)}
        </h1>
      </div>
      <div className="flex items-center gap-1 pb-1">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canGoPrev(week)}
          aria-label="Previous week"
          data-cy="week-prev"
          className={ARROW}
        >
          <HiChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canGoNext(week)}
          aria-label="Next week"
          data-cy="week-next"
          className={ARROW}
        >
          <HiChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </header>
  );
}
