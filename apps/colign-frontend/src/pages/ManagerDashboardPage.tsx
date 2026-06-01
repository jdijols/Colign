import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineUserGroup, HiOutlineUserAdd } from "react-icons/hi";
import { useGetManagerTeamQuery } from "@/api/team";
import type { TeamMemberDto } from "@/api/types";
import { Button, Card } from "@/components/ui";
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
  const navigate = useNavigate();
  const [selected, setSelected] = useState<TeamMemberDto | null>(null);
  const { data, isLoading } = useGetManagerTeamQuery({
    page: 0,
    size: 25,
    sort: "displayName,asc",
  });

  const stats = useMemo(() => {
    const rows = data?.content ?? [];
    const planned = rows.filter((r) => r.currentPlan).length;
    const lockedOrBeyond = rows.filter(
      (r) => r.currentPlan && r.currentPlan.state !== "DRAFT",
    ).length;
    const avgAlignment =
      planned === 0
        ? 0
        : Math.round(
            (rows.reduce((acc, r) => acc + (r.currentPlan?.alignment.alignmentPct ?? 0), 0) /
              planned) *
              10,
          ) / 10;
    return { total: rows.length, planned, lockedOrBeyond, avgAlignment };
  }, [data]);

  const alignmentTone: KpiTone =
    stats.avgAlignment >= 70 ? "ok" : stats.avgAlignment >= 40 ? "warn" : "alert";

  // Once loaded, a zero-report team (a brand-new lead, or a manager whose
  // reports all left) gets a purposeful empty state instead of a wall of KPI
  // zeros + an empty table. Gated on !isLoading so the empty state never
  // flashes before the first response lands.
  const hasNoReports = !isLoading && (data?.totalElements ?? 0) === 0;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-wider text-neutral-600">Team roll-up</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          My team — this week
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Plans across your direct reports, with high-priority alignment % per IC.
        </p>
      </header>

      {hasNoReports ? (
        <TeamEmptyState onInvite={() => navigate("../settings", { relative: "path" })} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Direct reports" value={stats.total} />
            <KpiCard label="Plans started" value={`${stats.planned}/${stats.total}`} />
            <KpiCard
              label="Submitted / reconciling"
              value={`${stats.lockedOrBeyond}/${stats.planned}`}
            />
            <KpiCard
              label="Avg high-priority alignment"
              value={`${stats.avgAlignment}%`}
              tone={alignmentTone}
            />
          </div>

          <TeamRollupTable onSelectMember={setSelected} />
        </>
      )}

      <IcDrillDrawer member={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/**
 * Zero-reports empty state for the Team roll-up. Reached by a brand-new team
 * lead (a derived IC who can now see the Team tab) or any manager whose reports
 * have all been removed. Points at /settings, the in-app invite surface.
 */
function TeamEmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center px-6 py-14 sm:py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900">
          <HiOutlineUserGroup
            className="h-6 w-6 text-neutral-500 dark:text-neutral-400"
            aria-hidden
          />
        </div>
        <h2 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          No teammates yet
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
          Invite people to your team and their weekly plans and high-priority alignment will show up
          here.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={onInvite}
          leftIcon={<HiOutlineUserAdd className="h-4 w-4" aria-hidden />}
          className="mt-5"
          data-cy="team-empty-invite"
        >
          Invite teammates
        </Button>
      </div>
    </Card>
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
          className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", TONE_TEXT[tone])}
        >
          {value}
        </p>
      </div>
    </Card>
  );
}
