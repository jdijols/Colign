import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiInformationCircle, HiLockClosed, HiPlus } from "react-icons/hi";
import {
  useGetCurrentPlanQuery,
  useLockPlanMutation,
  useStartReconciliationMutation,
} from "@/api/plans";
import { useDeleteCommitMutation } from "@/api/commits";
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from "@/components/ui";
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
      <div className="p-12 flex items-center justify-center" data-cy="plan-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Alert tone="danger" title="Failed to load current plan">
          Make sure the backend is running on :8080.
          <pre className="mt-2 max-h-40 overflow-auto font-mono text-[10px]">
            {JSON.stringify(error, null, 2)}
          </pre>
        </Alert>
      </div>
    );
  }

  const canEdit = data.state === "DRAFT";
  const canLock = canEdit && data.commits.length > 0;

  function handleErr(e: unknown, fallback: string) {
    const msg =
      (e as { data?: { detail?: string } })?.data?.detail ??
      (e instanceof Error ? e.message : fallback);
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
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-600">My weekly plan</p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
            data-cy="plan-heading"
          >
            Week of <span className="tabular-nums">{data.weekStartDate}</span>
          </h1>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">Status</span>
            <span data-cy="plan-state">
              <PlanStatePill state={data.state} />
            </span>
          </div>
          <AlignmentBar alignment={data.alignment} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Commits · {data.commits.length}</CardTitle>
          {canEdit && !adding && (
            <Button
              size="sm"
              onClick={() => setAdding(true)}
              leftIcon={<HiPlus className="h-3.5 w-3.5" />}
              data-cy="add-commit"
            >
              Add commit
            </Button>
          )}
        </CardHeader>

        {data.commits.length === 0 && !adding ? (
          <CardBody>
            <p className="text-sm text-neutral-600">
              No commits yet. Click{" "}
              <strong className="text-neutral-700 dark:text-neutral-300">Add commit</strong> to
              start your week — each commit must link to a strategic Outcome.
            </p>
          </CardBody>
        ) : data.commits.length > 0 ? (
          <ul
            className="divide-y divide-neutral-200 dark:divide-neutral-800 px-4"
            data-cy="commit-list"
          >
            {data.commits.map((c) => (
              <CommitRow
                key={c.id}
                commit={c}
                canEdit={canEdit}
                onDelete={() => deleteCommit(c.id)}
              />
            ))}
          </ul>
        ) : null}
      </Card>

      {adding && (
        <CommitForm
          planId={data.id}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      <Card variant="muted">
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {canEdit ? (
              <>
                When you’re done editing,{" "}
                <strong className="text-neutral-900 dark:text-neutral-100">lock the plan</strong>{" "}
                for the week — or skip ahead and reconcile in one step.
              </>
            ) : data.state === "LOCKED" ? (
              <>This week is locked. Reconcile when the week is done.</>
            ) : (
              <>
                This week has been reconciled.{" "}
                <a className="underline" href="reconcile">
                  See it under Reconcile
                </a>
                .
              </>
            )}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {canLock ? (
              <>
                <Button
                  onClick={lock}
                  disabled={locking || startingRecon}
                  data-cy="lock-plan"
                  leftIcon={<HiLockClosed className="h-3.5 w-3.5" />}
                >
                  {locking && !startingRecon ? "Locking…" : "Lock plan"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={lockAndReconcile}
                  disabled={locking || startingRecon}
                  data-cy="lock-and-reconcile"
                  rightIcon={<HiArrowRight className="h-3.5 w-3.5" />}
                >
                  {startingRecon ? "Starting…" : "Lock & start reconciling"}
                </Button>
              </>
            ) : canEdit ? (
              <Button disabled leftIcon={<HiLockClosed className="h-3.5 w-3.5" />}>
                Lock plan
              </Button>
            ) : data.state === "LOCKED" ? (
              <Button
                onClick={startReconciliationOnly}
                disabled={startingRecon}
                data-cy="goto-reconcile"
                rightIcon={<HiArrowRight className="h-3.5 w-3.5" />}
              >
                {startingRecon ? "Starting…" : "Start reconciliation"}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {actionError && (
        <Alert tone="danger" title="Action failed">
          {actionError}
        </Alert>
      )}

      {data.commits.length === 0 && !adding && (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
          <HiInformationCircle className="h-3.5 w-3.5" aria-hidden />
          The brief calls this structural alignment — every commit links to a leaf Outcome.
        </div>
      )}
    </div>
  );
}
