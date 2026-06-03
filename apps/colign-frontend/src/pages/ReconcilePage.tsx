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
import { StrategyAnchor } from "@/components/StrategyAnchor";
import { formatWeekOf } from "@/lib/weeks";

export function ReconcilePage() {
  const { data, isLoading, error } = useGetCurrentPlanQuery();
  const [startRecon, { isLoading: starting }] = useStartReconciliationMutation();
  const [finalize, { isLoading: finalizing }] = useFinalizeReconciliationMutation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reconciledCount = useMemo(
    () => (data?.commits ?? []).filter((c) => c.reconciliation).length,
    [data],
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
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-12 sm:space-y-16">
      {/* Locked product idiom (DESIGN.md §11): strategy anchor pinned at top
          so the WHY context stays present even in the empty state. Renders
          null when no outcomes exist (defensive). */}
      <StrategyAnchor />

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600">
            Reconciliation
          </p>
          {/* Hero: largest type on the page. Geist semibold + tight tracking
              at text-4xl/5xl approximates the --t-display token until Cabinet
              Grotesk lands in the shared foundation. tabular-nums keeps the
              date width stable across weeks. */}
          <h1 className="mt-1 text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
            Week of {formatWeekOf(data.weekStartDate)}
          </h1>
          {/* Single supporting line under the display — anchors the --s-pillar
              gap below the hero (DESIGN.md §5 vertical rhythm). */}
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-[58ch]">
            The week-end walk-through. Each commit gets a quick record of what actually shipped, and
            anything that slipped carries forward.
          </p>
        </div>
        {data.state !== "DRAFT" && <PlanStatePill state={data.state} />}
      </header>

      {data.state === "DRAFT" && (
        <section className="space-y-6">
          <p className="text-[15px] leading-[1.7] text-neutral-700 dark:text-neutral-300 max-w-[58ch]">
            Reconciliation opens once you submit this week’s plan.{" "}
            <a
              className="text-neutral-600 hover:text-neutral-900 underline decoration-neutral-300 hover:decoration-neutral-700 underline-offset-4 transition-colors"
              href="."
            >
              Open My weekly plan
              <span aria-hidden> →</span>
            </a>
          </p>

          {/* Quiet e2 preview: hairlined surface with ghost reconcile rows so
              the empty state shows structure rather than just words
              (DESIGN.md §6 depth from layered surfaces + hairline borders).
              Reads as "calmly waiting", not "broken / half-loaded". */}
          <Card aria-hidden className="max-w-2xl">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
                Preview
              </p>
            </div>
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <li className="px-5 py-4 flex items-center gap-3 text-neutral-400 dark:text-neutral-600">
                <span
                  className="h-4 w-4 rounded-sm border border-dashed border-neutral-300 dark:border-neutral-700 shrink-0"
                  aria-hidden
                />
                <span className="flex-1 truncate text-sm">Commit title</span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  Shipped
                </span>
              </li>
              <li className="px-5 py-4 flex items-center gap-3 text-neutral-400 dark:text-neutral-600">
                <span
                  className="h-4 w-4 rounded-sm border border-dashed border-neutral-300 dark:border-neutral-700 shrink-0"
                  aria-hidden
                />
                <span className="flex-1 truncate text-sm">Commit title</span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  Carried forward
                </span>
              </li>
            </ul>
          </Card>
        </section>
      )}

      {data.state === "LOCKED" && (
        <Card>
          <CardBody>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Plan submitted on{" "}
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
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {allReconciled
                  ? "All commits reconciled — submit to finalize. Missed commits will carry forward into next week."
                  : `${data.commits.length - reconciledCount} commit(s) still need a reconciliation.`}
              </p>
              <Button
                onClick={() => action(() => finalize(data.id).unwrap(), "Finalize reconciliation")}
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
                <span className="tabular-nums">{formatWeekOf(data.weekStartDate)}</span>. Missed
                commits were carried forward to next week’s plan.
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
