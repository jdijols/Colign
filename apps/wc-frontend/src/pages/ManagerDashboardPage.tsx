import { useMemo, useState } from "react";
import { Card } from "flowbite-react";
import { useGetTeamQuery } from "@/api/team";
import type { TeamMemberDto } from "@/api/types";
import { TeamRollupTable } from "@/components/TeamRollupTable";
import { IcDrillDrawer } from "@/components/IcDrillDrawer";

/**
 * Manager's team roll-up. Each row = one direct report + their most recent plan
 * summary. Click anywhere on a row to open the drill-over drawer (Flowbite
 * Drawer position="right") with that IC's full plan + reconciliation state.
 */
export function ManagerDashboardPage() {
  const [selected, setSelected] = useState<TeamMemberDto | null>(null);
  const { data } = useGetTeamQuery({ page: 0, size: 25, sort: "displayName,asc" });

  // Aggregate KPIs above the table — total team, % of plans locked-or-beyond,
  // average alignment %.
  const stats = useMemo(() => {
    const rows = data?.content ?? [];
    const planned = rows.filter((r) => r.currentPlan).length;
    const lockedOrBeyond = rows.filter(
      (r) => r.currentPlan && r.currentPlan.state !== "DRAFT"
    ).length;
    const avgAlignment = planned === 0
      ? 0
      : Math.round(
          (rows.reduce((acc, r) => acc + (r.currentPlan?.alignment.alignmentPct ?? 0), 0) /
            planned) * 10
        ) / 10;
    return { total: rows.length, planned, lockedOrBeyond, avgAlignment };
  }, [data]);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-gray-500">Team roll-up</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          My team — this week
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Plans across your direct reports, with strategic alignment % per IC.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Direct reports" value={stats.total} />
        <KpiCard
          label="Plans started"
          value={`${stats.planned}/${stats.total}`}
        />
        <KpiCard
          label="Locked / reconciling"
          value={`${stats.lockedOrBeyond}/${stats.planned}`}
        />
        <KpiCard
          label="Avg alignment"
          value={`${stats.avgAlignment}%`}
          tone={stats.avgAlignment >= 70 ? "ok" : stats.avgAlignment >= 40 ? "warn" : "alert"}
        />
      </div>

      <TeamRollupTable onSelectMember={setSelected} />

      <IcDrillDrawer member={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" | "alert" }) {
  const valueColor =
    tone === "ok" ? "text-green-600 dark:text-green-400"
    : tone === "warn" ? "text-amber-600 dark:text-amber-400"
    : tone === "alert" ? "text-red-600 dark:text-red-400"
    : "text-gray-900 dark:text-white";
  return (
    <Card className="!p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </Card>
  );
}
