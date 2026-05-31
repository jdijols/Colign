import { useMemo, useState } from "react";
import { useGetTeamQuery } from "@/api/team";
import type { TeamMemberDto } from "@/api/types";
import { Card } from "@/components/ui";
import { TeamRollupTable } from "@/components/TeamRollupTable";
import { IcDrillDrawer } from "@/components/IcDrillDrawer";
import { cn } from "@/lib/cn";

type KpiTone = "neutral" | "ok" | "warn" | "alert";

const TONE_TEXT: Record<KpiTone, string> = {
  neutral: "text-neutral-900 dark:text-neutral-50",
  // emerald-600 (#059669) on white = 3.97:1 — fails AA normal. Bumped to 700 (#047857 → 5.45:1).
  ok: "text-emerald-700 dark:text-emerald-400",
  // amber-600 (#d97706) on white = 3.32:1 — fails AA normal. Bumped to 700 (#b45309 → 5.05:1).
  warn: "text-amber-700 dark:text-amber-400",
  // rose-600 (#e11d48) on white = 4.45:1 — borderline. Bumped to 700 (#be123c → 5.94:1).
  alert: "text-rose-700 dark:text-rose-400",
};

export function ManagerDashboardPage() {
  const [selected, setSelected] = useState<TeamMemberDto | null>(null);
  const { data } = useGetTeamQuery({ page: 0, size: 25, sort: "displayName,asc" });

  const stats = useMemo(() => {
    const rows = data?.content ?? [];
    const planned = rows.filter((r) => r.currentPlan).length;
    const lockedOrBeyond = rows.filter(
      (r) => r.currentPlan && r.currentPlan.state !== "DRAFT"
    ).length;
    const avgAlignment =
      planned === 0
        ? 0
        : Math.round(
            (rows.reduce(
              (acc, r) => acc + (r.currentPlan?.alignment.alignmentPct ?? 0),
              0
            ) /
              planned) *
              10
          ) / 10;
    return { total: rows.length, planned, lockedOrBeyond, avgAlignment };
  }, [data]);

  const alignmentTone: KpiTone =
    stats.avgAlignment >= 70 ? "ok" : stats.avgAlignment >= 40 ? "warn" : "alert";

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-wider text-neutral-600">Team roll-up</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          My team — this week
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Plans across your direct reports, with strategic alignment % per IC.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Direct reports" value={stats.total} />
        <KpiCard label="Plans started" value={`${stats.planned}/${stats.total}`} />
        <KpiCard
          label="Locked / reconciling"
          value={`${stats.lockedOrBeyond}/${stats.planned}`}
        />
        <KpiCard label="Avg alignment" value={`${stats.avgAlignment}%`} tone={alignmentTone} />
      </div>

      <TeamRollupTable onSelectMember={setSelected} />

      <IcDrillDrawer member={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: KpiTone;
}) {
  return (
    <Card>
      <div className="px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            TONE_TEXT[tone]
          )}
        >
          {value}
        </p>
      </div>
    </Card>
  );
}
