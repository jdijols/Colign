import { useState } from "react";
import { Button, Card, Spinner, Alert, Tooltip } from "flowbite-react";
import { HiPlus, HiLockClosed, HiInformationCircle, HiArrowRight } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import {
  useGetCurrentPlanQuery,
  useLockPlanMutation,
  useStartReconciliationMutation,
} from "@/api/plans";
import { useDeleteCommitMutation } from "@/api/commits";
import { CommitForm } from "@/components/CommitForm";
import { CommitRow } from "@/components/CommitRow";
import { PlanStatePill } from "@/components/PlanStatePill";
import { AlignmentBar } from "@/components/AlignmentBar";

export function WeeklyPlanPage() {
  const { data, isLoading, error } = useGetCurrentPlanQuery();
  const [lockPlan, { isLoading: locking }] = useLockPlanMutation();
  const [startRecon, { isLoading: startingRecon }] = useStartReconciliationMutation();
  const [deleteCommit] = useDeleteCommitMutation();
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center" data-cy="plan-loading">
        <Spinner aria-label="Loading current plan" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="m-8">
        <Alert color="failure" icon={HiInformationCircle}>
          Failed to load current plan. Make sure the backend is running on :8080.
        </Alert>
        <pre className="text-xs text-gray-500 mt-3 max-h-40 overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
      </Card>
    );
  }

  const canEdit = data.state === "DRAFT";
  const canLock = canEdit && data.commits.length > 0;

  function handleErr(e: unknown, fallback: string) {
    const msg = (e as { data?: { detail?: string } })?.data?.detail
      ?? (e instanceof Error ? e.message : fallback);
    setActionError(msg);
  }

  async function lock() {
    setActionError(null);
    try {
      await lockPlan(data!.id).unwrap();
    } catch (e) {
      handleErr(e, "Lock failed");
    }
  }

  /**
   * Compound: lock the plan THEN immediately move into reconciliation.
   * Shortcut for demos / Friday-night flows that skip the "wait for the
   * week to end" hop. Frontend-sequential is intentional — if start-recon
   * fails after lock succeeded, the plan stays LOCKED (recoverable).
   */
  async function lockAndReconcile() {
    setActionError(null);
    try {
      const locked = await lockPlan(data!.id).unwrap();
      await startRecon(locked.id).unwrap();
      navigate("reconcile");
    } catch (e) {
      handleErr(e, "Lock & reconcile failed");
    }
  }

  async function startReconciliationOnly() {
    setActionError(null);
    try {
      await startRecon(data!.id).unwrap();
      navigate("reconcile");
    } catch (e) {
      handleErr(e, "Start reconciliation failed");
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            My weekly plan
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white" data-cy="plan-heading">
            Week of {data.weekStartDate}
          </h1>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status:</span>
            <span data-cy="plan-state"><PlanStatePill state={data.state} /></span>
          </div>
          <AlignmentBar alignment={data.alignment} />
        </div>
      </header>

      {/* Commits */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Commits ({data.commits.length})</h2>
          {canEdit && !adding && (
            <Button
              size="sm"
              onClick={() => setAdding(true)}
              data-cy="add-commit"
            >
              <HiPlus className="mr-1 h-4 w-4" /> Add commit
            </Button>
          )}
        </div>

        {data.commits.length === 0 && !adding && (
          <p className="text-sm text-gray-500 mt-2">
            No commits yet. Click <strong>Add commit</strong> to start your week —
            each commit must link to a strategic Outcome.
          </p>
        )}

        {data.commits.length > 0 && (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 -my-2" data-cy="commit-list">
            {data.commits.map((c) => (
              <CommitRow
                key={c.id}
                commit={c}
                canEdit={canEdit}
                onDelete={() => deleteCommit(c.id)}
              />
            ))}
          </ul>
        )}

        {adding && (
          <div className="mt-4">
            <CommitForm
              planId={data.id}
              onDone={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </Card>

      {/* Lock footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {canEdit ? (
            <>
              When you're done editing, <strong>lock the plan</strong> for the week —
              or skip ahead and reconcile in one step.
            </>
          ) : data.state === "LOCKED" ? (
            <>This week is locked. Reconcile when the week is done.</>
          ) : (
            <>This week has been reconciled. See it under <a href="reconcile">Reconcile</a>.</>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canLock ? (
            <>
              <Button color="blue" onClick={lock} disabled={locking || startingRecon} data-cy="lock-plan">
                <HiLockClosed className="mr-1 h-4 w-4" />
                {locking && !startingRecon ? "Locking…" : "Lock plan"}
              </Button>
              <Button
                color="light"
                onClick={lockAndReconcile}
                disabled={locking || startingRecon}
                data-cy="lock-and-reconcile"
              >
                {startingRecon ? "Starting…" : "Lock & start reconciling"}
                <HiArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : canEdit ? (
            <Tooltip content="Add at least one commit before locking.">
              <Button color="blue" disabled>
                <HiLockClosed className="mr-1 h-4 w-4" /> Lock plan
              </Button>
            </Tooltip>
          ) : data.state === "LOCKED" ? (
            <Button
              color="blue"
              onClick={startReconciliationOnly}
              disabled={startingRecon}
              data-cy="goto-reconcile"
            >
              {startingRecon ? "Starting…" : "Start reconciliation"}
              <HiArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {actionError && (
        <Alert color="failure" icon={HiInformationCircle}>
          {actionError}
        </Alert>
      )}
    </div>
  );
}
