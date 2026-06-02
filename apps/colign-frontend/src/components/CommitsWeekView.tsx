import { useMemo } from "react";
import { useGetPlanByWeekQuery } from "@/api/plans";
import type { WeeklyCommitDto } from "@/api/types";
import { Badge, Spinner } from "@/components/ui";
import { PlanStatePill } from "@/components/PlanStatePill";
import { chessTagTone } from "@/lib/tokens";
import { formatWeekOf } from "@/lib/weeks";

interface Props {
  /** The selected week, identified by its Monday ("YYYY-MM-DD"). */
  week: string;
}

const POSTURE_LABEL: Record<string, string> = {
  OFFENSE: "Offense",
  DEFENSE: "Defense",
  MAINTENANCE: "Maintenance",
};

// DESIGN.md §10: priority is surfaced as High / Medium / Low (consumer-friendly
// tone), not P0 / P1 / P2. The internal data model still uses P0/P1/P2 — this
// is a UI translation only. Keeps the row's only adjacent signal calm and
// readable per §9 commit-row spec.
const PRIORITY_LABEL: Record<string, string> = {
  P0: "High",
  P1: "Medium",
  P2: "Low",
};

// DESIGN.md §4 priority dot colors: --destructive #c8334a, --warning #c4831d,
// --text-faint #a3a3a3. Inline hex while the foundation phase wires these as
// Tailwind tokens — keeps the brand color values authoritative regardless of
// when the tokens land in tailwind.config.js.
const PRIORITY_DOT: Record<string, string> = {
  P0: "#c8334a",
  P1: "#c4831d",
  P2: "#a3a3a3",
};

/** Group commits by their Outcome, preserving the order Outcomes first appear in. */
function groupByOutcome(commits: WeeklyCommitDto[]) {
  const map = new Map<
    number,
    { outcomeId: number; outcomeTitle: string | null; commits: WeeklyCommitDto[] }
  >();
  for (const c of commits) {
    const existing = map.get(c.outcomeId);
    if (existing) {
      existing.commits.push(c);
    } else {
      map.set(c.outcomeId, {
        outcomeId: c.outcomeId,
        outcomeTitle: c.outcomeTitle,
        commits: [c],
      });
    }
  }
  return Array.from(map.values());
}

/**
 * The commits the user planned for the selected week (their plan for that
 * Monday). Commits are hard week-bound, so this reads the plan by week rather
 * than by creation date. No plan / no commits for the week → an empty state.
 *
 * DESIGN.md §1 ("Every commit is structurally aligned to strategy") drives the
 * shape of this view: commits are grouped under their Outcome with the §9
 * 1px solid --hairline-strong left rule + 16px padding-left cascade so the
 * structural alignment is visible at a glance. The Strategy anchor (§11) sits
 * above the group so the page never loads without strategic context.
 */
export function CommitsWeekView({ week }: Props) {
  const { data: plan, isFetching } = useGetPlanByWeekQuery(week);

  // Memoize the commits array reference so the grouping doesn't run on every
  // render when the same plan is returned. plan?.commits is a fresh reference
  // each render via the RTK Query selector — pinning to plan keeps useMemo
  // stable across renders that don't actually change the data.
  const commits = useMemo<WeeklyCommitDto[]>(() => plan?.commits ?? [], [plan]);
  const grouped = useMemo(() => groupByOutcome(commits), [commits]);
  // First commit with a resolved rallyCryTitle drives the Strategy anchor —
  // a single plan can only sit under one Rally Cry at a time, so the first
  // hit is canonical.
  const rallyCryTitle = commits.find((c) => c.rallyCryTitle)?.rallyCryTitle ?? null;

  if (isFetching && !plan) {
    return (
      <div className="py-12 flex justify-center" data-cy="commits-week-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (commits.length === 0) {
    // DESIGN.md §8 + §12: empty state is left-aligned editorial cascade, NOT a
    // centered card. A bordered box around no content reads as a frame around
    // nothing — the inverse of the brand's calm posture. Inline at e0/e1 only.
    return (
      <div className="space-y-2" data-cy="commits-week-view-empty">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          No commits this week
        </h2>
        <p className="max-w-xl text-sm text-[#525252] dark:text-neutral-400">
          You haven&apos;t committed anything for the week of {formatWeekOf(week)} yet — open Goals
          to add one against an active Outcome.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-cy="commits-week-view">
      {/*
        DESIGN.md §11: Strategy anchor — hairline-bordered pill on --surface
        with "Aiming for · {Rally Cry}". The product's stated promise is that
        every commit is structurally aligned to strategy (§1) — the page must
        never render the list without that context visible.
      */}
      {rallyCryTitle ? (
        <div
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5"
          data-cy="strategy-anchor"
        >
          <span
            className="uppercase text-[#525252] dark:text-neutral-400"
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.12em",
              fontWeight: 500,
            }}
          >
            Aiming for
          </span>
          <span className="text-neutral-400 dark:text-neutral-600" aria-hidden>
            ·
          </span>
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {rallyCryTitle}
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-3 flex-wrap">
        {plan ? <PlanStatePill state={plan.state} /> : null}
        <span className="text-sm text-[#525252] dark:text-neutral-400">
          {commits.length} commit{commits.length === 1 ? "" : "s"} this week
        </span>
      </div>

      <ul className="space-y-6">
        {grouped.map((group) => (
          // DESIGN.md §9 outcome-rule: 1px solid --hairline-strong (#d4d4d4)
          // left rule, padding-left 16px. No surrounding card / nested boxes
          // (§12 anti-pattern). Containment comes from the rule weight alone.
          <li
            key={group.outcomeId}
            className="border-l border-[#d4d4d4] dark:border-neutral-700 pl-4 space-y-3"
            data-cy="commits-outcome-group"
          >
            <h3
              className="text-base font-medium text-neutral-900 dark:text-neutral-50"
              data-cy="commits-outcome-title"
            >
              {group.outcomeTitle ?? "Untitled outcome"}
            </h3>
            <ul className="space-y-2.5">
              {group.commits.map((c) => (
                <CommitItem key={c.id} commit={c} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommitItem({ commit }: { commit: WeeklyCommitDto }) {
  const isDone = commit.status === "DONE";
  const priorityLabel = commit.outcomePriority
    ? (PRIORITY_LABEL[commit.outcomePriority] ?? commit.outcomePriority)
    : null;
  const priorityDot = commit.outcomePriority
    ? (PRIORITY_DOT[commit.outcomePriority] ?? "#a3a3a3")
    : null;

  return (
    <li className="flex items-start gap-3" data-cy="commit-item">
      {/*
        DESIGN.md §9: 14px checkbox leads every commit row. Done rows render a
        filled --success (#1a9659) check; everything else is the hairline outline.
        This is presentational only — no toggle behavior wired here (a future
        cycle adds the mutation). Marked aria-hidden so screen-readers don't
        see a non-interactive checkbox.
      */}
      <span
        aria-hidden
        className="mt-[3px] inline-flex items-center justify-center shrink-0"
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          border: isDone ? "none" : "1px solid #d4d4d4",
          background: isDone ? "#1a9659" : "transparent",
        }}
      >
        {isDone ? (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
            <path
              d="M1.5 4.5 L3.5 6.5 L7.5 2.5"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={
              isDone
                ? "text-sm font-medium text-neutral-500 dark:text-neutral-500 line-through"
                : "text-sm font-medium text-neutral-900 dark:text-neutral-50"
            }
          >
            {commit.title}
          </span>
          {/*
            DESIGN.md §9 + §11: the .priority element — 7px colored dot + the
            user-facing High/Medium/Low label. The single adjacent signal that
            should appear on the default row. No border, no background.
          */}
          {priorityLabel && priorityDot ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-[#525252] dark:text-neutral-400 shrink-0"
              data-cy="commit-priority"
            >
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{ width: 7, height: 7, background: priorityDot }}
              />
              {priorityLabel}
            </span>
          ) : null}
        </div>
        {/*
          Posture + carried + hours are kept (no UI elements removed in a
          visual polish pass) but moved to a quieter secondary row in the
          consumer-friendly --text-soft color, smaller text, no borders. A
          future cycle can move them one layer deep on click per §15.
        */}
        {commit.chessTagCode ||
        commit.carriedFromCommitId != null ||
        commit.plannedEffortHours != null ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-[#737373] dark:text-neutral-500 flex-wrap">
            {commit.carriedFromCommitId != null ? (
              <Badge tone="neutral" size="xs">
                Carried
              </Badge>
            ) : null}
            {commit.chessTagCode ? (
              <Badge tone={chessTagTone(commit.chessTagCode)} size="xs">
                {POSTURE_LABEL[commit.chessTagCode] ?? commit.chessTagCode}
              </Badge>
            ) : null}
            {commit.plannedEffortHours != null ? (
              <span className="tabular-nums">{commit.plannedEffortHours}h</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
