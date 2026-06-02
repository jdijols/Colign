import { useGetCurrentPlanQuery } from "@/api/plans";
import type { PlanDto, WeeklyCommitDto } from "@/api/types";
import { AlignmentBar } from "@/components/AlignmentBar";
import { StrategyAnchor } from "@/components/StrategyAnchor";
import { Spinner } from "@/components/ui";
import { commitStatusLabel, commitStatusTone, priorityLabel, priorityTone } from "@/lib/tokens";
import { cn } from "@/lib/cn";

/**
 * Map a {@link StatusTone} to the dot color for the §11 priority indicator —
 * the "smallest, quietest signal" primitive (7px colored dot + label, no
 * border, no background). Kept local to this surface for now; promote to a
 * shared primitive when a second surface needs the same treatment.
 */
const PRIORITY_DOT_TONE: Record<string, string> = {
  danger: "bg-rose-600 dark:bg-rose-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  info: "bg-neutral-400 dark:bg-neutral-500",
  success: "bg-emerald-600 dark:bg-emerald-400",
  neutral: "bg-neutral-400 dark:bg-neutral-500",
};

/**
 * Map a status {@link StatusTone} to the §11 pill dot prefix color. Pills
 * keep their hairline border + surface bg; only the leading 6px dot carries
 * the semantic tone, so the chrome stays calm and the dot does the work.
 */
const STATUS_DOT_TONE: Record<string, string> = {
  danger: "bg-rose-600 dark:bg-rose-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  info: "bg-neutral-900 dark:bg-neutral-50",
  success: "bg-emerald-600 dark:bg-emerald-400",
  neutral: "bg-neutral-400 dark:bg-neutral-500",
};

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
  // tier is intentionally not applied to the numeral / inline label here.
  // DESIGN.md §4: "semantic color is used only where it carries meaning,
  // never decoratively." The AlignmentBar already encodes the tier; the
  // hero numeral stays in --text (neutral) so the surface reads calm.
  // alignmentTier(alignmentPct) — kept off; if a future variant needs the
  // tier color on the numeral, flip to text-rose-700 / amber-700 / emerald-700
  // by routing through the helper again.
  // Consumer-friendly mapping per DESIGN.md §10: "High" (not "P0/P1").
  const labelCopy =
    totalCommits === 0
      ? "No commits yet this week."
      : `${linkedToHighPriority} of ${totalCommits} commits on high-priority outcomes`;

  return (
    <div data-cy="dashboard-alignment">
      {/* Numeral → bar rhythm: tight (--s-sm, 12px) so the readout reads as
          one unit. Numeral and "%" both in --text so the bar is the sole
          carrier of tier color (§4). */}
      <div className="flex items-baseline gap-3">
        <span
          className="text-6xl sm:text-7xl font-light tracking-tight tabular-nums leading-none text-neutral-900 dark:text-neutral-50"
          aria-hidden="true"
        >
          {alignmentPct}
        </span>
        <span
          className="text-2xl font-light text-neutral-900 dark:text-neutral-50 tabular-nums leading-none"
          aria-hidden="true"
        >
          %
        </span>
        <span className="sr-only">High-priority alignment {alignmentPct} percent.</span>
      </div>
      <div className="mt-3">
        <AlignmentBar alignment={alignment} size="md" />
      </div>
      {/* Bar → label rhythm: --s-md (16px) so the consumer-friendly line
          reads as its own beat under the instrument. */}
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{labelCopy}</p>
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
  const priorityToneKey = commit.outcomePriority ? priorityTone(commit.outcomePriority) : null;
  const statusToneKey = commitStatusTone(commit.status);
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
          {commit.title}
        </div>
        {commit.outcomeTitle ? (
          // DESIGN.md §9 issue: a heavy "→" arrow competed with the title.
          // Switch to an em-dash — quieter glyph that still signals the
          // outcome relationship without pulling eye-weight off the commit.
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
              {"— "}
            </span>
            {commit.outcomeTitle}
          </div>
        ) : null}
      </div>
      {commit.outcomePriority && priorityToneKey ? (
        // §11 priority indicator: 7px colored dot + consumer-friendly label
        // ("High / Medium / Low" per §10). No border, no background — the
        // smallest, quietest signal. Replaces the P0/P2 Badge pill that
        // violated both the §10 wording rule and the §11 visual spec.
        <span
          className="inline-flex items-center gap-1.5 text-xs tabular-nums whitespace-nowrap"
          data-cy="quickview-priority"
        >
          <span
            aria-hidden
            className={cn(
              "inline-block h-[7px] w-[7px] rounded-full",
              PRIORITY_DOT_TONE[priorityToneKey] ?? PRIORITY_DOT_TONE.neutral,
            )}
          />
          <span className="text-neutral-700 dark:text-neutral-300">
            {priorityLabel(commit.outcomePriority)}
          </span>
        </span>
      ) : null}
      {/* §11 status pill: hairline border + surface bg + leading 6px colored
          dot. The dot — not the pill fill — carries the semantic tone, so the
          chrome stays calm and the signal is precise. */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-0.5 text-[11px] font-medium leading-none text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
        <span
          aria-hidden
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            STATUS_DOT_TONE[statusToneKey] ?? STATUS_DOT_TONE.neutral,
          )}
        />
        {commitStatusLabel(commit.status)}
      </span>
    </li>
  );
}
