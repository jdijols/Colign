import { StrategyAnchor } from "@/components/StrategyAnchor";

/**
 * Dashboard — the strategy overview surface. For now it hosts the "Aiming for"
 * anchor (Rally Cry → Defining Objective → Outcome), relocated here from the
 * weekly Plan page. More dashboard content gets built up here over time.
 */
export function DashboardPage() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <StrategyAnchor />
    </div>
  );
}
