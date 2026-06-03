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
  // "This week", "Aiming for"), NOT taxonomy labels echoing the nav. The
  // prior "My commits" was still echoing the sidebar nav label — replaced
  // with the more contextual "My weekly commits" so the eyebrow frames what
  // follows (a week-bound commit list) rather than naming the route.
  // DESIGN.md §5: --s-pillar (clamp 3rem → 6rem) between major sections —
  // header to primary content. The prior space-y-6 (24px) read as dense
  // admin spacing instead of the brand's editorial calm.
  // DESIGN.md §8: max-w-5xl is the design-system content width (the prior
  // max-w-4xl mx-auto orphaned the title in horizontal whitespace on wide
  // viewports, breaking the §9 left-rule cascade's stable left edge). We
  // keep mx-auto but at the system-spec width so the page reads as the same
  // editorial column across surfaces.
  return (
    <div
      className="p-6 sm:p-8 max-w-5xl mx-auto"
      style={{ rowGap: "clamp(3rem, 1.5rem + 4vw, 6rem)" }}
    >
      <div className="flex flex-col" style={{ gap: "clamp(3rem, 1.5rem + 4vw, 6rem)" }}>
        <WeekNavigator week={week} onWeekChange={setWeek} eyebrow="My weekly commits" />
        <CommitsWeekView week={week} />
      </div>
    </div>
  );
}
