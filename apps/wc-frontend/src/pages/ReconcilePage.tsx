import { useMemo, useState } from "react";
import { Alert, Button, Card, Spinner } from "flowbite-react";
import { HiCheck, HiInformationCircle, HiPlay } from "react-icons/hi";
import {
  useFinalizeReconciliationMutation,
  useGetCurrentPlanQuery,
  useStartReconciliationMutation,
} from "@/api/plans";
import { PlanStatePill } from "@/components/PlanStatePill";
import { ReconcileRow } from "@/components/ReconcileRow";

export function ReconcilePage() {
  const { data, isLoading, error } = useGetCurrentPlanQuery();
  const [startRecon, { isLoading: starting }] = useStartReconciliationMutation();
  const [finalize, { isLoading: finalizing }] = useFinalizeReconciliationMutation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reconciledCount = useMemo(
    () => (data?.commits ?? []).filter((c) => c.reconciliation).length,
    [data]
  );
  const allReconciled =
    !!data && data.commits.length > 0 && reconciledCount === data.commits.length;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Spinner aria-label="Loading plan for reconciliation" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="m-8">
        <Alert color="failure" icon={HiInformationCircle}>
          Failed to load current plan.
        </Alert>
      </Card>
    );
  }

  async function action(fn: () => Promise<unknown>, label: string) {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      const msg = (e as { data?: { detail?: string } })?.data?.detail
        ?? (e instanceof Error ? e.message : `${label} failed`);
      setActionError(msg);
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Reconciliation</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            Week of {data.weekStartDate}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Status:</span>
          <PlanStatePill state={data.state} />
        </div>
      </header>

      {data.state === "DRAFT" && (
        <Alert color="info" icon={HiInformationCircle}>
          This week is still in DRAFT. Lock it on <a href=".">My Week</a> first to start reconciliation.
        </Alert>
      )}

      {data.state === "LOCKED" && (
        <Card>
          <p className="text-gray-700 dark:text-gray-300">
            Plan locked on {data.lockedAt ? new Date(data.lockedAt).toLocaleString() : "Mon"}.
            Ready to walk through each commit and record what actually happened.
          </p>
          <div className="mt-3">
            <Button
              onClick={() => action(() => startRecon(data.id).unwrap(), "Start reconciliation")}
              disabled={starting}
              data-cy="start-reconciliation"
            >
              <HiPlay className="mr-1 h-4 w-4" />
              {starting ? "Starting…" : "Start reconciliation"}
            </Button>
          </div>
        </Card>
      )}

      {(data.state === "RECONCILING" || data.state === "RECONCILED" || data.state === "CARRIED_FORWARD") && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Planned vs. actual ({reconciledCount}/{data.commits.length} reconciled)
            </h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.commits.map((c) => (
              <ReconcileRow
                key={c.id}
                commit={c}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              />
            ))}
          </ul>

          {data.state === "RECONCILING" && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {allReconciled
                  ? "All commits reconciled — submit to finalize. Missed commits will carry forward into next week."
                  : `${data.commits.length - reconciledCount} commit(s) still need a reconciliation.`}
              </p>
              <Button
                color="success"
                disabled={!allReconciled || finalizing}
                onClick={() =>
                  action(() => finalize(data.id).unwrap(), "Finalize reconciliation")
                }
                data-cy="finalize-reconciliation"
              >
                <HiCheck className="mr-1 h-4 w-4" />
                {finalizing ? "Submitting…" : "Submit reconciliation"}
              </Button>
            </div>
          )}

          {(data.state === "RECONCILED" || data.state === "CARRIED_FORWARD") && (
            <Alert color="success" icon={HiCheck} className="mt-4">
              Reconciliation complete for week of {data.weekStartDate}. Missed commits
              were carried forward to next week's plan.
            </Alert>
          )}
        </Card>
      )}

      {actionError && (
        <Alert color="failure" icon={HiInformationCircle}>
          {actionError}
        </Alert>
      )}
    </div>
  );
}
