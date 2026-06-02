import { useGetCurrentPlanQuery } from "@/api/plans";
import type { PlanDto, WeeklyCommitDto } from "@/api/types";
import { AlignmentBar } from "@/components/AlignmentBar";
import { StrategyAnchor } from "@/components/StrategyAnchor";
import { Badge, Spinner } from "@/components/ui";
import { alignmentTier, commitStatusLabel, commitStatusTone, priorityTone } from "@/lib/tokens";
import { cn } from "@/lib/cn";

/**
 * Dashboard — the IC's "where you stand this week" surface (DESIGN.md §13).
 *
 * Composition, top → bottom:
 *  1. Eyebrow → display heading band ("Dashboard" → "Where you stand this
 *     week") per DESIGN.md §3 hierarchy pattern.
 *  2. Strategy anchor pill — the discrete "Aiming for · {Rally Cry}"
 *     breadcrumb that sits in the hero band (DESIGN.md §11).
 *  3. Compact alignment instrument — colign's signature data viz, sized
 *     "compact summary above the fold" (not manager-hero size) per §9.
 *  4. This week's quick view — read-only commit titles + priority + status
 *     for the current plan, per the §13 dashboard composition.
 *
 * Read-only by design — editing happens on Weekly Plan / Goals / Commits.
 * Separated into sections with --s-pillar (≈48–80px) vertical rhythm (§5).
 */
export function DashboardPage() {
  const { data: plan, isLoading } = useGetCurrentPlanQuery();

  return (
    <div className="px-6 sm:px-8 py-10 sm:py-14 max-w-5xl mx-auto">
      {/* Hero band: eyebrow → display heading → strategy anchor pill. The
          anchor sits within --s-xl of the heading (§5) — it's part of the
          hero, not its own section. */}
      <header className="space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            Dashboard
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
            data-cy="dashboard-heading"
          >
            Where you stand this week
          </h1>
        </div>
        <StrategyAnchor />
      </header>

      {/* Alignment instrument — compact summary above the fold (§9 assigns
          this to Dashboard). Separated from the hero by --s-pillar. */}
      <section className="mt-16 sm:mt-20" aria-labelledby="alignment-eyebrow">
        <AlignmentInstrument plan={plan} isLoading={isLoading} />
      </section>

      {/* This week's quick view — read-only commit list at a glance.
          Separated from the alignment block by --s-pillar (§5). */}
      <section className="mt-16 sm:mt-20" aria-labelledby="thisweek-eyebrow">
        <ThisWeekQuickView plan={plan} isLoading={isLoading} />
      </section>
    </div>
  );
}

/**
 * Compact alignment instrument — large tabular-num readout + horizontal bar +
 * consumer-friendly supporting label. Per DESIGN.md §9 spec for Dashboard:
 * "compact summary above the fold" (not the manager-hero treatment).
 *
 * Uses the existing AlignmentBar primitive for the bar+ticks rendering, then
 * sits a Geist-thin tabular numeric readout above it so the percentage carries
 * display-tier weight on the surface.
 */
function AlignmentInstrument({ plan, isLoading }: { plan?: PlanDto; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <p
        id="alignment-eyebrow"
        className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
      >
        This week
      </p>
      {isLoading ? (
        <div className="py-6">
          <Spinner size="md" />
        </div>
      ) : plan ? (
        <AlignmentReadout alignment={plan.alignment} />
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Alignment shows up once you have a plan for the week.
        </p>
      )}
    </div>
  );
}

function AlignmentReadout({ alignment }: { alignment: PlanDto["alignment"] }) {
  const { alignmentPct, linkedToHighPriority, totalCommits } = alignment;
  const tier = alignmentTier(alignmentPct);
  // Consumer-friendly mapping per DESIGN.md §10: "High" (not "P0/P1").
  const labelCopy =
    totalCommits === 0
      ? "No commits yet this week."
      : `${linkedToHighPriority} of ${totalCommits} commits on high-priority outcomes`;

  return (
    <div className="space-y-4" data-cy="dashboard-alignment">
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "text-6xl sm:text-7xl font-light tracking-tight tabular-nums leading-none",
            tier.label,
          )}
          aria-hidden="true"
        >
          {alignmentPct}
        </span>
        <span
          className="text-2xl font-light text-neutral-400 dark:text-neutral-500 tabular-nums leading-none"
          aria-hidden="true"
        >
          %
        </span>
        <span className="sr-only">High-priority alignment {alignmentPct} percent.</span>
      </div>
      <AlignmentBar alignment={alignment} size="md" />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{labelCopy}</p>
    </div>
  );
}

/**
 * This week's quick view — read-only list of the current plan's commits with
 * title + priority indicator + status. Per DESIGN.md §13: "at-a-glance summary,
 * not an editor". No checkboxes, no add affordance, no destructive actions —
 * editing happens on the Weekly Plan / Commits surfaces.
 */
function ThisWeekQuickView({ plan, isLoading }: { plan?: PlanDto; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <p
        id="thisweek-eyebrow"
        className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
      >
        This week&rsquo;s commits
      </p>
      {isLoading ? (
        <div className="py-6">
          <Spinner size="md" />
        </div>
      ) : !plan ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You don&rsquo;t have a plan for this week yet.
        </p>
      ) : plan.commits.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No commits on this week&rsquo;s plan yet.
        </p>
      ) : (
        <ul
          className="divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800"
          data-cy="dashboard-thisweek"
        >
          {plan.commits.map((c) => (
            <QuickViewRow key={c.id} commit={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuickViewRow({ commit }: { commit: WeeklyCommitDto }) {
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
          {commit.title}
        </div>
        {commit.outcomeTitle ? (
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            → {commit.outcomeTitle}
          </div>
        ) : null}
      </div>
      {commit.outcomePriority ? (
        <Badge tone={priorityTone(commit.outcomePriority)} size="xs">
          {commit.outcomePriority}
        </Badge>
      ) : null}
      <Badge tone={commitStatusTone(commit.status)} size="xs">
        {commitStatusLabel(commit.status)}
      </Badge>
    </li>
  );
}
