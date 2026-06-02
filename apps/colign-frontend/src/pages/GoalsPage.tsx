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
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-12 sm:space-y-16">
      <WeekNavigator week={week} onWeekChange={setWeek} eyebrow="Goals" />
      <StrategyWeekView week={week} editable={week === thisWeek} />
    </div>
  );
}
