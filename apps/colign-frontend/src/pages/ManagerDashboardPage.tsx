import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineUserGroup, HiOutlineUserAdd } from "react-icons/hi";
import { useGetManagerTeamQuery } from "@/api/team";
import type { TeamMemberDto } from "@/api/types";
import { Button, Card } from "@/components/ui";
import { TeamRollupTable } from "@/components/TeamRollupTable";
import { IcDrillDrawer } from "@/components/IcDrillDrawer";
import { alignmentTier } from "@/lib/tokens";
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

/**
 * Map the shared alignmentTier() result to the KPI tone the page uses for its
 * numeric stat. Single source of truth for the 0/40/70 thresholds — keeps the
 * KPI numeral, the hero instrument, and the per-row bar in lockstep so a
 * 50%-aligned manager never sees rose-red on the headline while the
 * row-level instrument shows amber. DESIGN.md §4 places 40–69% squarely in
 * warning, not destructive.
 */
function kpiToneForAlignment(pct: number): KpiTone {
  const tone = alignmentTier(pct).tone;
  if (tone === "success") return "ok";
  if (tone === "warning") return "warn";
  return "alert";
}

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

  const alignmentTone: KpiTone = kpiToneForAlignment(stats.avgAlignment);
  const heroTier = alignmentTier(stats.avgAlignment);
  // Team-wide rollup of the same numerator/denominator each IC's alignmentPct
  // is computed from — `linkedToHighPriority / totalCommits`. Surfaces the
  // supporting "N/M commits on high-priority outcomes" label DESIGN.md §9
  // mandates for the hero instrument.
  const heroCounts = useMemo(() => {
    const rows = data?.content ?? [];
    let aligned = 0;
    let total = 0;
    rows.forEach((r) => {
      const a = r.currentPlan?.alignment;
      if (!a) return;
      aligned += a.linkedToHighPriority ?? 0;
      total += a.totalCommits ?? 0;
    });
    return { aligned, total };
  }, [data]);

  // Once loaded, a zero-report team (a brand-new lead, or a manager whose
  // reports all left) gets a purposeful empty state instead of a wall of KPI
  // zeros + an empty table. Gated on !isLoading so the empty state never
  // flashes before the first response lands.
  const hasNoReports = !isLoading && (data?.totalElements ?? 0) === 0;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* DESIGN.md §3 eyebrow → display heading → supporting line rhythm.
          §5 calls for comfortable-not-compact vertical space: ~8px (mt-2)
          between eyebrow and headline (the eyebrow is a deliberate prelude,
          not a separate block), then ~12-16px (mt-3) between the headline
          and the subhead so the supporting line reads as a follow-on rather
          than crowding the display heading. */}
      <header>
        <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium">
          Manager dashboard
        </p>
        {/* DESIGN.md §3 — examples lead with a confident second line ("Aiming
            for / Rally Cry", "My weekly plan / Week of June 1"). The em-dash
            pause read as throat-clearing; the cleaner phrasing carries the
            same beat without the typographic stutter, and matches the
            cadence of the other surface headings. */}
        <h1 className="mt-2 text-fluid-3xl font-light tracking-tight text-neutral-900 dark:text-neutral-50">
          My team this week
        </h1>
        {/* DESIGN.md §10 — consumer-friendly tone, Notion-adjacent. "Per IC"
            is internal-data jargon; plain language ("how much of each week
            is aligned to high-priority outcomes") matches the editorial
            register the system is asking for. */}
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Plans across your direct reports, with how much of each week is aligned to high-priority
          outcomes.
        </p>
      </header>

      {hasNoReports ? (
        <div className="mt-8">
          <TeamEmptyState onInvite={() => navigate("../settings", { relative: "path" })} />
        </div>
      ) : (
        <>
          {/* Hero alignment instrument — DESIGN.md §9: instrument-panel sized,
              hero placement, large Geist Thin (300) numeral, horizontal bar
              with tick marks at 40% and 70%, supporting label below. The
              per-row table bars use the same tier function, so the row-level
              bars + the hero numeral stay in lockstep. */}
          <section aria-labelledby="hero-alignment-label" className="mt-8">
            <AlignmentHero
              pct={stats.avgAlignment}
              aligned={heroCounts.aligned}
              total={heroCounts.total}
              tier={heroTier}
              tone={alignmentTone}
              hasAnyPlan={stats.planned > 0}
            />
          </section>

          {/* Follow-on stats — quieter than the hero (no e2 hairline cards),
              so the alignment number stays the dominant element of the page.
              DESIGN.md §6 reserves the e2 hairline treatment for elements
              that need to register as elevated; counters don't. */}
          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <InlineStat label="Direct reports" value={stats.total} />
            <InlineStat label="Plans started" value={`${stats.planned}/${stats.total}`} />
            <InlineStat
              label="Submitted or reconciling"
              value={`${stats.lockedOrBeyond}/${stats.planned}`}
            />
          </dl>

          {/* Pillar break between hero region and data region. DESIGN.md §5
              calls for clamp(3rem, 1.5rem+4vw, 6rem) between major sections —
              the team table is a separate section from the hero. */}
          <section aria-labelledby="team-rollup-label" className="mt-[clamp(3rem,1.5rem+4vw,6rem)]">
            <h2
              id="team-rollup-label"
              className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium mb-3"
            >
              Direct reports
            </h2>
            <TeamRollupTable onSelectMember={setSelected} />
          </section>
        </>
      )}

      <IcDrillDrawer member={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/**
 * The hero alignment instrument that owns the top of the Manager dashboard.
 * DESIGN.md §9 is the spec — a large Geist Thin numeral on the left, a
 * horizontal bar 0–100% with tick marks at 40% and 70% (the threshold lines
 * the §4 color tiers ride on), and a supporting label "N/M commits on
 * high-priority outcomes" beneath. Fills with --success / --warning /
 * --destructive depending on the band the average sits in.
 *
 * Note: DESIGN.md asks for Cabinet Grotesk for the display heading and Geist
 * weight 300 (Thin) for the numeral. Cabinet Grotesk and Geist Thin (300)
 * are not yet wired into index.html — that's foundation-phase work. Until
 * then this falls back to Geist's lightest available weight (400) at
 * font-light + tracking-tight to hint at the editorial tone the locked
 * direction asks for.
 */
function AlignmentHero({
  pct,
  aligned,
  total,
  tier,
  tone,
  hasAnyPlan,
}: {
  pct: number;
  aligned: number;
  total: number;
  tier: ReturnType<typeof alignmentTier>;
  tone: KpiTone;
  hasAnyPlan: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 sm:p-8">
      <p
        id="hero-alignment-label"
        className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium"
      >
        High-priority alignment
      </p>
      <div className="mt-3 flex items-baseline gap-3">
        <span
          className={cn(
            "text-[clamp(3.75rem,2.5rem+5vw,6rem)] font-light leading-none tabular-nums tracking-tight",
            TONE_TEXT[tone],
          )}
          aria-hidden
        >
          {hasAnyPlan ? Math.round(pct) : "—"}
        </span>
        {hasAnyPlan ? (
          <span className="text-fluid-2xl font-light text-neutral-500 dark:text-neutral-400 leading-none">
            %
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {hasAnyPlan
          ? total > 0
            ? `${aligned} of ${total} commits on high-priority outcomes this week`
            : "No commits planned across the team yet this week"
          : "No plans started across the team yet this week"}
      </p>
      {/* Bar 0–100 with tick marks at 40 and 70 — the DESIGN.md §4 thresholds.
          The fill uses the same alignmentTier colour the per-row bars use. */}
      <div className="mt-5">
        <div
          className="relative h-2 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden"
          role="progressbar"
          aria-valuenow={hasAnyPlan ? Math.round(pct) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Team high-priority alignment ${Math.round(pct)} percent`}
        >
          <div
            className={cn(
              "h-2 rounded-full transition-[width] duration-[600ms] ease-out",
              tier.bar,
            )}
            style={{ width: `${hasAnyPlan ? clamped : 0}%` }}
          />
          {/* Tick at 40% — the warning threshold */}
          <span
            aria-hidden
            className="absolute top-0 h-2 w-px bg-neutral-300 dark:bg-neutral-700"
            style={{ left: "40%" }}
          />
          {/* Tick at 70% — the success threshold */}
          <span
            aria-hidden
            className="absolute top-0 h-2 w-px bg-neutral-300 dark:bg-neutral-700"
            style={{ left: "70%" }}
          />
        </div>
        <div className="relative mt-2 h-3 text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
          <span className="absolute left-0 -translate-x-0">0%</span>
          <span className="absolute -translate-x-1/2" style={{ left: "40%" }}>
            40%
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: "70%" }}>
            70%
          </span>
          <span className="absolute right-0">100%</span>
        </div>
      </div>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-neutral-950 px-4 py-3">
      <dt className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium">{label}</dt>
      <dd className="mt-1 text-xl font-medium tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50">
        {value}
      </dd>
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
