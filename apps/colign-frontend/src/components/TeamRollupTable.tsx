import { useState } from "react";
import { HiArrowSmRight, HiArrowSmUp, HiArrowSmDown } from "react-icons/hi";
import { useGetManagerTeamQuery } from "@/api/team";
import type { PlanState, TeamMemberDto, WeeklyCommitDto } from "@/api/types";
import { PlanStatePill } from "@/components/PlanStatePill";
import {
  Badge,
  Button,
  Pagination,
  Spinner,
  TableScroller,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { alignmentTier, type AlignmentTier } from "@/lib/tokens";
import { cn } from "@/lib/cn";

/**
 * Per-row tier for the alignment bar/label. Wraps the global `alignmentTier`
 * helper so the destructive (rose) tier only fires when there is a real signal
 * of misalignment — i.e. the manager has Submitted / Reconciling / Reconciled
 * their plan with <40% on high-priority outcomes. A brand-new Draft with 0%
 * is "no signal yet", not a failure state; rendering it in rose conflates
 * "manager hasn't done the work yet" with "manager has aligned 0 of N
 * commits". This swaps that case for a muted, no-tone treatment so the
 * per-row bar reads neutral until there's something to evaluate. The hero
 * numeral on ManagerDashboardPage handles the team-level equivalent via its
 * `hasAnyPlan` / `total > 0` branches; this keeps the row-level surface in
 * lockstep editorially.
 */
const NEUTRAL_TIER: AlignmentTier = {
  tone: "neutral",
  bar: "bg-neutral-300 dark:bg-neutral-700",
  label: "text-neutral-500 dark:text-neutral-400",
};

function rowAlignmentTier(state: PlanState | undefined, pct: number): AlignmentTier {
  if (state === "DRAFT" && pct === 0) return NEUTRAL_TIER;
  return alignmentTier(pct);
}

/**
 * Sum of (actual − planned) effort hours across the commits that were
 * reconciled. Returns null when no commit has a reconciliation row, so the
 * column can render "—" instead of a misleading 0.
 */
function deltaHours(commits: WeeklyCommitDto[] | undefined): number | null {
  let any = false;
  let total = 0;
  (commits ?? []).forEach((c) => {
    const actual = c.reconciliation?.actualEffortHours;
    if (actual == null) return;
    any = true;
    const planned = c.plannedEffortHours ?? 0;
    total += actual - planned;
  });
  return any ? Math.round(total * 10) / 10 : null;
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-neutral-400">—</span>;
  const sign = delta > 0 ? "+" : "";
  const tone =
    delta > 0
      ? "text-rose-700 dark:text-rose-300"
      : delta < 0
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-neutral-500 dark:text-neutral-400";
  return (
    <span className={cn("tabular-nums font-medium", tone)}>
      {sign}
      {delta.toFixed(1)}h
    </span>
  );
}

/*
 * PostureChips removed from the default rollup view per DESIGN.md §12, which
 * bans chess-posture codes (O / D / M) in the default surface — they go one
 * layer deep on click. IcDrillDrawer already renders the chess tag per
 * commit in the drill-down panel, so the data remains reachable.
 *
 * Also removed: the soft-tinted Badge palette that those chips wore. §4
 * disallows decorative semantic colour; categorical encoding of posture has
 * no semantic mapping in the token table, so monochrome is the answer.
 */

type SortKey = "displayName" | "weekStartDate";
type SortDir = "asc" | "desc";

interface Props {
  onSelectMember: (m: TeamMemberDto) => void;
}

export function TeamRollupTable({ onSelectMember }: Props) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortKey>("displayName");
  const [dir, setDir] = useState<SortDir>("asc");
  const perPage = 25;

  const { data, isFetching } = useGetManagerTeamQuery(
    { page, size: perPage, sort: `${sort},${dir}` },
    { refetchOnMountOrArgChange: false },
  );

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k ? null : dir === "asc" ? (
      <HiArrowSmUp className="inline ml-1 h-3 w-3" aria-hidden />
    ) : (
      <HiArrowSmDown className="inline ml-1 h-3 w-3" aria-hidden />
    );

  const totalPages = data ? Math.max(1, data.totalPages) : 1;
  const from = data && data.totalElements > 0 ? page * perPage + 1 : 0;
  const to = data ? Math.min((page + 1) * perPage, data.totalElements) : 0;

  // DESIGN.md §12 polish — don't ship a column that is always "—". The
  // "vs. last week" column has no value until at least one row has been
  // reconciled. Suppressing the column entirely (header + cell) avoids the
  // dead-grid-weight feel and the visual padding-with-nothing it created on
  // a brand-new team. The mobile card already handles this naturally — the
  // DeltaCell renders "—" inside the meta line, which we keep hidden below
  // for the same reason.
  const hasAnyDelta = (data?.content ?? []).some((m) => deltaHours(m.currentPlan?.commits) != null);

  return (
    <div className="space-y-3 team-rollup-container" style={{ containerType: "inline-size" }}>
      {/* Sort chip row — visible only in card mode (container < 640px) via
          responsive.css. DESIGN.md §11 reserves the solid-black pill for the
          Primary CTA; the active sort indicator here is a quieter
          ghost-segmented control — hairline border in both states, with the
          active state filling the surface tint instead of inverting to
          high-contrast black. */}
      <div className="team-rollup-card-view-controls">
        <button
          type="button"
          onClick={() => toggleSort("displayName")}
          aria-pressed={sort === "displayName"}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-medium border min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
            sort === "displayName"
              ? "border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50"
              : "border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900",
          )}
        >
          Name {sort === "displayName" ? (dir === "asc" ? "↑" : "↓") : ""}
        </button>
        <button
          type="button"
          onClick={() => toggleSort("weekStartDate")}
          aria-pressed={sort === "weekStartDate"}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-medium border min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
            sort === "weekStartDate"
              ? "border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50"
              : "border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900",
          )}
        >
          Week {sort === "weekStartDate" ? (dir === "asc" ? "↑" : "↓") : ""}
        </button>
      </div>

      {/* Table view — visible at container ≥ 640px */}
      <div className="team-rollup-table-view">
        <TableScroller>
          <Table>
            <THead>
              <tr>
                <TH
                  aria-sort={
                    sort === "displayName" ? (dir === "asc" ? "ascending" : "descending") : "none"
                  }
                  className="p-0"
                >
                  {/* Activator is a real <button> so keyboard users get native
                    Enter/Space activation and focus rings. The TH keeps
                    aria-sort for table semantics. */}
                  <button
                    type="button"
                    onClick={() => toggleSort("displayName")}
                    className="w-full px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
                    aria-label={`Sort by direct report, currently ${
                      sort === "displayName"
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "unsorted"
                    }`}
                  >
                    Direct report <SortIcon k="displayName" />
                  </button>
                </TH>
                <TH>Week of</TH>
                <TH>Status</TH>
                <TH>High-priority alignment</TH>
                {hasAnyDelta ? <TH className="hidden md:table-cell">vs. last week</TH> : null}
                <TH>Commits</TH>
                {/* DESIGN.md §11 — desktop rows are already clickable; the
                    quiet right-edge chevron is the only click cue we need.
                    Drops the redundant ghost "Review" button per critic
                    feedback so each row carries one affordance, not two. */}
                <TH className="w-8 text-right">
                  <span className="sr-only">Open</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {isFetching && !data ? (
                <TR hover={false}>
                  <TD colSpan={hasAnyDelta ? 7 : 6} className="py-8 text-center text-neutral-600">
                    <Spinner size="sm" /> Loading team…
                  </TD>
                </TR>
              ) : (data?.content ?? []).length === 0 ? (
                <TR hover={false}>
                  <TD
                    colSpan={hasAnyDelta ? 7 : 6}
                    className="py-8 text-center text-sm text-neutral-600"
                  >
                    No direct reports to show.
                  </TD>
                </TR>
              ) : (
                data?.content.map((m) => {
                  const plan = m.currentPlan;
                  const tier = rowAlignmentTier(plan?.state, plan?.alignment.alignmentPct ?? 0);
                  return (
                    <TR
                      key={m.userId}
                      onClick={() => onSelectMember(m)}
                      className="cursor-pointer"
                      data-cy="team-row"
                      data-clickable="true"
                    >
                      <TD className="whitespace-nowrap">
                        {/* DESIGN.md §5 — comfortable, not compact. Avatar
                            bumped from 7x7 / 10px initials to 9x9 / 11px so
                            the circle reads as a person rather than a
                            pictogram. Gap kept at 2.5 (10px) so the cluster
                            still reads as a single identity unit. */}
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                            {initials(m.displayName)}
                          </div>
                          <div className="leading-tight">
                            <div className="font-medium text-sm text-neutral-900 dark:text-neutral-50">
                              {m.displayName}
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
                        {plan?.weekStartDate ?? <span className="text-neutral-400">—</span>}
                      </TD>
                      <TD>
                        {plan ? (
                          <PlanStatePill state={plan.state} size="xs" />
                        ) : (
                          <Badge tone="neutral" size="xs">
                            No plan
                          </Badge>
                        )}
                      </TD>
                      <TD className="w-52">
                        {plan ? (
                          <div className="flex items-center gap-2">
                            {/* DESIGN.md §9 alignment instrument: thin ticks
                                at the 40% (warning) and 70% (success)
                                thresholds so a manager can read the red /
                                amber / green zones at a glance, not just
                                infer from the fill color. */}
                            <div className="relative h-1.5 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden alignment-track">
                              <div
                                className={cn("h-1.5 rounded-full", tier.bar)}
                                style={{
                                  width: `${Math.max(0, Math.min(100, plan.alignment.alignmentPct))}%`,
                                }}
                                role="progressbar"
                                aria-valuenow={plan.alignment.alignmentPct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${m.displayName} high-priority alignment ${plan.alignment.alignmentPct}%`}
                              />
                              <span
                                aria-hidden
                                className="absolute top-0 h-1.5 w-px bg-neutral-400/70 dark:bg-neutral-500/60"
                                style={{ left: "40%" }}
                              />
                              <span
                                aria-hidden
                                className="absolute top-0 h-1.5 w-px bg-neutral-400/70 dark:bg-neutral-500/60"
                                style={{ left: "70%" }}
                              />
                            </div>
                            <span className={cn("text-xs font-medium tabular-nums", tier.label)}>
                              {plan.alignment.alignmentPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </TD>
                      {hasAnyDelta ? (
                        <TD className="hidden md:table-cell" data-cy="team-row-delta">
                          <DeltaCell delta={deltaHours(plan?.commits)} />
                        </TD>
                      ) : null}
                      <TD className="tabular-nums text-sm">
                        {plan ? plan.commits.length : <span className="text-neutral-400">—</span>}
                      </TD>
                      <TD className="text-right">
                        {/* Quiet chevron-only affordance — the entire row is
                            already clickable (cursor-pointer + onClick), so
                            the secondary ghost button was duplicating the
                            click target and competing with the row's data
                            for visual weight. The chevron sits at low
                            contrast and brightens on row hover via the
                            parent's TR hover state. */}
                        <HiArrowSmRight
                          className="ml-auto h-4 w-4 text-neutral-400 dark:text-neutral-500"
                          aria-hidden
                        />
                        <span className="sr-only">Open {m.displayName}&apos;s week</span>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </TableScroller>
      </div>

      {/* Card view — visible at container < 640px */}
      <div className="team-rollup-card-view">
        {isFetching && !data ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            <Spinner size="sm" /> Loading team…
          </div>
        ) : (data?.content ?? []).length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            No direct reports to show.
          </div>
        ) : (
          data?.content.map((m) => (
            <TeamRollupCard key={m.userId} member={m} onSelect={onSelectMember} />
          ))
        )}
      </div>

      {/* DESIGN.md §10 — consumer-friendly tone. Pagination + "Showing X of Y"
          is enterprise-table furniture; surface it only when the dataset is
          actually paginated. For ≤ perPage rows show nothing (the table
          itself communicates "this is everything"). */}
      {data && data.totalElements > perPage ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            Showing <span className="font-medium tabular-nums">{from}</span>–
            <span className="font-medium tabular-nums">{to}</span> of{" "}
            <span className="font-medium tabular-nums">{data.totalElements}</span>
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}

function TeamRollupCard({
  member,
  onSelect,
}: {
  member: TeamMemberDto;
  onSelect: (m: TeamMemberDto) => void;
}) {
  const plan = member.currentPlan;
  const tier = rowAlignmentTier(plan?.state, plan?.alignment.alignmentPct ?? 0);
  return (
    <div
      role="button"
      tabIndex={0}
      data-clickable="true"
      onClick={() => onSelect(member)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(member);
        }
      }}
      className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
    >
      {/* Row 1 — identity. Avatar + name + email; no other competing content on
          this row so the eye lands on "who" first. DESIGN.md §5 — avatar at
          9x9 / 11px so the circle reads as a person, not a pictogram. */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
          {initials(member.displayName)}
        </div>
        <div className="leading-tight flex-1 min-w-0">
          <div className="text-fluid-base font-medium text-neutral-900 dark:text-neutral-50 truncate">
            {member.displayName}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">
            {member.email}
          </div>
        </div>
      </div>
      {/* Row 2 — the alignment instrument. Full-width bar with % label inline
          on the right, so the read is "who → how aligned" on a vertical axis
          instead of diagonal across a wrapped chip row. DESIGN.md §13 — this
          is a data-dense surface; lean on a strict grid, not flex-wrap. */}
      {plan ? (
        <div className="mt-3 flex items-center gap-3">
          {/* DESIGN.md §9 — same tick treatment as the desktop row so the
              red / amber / green zones are readable on touch surfaces too. */}
          <div className="relative h-1.5 flex-1 min-w-0 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden alignment-track">
            <div
              className={cn("h-1.5 rounded-full", tier.bar)}
              style={{
                width: `${Math.max(0, Math.min(100, plan.alignment.alignmentPct))}%`,
              }}
              role="progressbar"
              aria-valuenow={plan.alignment.alignmentPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${member.displayName} high-priority alignment ${plan.alignment.alignmentPct}%`}
            />
            <span
              aria-hidden
              className="absolute top-0 h-1.5 w-px bg-neutral-400/70 dark:bg-neutral-500/60"
              style={{ left: "40%" }}
            />
            <span
              aria-hidden
              className="absolute top-0 h-1.5 w-px bg-neutral-400/70 dark:bg-neutral-500/60"
              style={{ left: "70%" }}
            />
          </div>
          <span className={cn("text-xs font-medium tabular-nums shrink-0", tier.label)}>
            {plan.alignment.alignmentPct}%
          </span>
        </div>
      ) : null}
      {/* Row 3 — secondary chips. State, commit count, delta sit together as
          supporting metadata, with a fixed order so wrapping (if any) never
          re-prioritises them in the eye. */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {plan ? (
          <PlanStatePill state={plan.state} size="xs" />
        ) : (
          <Badge tone="neutral" size="xs">
            No plan
          </Badge>
        )}
        {plan ? (
          <span className="text-xs text-neutral-600 tabular-nums shrink-0">
            {plan.commits.length} commit{plan.commits.length === 1 ? "" : "s"}
          </span>
        ) : null}
        {plan ? (
          <span className="text-xs shrink-0">
            <DeltaCell delta={deltaHours(plan.commits)} />
          </span>
        ) : null}
      </div>
      <Button
        variant="secondary"
        size="lg"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(member);
        }}
        className="mt-3 w-full"
        leftIcon={<HiArrowSmRight className="h-4 w-4" />}
        aria-label={`Review ${member.displayName}'s week`}
      >
        Review
      </Button>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
