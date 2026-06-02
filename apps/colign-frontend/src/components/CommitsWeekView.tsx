import { useGetPlanByWeekQuery } from "@/api/plans";
import type { WeeklyCommitDto } from "@/api/types";
import { Badge, Card, Spinner } from "@/components/ui";
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

/**
 * The commits the user planned for the selected week (their plan for that
 * Monday). Commits are hard week-bound, so this reads the plan by week rather
 * than by creation date. No plan / no commits for the week → an empty state.
 */
export function CommitsWeekView({ week }: Props) {
  const { data: plan, isFetching } = useGetPlanByWeekQuery(week);

  if (isFetching && !plan) {
    return (
      <div className="py-12 flex justify-center" data-cy="commits-week-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  const commits = plan?.commits ?? [];

  if (commits.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center px-6 py-14">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            No commits this week
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
            Nothing was committed for the week of {formatWeekOf(week)}.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-cy="commits-week-view">
      <div className="flex items-center gap-2">
        {plan ? <PlanStatePill state={plan.state} /> : null}
        <span className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
          {commits.length} commit{commits.length === 1 ? "" : "s"}
        </span>
      </div>
      <Card>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {commits.map((c) => (
            <CommitItem key={c.id} commit={c} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CommitItem({ commit }: { commit: WeeklyCommitDto }) {
  return (
    <li className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
          {commit.title}
        </div>
        {commit.outcomeTitle ? (
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            → {commit.outcomeTitle}
          </div>
        ) : null}
      </div>
      {commit.chessTagCode ? (
        <Badge tone={chessTagTone(commit.chessTagCode)} size="xs">
          {POSTURE_LABEL[commit.chessTagCode] ?? commit.chessTagCode}
        </Badge>
      ) : null}
      {commit.plannedEffortHours != null ? (
        <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-400 shrink-0">
          {commit.plannedEffortHours}h
        </span>
      ) : null}
    </li>
  );
}
