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

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <WeekNavigator week={week} onWeekChange={setWeek} eyebrow="Commits" />
      <CommitsWeekView week={week} />
    </div>
  );
}
