import { useMemo, useState } from "react";
import { HiArrowRight, HiCheck } from "react-icons/hi";
import {
  useFinalizeReconciliationMutation,
  useGetCurrentPlanQuery,
  useStartReconciliationMutation,
} from "@/api/plans";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";
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
      <div className="p-12 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Alert tone="danger" title="Failed to load current plan." />
      </div>
    );
  }

  async function action(fn: () => Promise<unknown>, label: string) {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      const msg =
        (e as { data?: { detail?: string } })?.data?.detail ??
        (e instanceof Error ? e.message : `${label} failed`);
      setActionError(msg);
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Reconciliation</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Week of <span className="tabular-nums">{data.weekStartDate}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Status</span>
          <PlanStatePill state={data.state} />
        </div>
      </header>

      {data.state === "DRAFT" && (
        <Alert tone="info" title="This week is still in DRAFT.">
          Lock it on{" "}
          <a className="underline" href=".">
            My Week
          </a>{" "}
          first to start reconciliation.
        </Alert>
      )}

      {data.state === "LOCKED" && (
        <Card>
          <CardBody>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Plan locked on{" "}
              <span className="font-mono tabular-nums">
                {data.lockedAt ? new Date(data.lockedAt).toLocaleString() : "—"}
              </span>
              . Ready to walk through each commit and record what actually happened.
            </p>
          </CardBody>
          <CardFooter>
            <div />
            <Button
              onClick={() => action(() => startRecon(data.id).unwrap(), "Start reconciliation")}
              disabled={starting}
              data-cy="start-reconciliation"
              rightIcon={<HiArrowRight className="h-3.5 w-3.5" />}
            >
              {starting ? "Starting…" : "Start reconciliation"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {(data.state === "RECONCILING" ||
        data.state === "RECONCILED" ||
        data.state === "CARRIED_FORWARD") && (
        <Card>
          <CardHeader>
            <CardTitle>
              Planned vs. actual · {reconciledCount}/{data.commits.length} reconciled
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 px-4">
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
            <CardFooter>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {allReconciled
                  ? "All commits reconciled — submit to finalize. Missed commits will carry forward into next week."
                  : `${data.commits.length - reconciledCount} commit(s) still need a reconciliation.`}
              </p>
              <Button
                onClick={() =>
                  action(() => finalize(data.id).unwrap(), "Finalize reconciliation")
                }
                disabled={!allReconciled || finalizing}
                data-cy="finalize-reconciliation"
                leftIcon={<HiCheck className="h-3.5 w-3.5" />}
              >
                {finalizing ? "Submitting…" : "Submit reconciliation"}
              </Button>
            </CardFooter>
          )}

          {(data.state === "RECONCILED" || data.state === "CARRIED_FORWARD") && (
            <CardBody className="border-t border-neutral-200 dark:border-neutral-800">
              <Alert tone="success" title="Reconciliation complete.">
                Reconciliation complete for week of{" "}
                <span className="font-mono tabular-nums">{data.weekStartDate}</span>. Missed commits
                were carried forward to next week's plan.
              </Alert>
            </CardBody>
          )}
        </Card>
      )}

      {actionError && (
        <Alert tone="danger" title="Action failed">
          {actionError}
        </Alert>
      )}
    </div>
  );
}
