import { useState } from "react";
import { WeekNavigator } from "@/components/WeekNavigator";
import { CommitsWeekView } from "@/components/CommitsWeekView";
import { currentWeek } from "@/lib/weeks";

/**
 * Commits — the week-navigable execution view. The navigator picks a week; the
 * list below shows the commits the user planned for that week (their plan for
 * that Monday). Defaults to the current week, clamped to the 2026 window.
 */
export function CommitsPage() {
  const [week, setWeek] = useState<string>(() => currentWeek());

  // DESIGN.md §3 + §10: eyebrows are contextual prose ("My weekly plan",
  // "This week", "Manager dashboard"), NOT taxonomy labels echoing the nav.
  // Sentence-cased, consumer-friendly tone replaces the prior "COMMITS" label.
  // DESIGN.md §5: --s-pillar (clamp 3rem → 6rem) between major sections —
  // header to primary content. The prior space-y-6 (24px) read as dense
  // admin spacing instead of the brand's editorial calm.
  return (
    <div
      className="p-6 sm:p-8 max-w-4xl mx-auto"
      style={{ rowGap: "clamp(3rem, 1.5rem + 4vw, 6rem)" }}
    >
      <div className="flex flex-col" style={{ gap: "clamp(3rem, 1.5rem + 4vw, 6rem)" }}>
        <WeekNavigator week={week} onWeekChange={setWeek} eyebrow="My commits" />
        <CommitsWeekView week={week} />
      </div>
    </div>
  );
}
