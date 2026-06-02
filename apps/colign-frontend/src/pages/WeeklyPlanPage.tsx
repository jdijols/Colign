import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiInformationCircle, HiPlus } from "react-icons/hi";
import {
  useGetCurrentPlanQuery,
  useLockPlanMutation,
  useStartReconciliationMutation,
} from "@/api/plans";
import { useDeleteCommitMutation } from "@/api/commits";
import { useListOutcomesQuery } from "@/api/outcomes";
import { Alert, Button, Spinner } from "@/components/ui";
import { CommitForm } from "@/components/CommitForm";
import { CommitRow } from "@/components/CommitRow";
import { PlanStatePill } from "@/components/PlanStatePill";
import { StrategyAnchor } from "@/components/StrategyAnchor";
import type { WeeklyCommitDto, OutcomeRefDto } from "@/api/types";
import { TIMELINE_TABS_ENABLED } from "@/lib/featureFlags";

export function WeeklyPlanPage() {
  const { data, isLoading, error } = useGetCurrentPlanQuery();
  const [lockPlan, { isLoading: locking }] = useLockPlanMutation();
  const [startRecon, { isLoading: startingRecon }] = useStartReconciliationMutation();
  const [deleteCommit] = useDeleteCommitMutation();
  // Drives the cascade scaffold + empty-state copy. Cached by RTK.
  const { data: outcomesPage } = useListOutcomesQuery({ size: 200 });
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();

  const outcomes = useMemo<OutcomeRefDto[]>(() => outcomesPage?.content ?? [], [outcomesPage]);
  const cascade = useMemo(
    () => buildCascade(outcomes, data?.commits ?? []),
    [outcomes, data?.commits],
  );

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
  const canSubmit = canEdit && data.commits.length > 0;

  function handleErr(e: unknown, fallback: string) {
    const msg =
      (e as { data?: { detail?: string } })?.data?.detail ??
      (e instanceof Error ? e.message : fallback);
    setActionError(msg);
  }

  async function submit() {
    setActionError(null);
    try {
      await lockPlan(data!.id).unwrap();
    } catch (e) {
      handleErr(e, "Submit failed");
    }
  }

  async function submitAndReconcile() {
    setActionError(null);
    try {
      const submitted = await lockPlan(data!.id).unwrap();
      await startRecon(submitted.id).unwrap();
      navigate("reconcile");
    } catch (e) {
      handleErr(e, "Submit & reconcile failed");
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

  // Empty-state copy still leans on a single Outcome when the team only has
  // one. Once the wizard expands the team's strategy, the cascade carries the
  // structural framing on its own.
  const featuredOutcomeTitle = outcomes.length === 1 ? outcomes[0]!.title : null;
  const isEmptyDraft = data.commits.length === 0 && !adding;

  // §9 "Week of {humanized date}" — never the ISO. No year unless the week
  // wraps a new year; that ambiguity is rare and one-layer-deep work.
  const weekOfLabel = formatWeekOf(data.weekStartDate);

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-12 sm:space-y-16">
      {/* When the timeline tabs are hidden (prod), the "Aiming for" anchor lives
          here on Plan, as it did before it moved to the Dashboard tab. */}
      {!TIMELINE_TABS_ENABLED ? <StrategyAnchor /> : null}

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400">
            My weekly plan
          </p>
          <h1
            className="mt-1 text-3xl sm:text-4xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50"
            data-cy="plan-heading"
          >
            {weekOfLabel}
            {canEdit ? null : (
              <span className="ml-3 align-middle text-sm font-normal text-neutral-500 dark:text-neutral-400">
                ·{" "}
                <span data-cy="plan-state-inline">
                  <PlanStatePill state={data.state} size="xs" />
                </span>
              </span>
            )}
          </h1>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span>Status</span>
            <span data-cy="plan-state">
              <PlanStatePill state={data.state} />
            </span>
          </div>
        ) : null}
      </header>

      {/* ============================================================
           THE CASCADE — DESIGN.md §9 signature pattern.
           Objective: 2px solid --text left rule, 18px padding-left.
           Outcome:   1px solid --hairline-strong left rule, 16px padding-left.
           No card boxing. Containment is the rule weights alone.
         ============================================================ */}
      {isEmptyDraft && canEdit ? (
        <EmptyDraftState
          featuredOutcomeTitle={featuredOutcomeTitle}
          onAdd={() => setAdding(true)}
        />
      ) : isEmptyDraft ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          This plan is empty and locked — nothing to reconcile this week.
        </p>
      ) : cascade.length > 0 ? (
        <section className="space-y-10" data-cy="commit-list">
          {cascade.map((obj) => (
            <article
              key={obj.key}
              className="border-l-2 border-neutral-900 pl-[18px] dark:border-neutral-100"
            >
              <h2 className="text-lg sm:text-xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
                {obj.title}
              </h2>
              <div className="mt-5 space-y-6">
                {obj.outcomes.map((oc) => (
                  <div
                    key={oc.key}
                    className="border-l border-neutral-300 pl-4 dark:border-neutral-700"
                  >
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {oc.title}
                    </h3>
                    <ul className="mt-2">
                      {oc.commits.map((c) => (
                        <CommitRow
                          key={c.id}
                          commit={c}
                          canEdit={canEdit}
                          onDelete={() => deleteCommit(c.id)}
                        />
                      ))}
                      {canEdit ? (
                        <li>
                          <button
                            type="button"
                            onClick={() => setAdding(true)}
                            data-cy="add-commit-outcome"
                            className="mt-1 inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-200 transition-colors"
                          >
                            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-dashed border-neutral-300 dark:border-neutral-700">
                              <HiPlus className="h-2.5 w-2.5" aria-hidden />
                            </span>
                            Add a commit to this outcome
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}

          {canEdit && !adding ? (
            <div className="pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAdding(true)}
                leftIcon={<HiPlus className="h-3.5 w-3.5" />}
                data-cy="add-commit"
              >
                Add commit
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {adding && (
        <CommitForm
          planId={data.id}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Submit footer — generous breathing room above so it doesn't sit on
          top of the cascade. Padlock icon removed per §10 ("Submit plan"
          replaces "Lock" — keep the verb, drop the metaphor). */}
      <footer className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
          {canEdit ? (
            <>
              When you’re done editing,{" "}
              <strong className="text-neutral-900 dark:text-neutral-100">submit the plan</strong>{" "}
              for the week — or skip ahead and reconcile in one step.
            </>
          ) : data.state === "LOCKED" ? (
            <>This week’s plan has been submitted. Reconcile when the week is done.</>
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
          {canSubmit ? (
            <>
              <Button onClick={submit} disabled={locking || startingRecon} data-cy="submit-plan">
                {locking && !startingRecon ? "Submitting…" : "Submit plan"}
              </Button>
              <Button
                variant="secondary"
                onClick={submitAndReconcile}
                disabled={locking || startingRecon}
                data-cy="submit-and-reconcile"
                rightIcon={<HiArrowRight className="h-3.5 w-3.5" />}
              >
                {startingRecon ? "Starting…" : "Submit & start reconciling"}
              </Button>
            </>
          ) : canEdit ? (
            <Button disabled>Submit plan</Button>
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
      </footer>

      {actionError && (
        <div data-cy="submit-error">
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

/* ============================================================
   Helpers — local to the page, no new files.
   ============================================================ */

interface CascadeOutcome {
  key: string;
  id: number;
  title: string;
  commits: WeeklyCommitDto[];
}

interface CascadeObjective {
  key: string;
  title: string;
  outcomes: CascadeOutcome[];
}

/**
 * Group commits into the Objective → Outcome → Commits cascade rendered by
 * §9. Walk outcomes (so the scaffold appears even when commits are sparse),
 * then attach commits per Outcome. Outcomes / Objectives with no commits in
 * THIS week are hidden — the page only shows what's currently planned.
 *
 * Falls back to the commit-side denormalized titles when the outcome list
 * hasn't loaded yet (post-mutation, before refetch).
 */
function buildCascade(outcomes: OutcomeRefDto[], commits: WeeklyCommitDto[]): CascadeObjective[] {
  if (commits.length === 0) return [];

  // outcomeId → title + objective title (from the outcomes list when present,
  // else from the commit row's denormalized fields).
  const outcomeInfo = new Map<number, { title: string; objectiveTitle: string; ord: number }>();
  outcomes.forEach((o, idx) => {
    outcomeInfo.set(o.id, {
      title: o.title,
      objectiveTitle: o.definingObjectiveTitle ?? "Untitled Objective",
      ord: idx,
    });
  });

  const objByTitle = new Map<string, CascadeObjective>();
  for (const c of commits) {
    const info = outcomeInfo.get(c.outcomeId);
    const outcomeTitle = info?.title ?? c.outcomeTitle ?? `Outcome #${c.outcomeId}`;
    const objectiveTitle = info?.objectiveTitle ?? c.definingObjectiveTitle ?? "Untitled Objective";

    let obj = objByTitle.get(objectiveTitle);
    if (!obj) {
      obj = { key: objectiveTitle, title: objectiveTitle, outcomes: [] };
      objByTitle.set(objectiveTitle, obj);
    }
    let oc = obj.outcomes.find((o) => o.id === c.outcomeId);
    if (!oc) {
      oc = {
        key: `${c.outcomeId}`,
        id: c.outcomeId,
        title: outcomeTitle,
        commits: [],
      };
      obj.outcomes.push(oc);
    }
    oc.commits.push(c);
  }

  // Stable ordering: commits by ordinal, outcomes by their list order when known.
  for (const obj of objByTitle.values()) {
    obj.outcomes.sort((a, b) => {
      const ai = outcomeInfo.get(a.id)?.ord ?? 1e9;
      const bi = outcomeInfo.get(b.id)?.ord ?? 1e9;
      return ai - bi;
    });
    for (const oc of obj.outcomes) {
      oc.commits.sort((a, b) => a.ordinal - b.ordinal);
    }
  }
  return Array.from(objByTitle.values());
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "2026-06-08" → "Week of June 8". Uses the ISO date directly to avoid TZ
 * drift (the backend already returns a calendar-local Monday). Defensive on
 * malformed input — falls through to the raw value rather than crashing the
 * page hero.
 */
function formatWeekOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return `Week of ${iso}`;
  const month = parseInt(m[2]!, 10) - 1;
  const day = parseInt(m[3]!, 10);
  if (month < 0 || month > 11 || day < 1 || day > 31) return `Week of ${iso}`;
  return `Week of ${MONTH_NAMES[month]} ${day}`;
}

function EmptyDraftState({
  featuredOutcomeTitle,
  onAdd,
}: {
  featuredOutcomeTitle: string | null;
  onAdd: () => void;
}) {
  return (
    <div className="py-10 flex flex-col items-start gap-5 max-w-xl">
      <p className="text-base text-neutral-700 dark:text-neutral-300">
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
        onClick={onAdd}
        leftIcon={<HiPlus className="h-4 w-4" />}
        data-cy="add-commit-hero"
      >
        Make your first commit
      </Button>
    </div>
  );
}
