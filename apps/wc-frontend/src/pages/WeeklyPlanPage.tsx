import { Badge, Card, Spinner } from "flowbite-react";
import { useGetCurrentPlanQuery } from "@/api/plans";

/**
 * Slot 7 fills this in (add commit form, outcome picker, lock button,
 * commit list with chess-tag badges + alignment indicators).
 * Slot 5 just confirms RTK Query talks to the backend.
 */
export function WeeklyPlanPage() {
  const { data, isLoading, error } = useGetCurrentPlanQuery();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Spinner aria-label="Loading current plan" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-8">
        <p className="text-red-600">Failed to load current plan.</p>
        <pre className="text-xs text-gray-500">{JSON.stringify(error, null, 2)}</pre>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Week of {data.weekStartDate}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Alignment {data.alignment.alignmentPct}% · {data.alignment.linkedToHighPriority}/
            {data.alignment.totalCommits} commits on P0/P1 outcomes
          </p>
        </div>
        <Badge size="sm" color={data.state === "LOCKED" ? "info" : "gray"}>
          {data.state}
        </Badge>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Commits</h2>
        {data.commits.length === 0 ? (
          <p className="text-sm text-gray-500">
            No commits yet — the add-commit form lands in Slot 7.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.commits.map((c) => (
              <li key={c.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.title}</span>
                  <Badge size="xs">{c.status}</Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Outcome: {c.outcomeTitle ?? c.outcomeId} ({c.outcomePriority ?? "—"}) ·
                  Chess: {c.chessTagCode ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
