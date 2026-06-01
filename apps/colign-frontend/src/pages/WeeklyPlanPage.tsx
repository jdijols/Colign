import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiInformationCircle, HiLockClosed, HiPlus } from "react-icons/hi";
import {
  useGetCurrentPlanQuery,
  useLockPlanMutation,
  useStartReconciliationMutation,
} from "@/api/plans";
import { useDeleteCommitMutation } from "@/api/commits";
import { useListOutcomesQuery } from "@/api/outcomes";
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Spinner } from "@/components/ui";
import { CommitForm } from "@/components/CommitForm";
import { CommitRow } from "@/components/CommitRow";
import { PlanStatePill } from "@/components/PlanStatePill";
import { AlignmentBar } from "@/components/AlignmentBar";
import { StrategyAnchor } from "@/components/StrategyAnchor";

export function WeeklyPlanPage() {
  const { data, isLoading, error } = useGetCurrentPlanQuery();
  const [lockPlan, { isLoading: locking }] = useLockPlanMutation();
  const [startRecon, { isLoading: startingRecon }] = useStartReconciliationMutation();
  const [deleteCommit] = useDeleteCommitMutation();
  // Cached by RTK; StrategyAnchor reads the same key, so only one HTTP call.
  const { data: outcomesPage } = useListOutcomesQuery({ size: 200 });
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

  // When the plan is brand-new (no commits) AND the team has exactly one
  // Outcome, surface that Outcome's title in the empty-state copy. Keeps the
  // continuity with the strategy wizard the user just completed.
  const outcomes = outcomesPage?.content ?? [];
  const featuredOutcomeTitle = outcomes.length === 1 ? outcomes[0]!.title : null;
  const isEmptyDraft = data.commits.length === 0 && !adding;

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <StrategyAnchor />

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
          {/* Top-right Add commit hides on empty plans — the hero CTA in the
              body takes over to draw the eye through to the first commit. */}
          {canEdit && !adding && data.commits.length > 0 && (
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

        {isEmptyDraft && canEdit ? (
          <CardBody>
            <div className="py-8 flex flex-col items-center text-center gap-5">
              <p className="text-base text-neutral-700 dark:text-neutral-300 max-w-md">
                {featuredOutcomeTitle ? (
                  <>
                    Pick a deliverable that moves{" "}
                    <strong className="text-neutral-900 dark:text-neutral-50">
                      “{featuredOutcomeTitle}”
                    </strong>{" "}
                    forward this week.
                  </>
                ) : (
                  <>Pick a deliverable that advances your strategic Outcomes this week.</>
                )}
              </p>
              <Button
                size="lg"
                onClick={() => setAdding(true)}
                leftIcon={<HiPlus className="h-4 w-4" />}
                data-cy="add-commit-hero"
              >
                Make your first commit
              </Button>
            </div>
          </CardBody>
        ) : isEmptyDraft ? (
          <CardBody>
            <p className="text-sm text-neutral-600">
              This plan is empty and locked — nothing to reconcile this week.
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
        <div data-cy="lock-error">
          <Alert tone="danger" title="Action failed">
            {actionError}
          </Alert>
        </div>
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
