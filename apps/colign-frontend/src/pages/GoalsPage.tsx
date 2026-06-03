import { useState } from "react";
import { WeekNavigator } from "@/components/WeekNavigator";
import { StrategyWeekView } from "@/components/StrategyWeekView";
import { currentWeek } from "@/lib/weeks";

/**
 * Goals — the week-navigable strategy view. The navigator picks a week; the
 * tree below shows the RC → DO → Outcome strategy as it stood that week (each
 * element appears from the week it was created until it's retired). Editing
 * (add/remove outcomes) is allowed only on the current week — you edit the
 * present and view the past. Defaults to the current week.
 */
export function GoalsPage() {
  const thisWeek = currentWeek();
  const [week, setWeek] = useState<string>(() => thisWeek);

  return (
    // Page rhythm uses --s-pillar (DESIGN.md §5: clamp(3rem, 1.5rem + 4vw, 6rem))
    // for the major section break between the Week-of header and the strategy
    // cascade. Responsive clamp opens up on wider screens — calm editorial, not a
    // settings list (DESIGN.md §5: "Generous over tight when in doubt").
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-[clamp(3rem,1.5rem+4vw,6rem)]">
      {/* No page-level eyebrow — the in-cascade "Aiming for" leads the surface (DESIGN.md §3, §10: consumer-friendly tone, no route-name labels). */}
      <WeekNavigator week={week} onWeekChange={setWeek} />
      <StrategyWeekView week={week} editable={week === thisWeek} />
    </div>
  );
}
