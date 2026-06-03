import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiArrowRight,
  HiChevronLeft,
  HiChevronRight,
  HiInformationCircle,
  HiPlus,
} from "react-icons/hi";
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
import type { WeeklyCommitDto, OutcomeRefDto } from "@/api/types";

/* DESIGN.md §3 — Cabinet Grotesk display family, lazy-injected once per app
   load. The shared `<head>` is foundation-scope (out of bounds for this
   surface pass), so we self-host the stylesheet inject here. Idempotent: a
   sibling page mounting the same hook is a no-op. */
const CABINET_GROTESK_HREF =
  "https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@300,400,500,700,800&display=swap";
const CABINET_GROTESK_FAMILY =
  "'Cabinet Grotesk', 'Geist', 'Inter', system-ui, -apple-system, sans-serif";

function useCabinetGrotesk() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector('link[data-font="cabinet-grotesk"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CABINET_GROTESK_HREF;
    link.dataset.font = "cabinet-grotesk";
    document.head.appendChild(link);
  }, []);
}

export function WeeklyPlanPage() {
  useCabinetGrotesk();
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
  // DESIGN.md §9 editorial hero: "Aiming for" eyebrow → Rally Cry display
  // headline above the week-of header. Pulled from the denormalized RC title
  // on any outcome (all outcomes in a team share one RC).
  const rallyCryTitle = outcomes[0]?.rallyCryTitle ?? null;

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
      {/* DESIGN.md §9 editorial hero — "Aiming for" eyebrow → Rally Cry as
          the strategic anchor for the cascade below. Locked §9 pattern:
          renders unconditionally as the editorial opener of the page
          whenever an RC title is available, regardless of whether the
          timeline tabs flag is on. Cabinet Grotesk 500 carries the
          editorial personality §3 reserves for display copy. */}
      {rallyCryTitle ? (
        <section data-cy="aiming-for-hero" className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400">
            Aiming for
          </p>
          <p
            className="text-2xl sm:text-3xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50"
            style={{ fontFamily: CABINET_GROTESK_FAMILY }}
          >
            {rallyCryTitle}
          </p>
        </section>
      ) : null}

      <header className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400">
          My weekly plan
        </p>
        {/* DESIGN.md §9 inline week navigation — `← Week of … →` on one
            line. 36×36 hairline-bordered chevron buttons hugging the
            display heading. Prev/next are visually present so the §9
            pattern shows; live wiring lives one cycle deeper (no plan-
            by-week query is mounted on this surface yet — Commits tab
            already has the data hook). Disabled state is the honest
            visual until that wiring lands; this is a visual-polish pass
            per cycle scope. */}
        <div className="mt-1 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled
            aria-label="Previous week"
            title="Week navigation — coming soon. Use the Commits tab to browse past weeks."
            data-cy="week-nav-prev"
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-neutral-200 text-neutral-400 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-600 dark:hover:bg-neutral-900"
          >
            <HiChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h1
            className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50"
            style={{ fontFamily: CABINET_GROTESK_FAMILY }}
            data-cy="plan-heading"
          >
            {weekOfLabel}
          </h1>
          <button
            type="button"
            disabled
            aria-label="Next week"
            title="Week navigation — coming soon. Use the Commits tab to browse past weeks."
            data-cy="week-nav-next"
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-neutral-200 text-neutral-400 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-600 dark:hover:bg-neutral-900"
          >
            <HiChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {/* DESIGN.md §3 opening rhythm: eyebrow → display heading →
            optional supporting line. State pill is a quiet caption
            below the H1; the "Status" field-label was form-y per
            §10 — dropped so the pill stands alone (dot + label
            already says everything). */}
        <div data-cy="plan-state" className="text-xs text-neutral-600 dark:text-neutral-400">
          <PlanStatePill state={data.state} />
        </div>
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
          {/* DESIGN.md §9 locks the per-Outcome ghost "Add a commit to this
              outcome" affordance as the canonical add-commit pattern. The
              previously-rendered boxed secondary "Add commit" CTA here was
              a duplicate that broke the minimal-first stance — removed. */}
        </section>
      ) : null}

      {adding && (
        <CommitForm
          planId={data.id}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Submit footer — DESIGN.md §11 says ONE dominant CTA per surface.
          The previous dual-CTA rail ("Submit plan" + "Submit & start
          reconciling") had two near-equal buttons competing for the eye
          (§2 calm-restrained posture violation). Resolved: "Submit plan"
          is the single primary; "Submit & start reconciling" demotes to
          a ghost inline alternative tucked next to it on the same line.
          The orphan hairline divider above was not part of §6's depth
          system (e0–e3) — removed; generous top spacing carries the
          break visually instead. On larger sizes the primary uses size="lg"
          so the coarse-pointer 44px floor reads on touch (§11). */}
      <footer className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!canEdit ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
            {data.state === "LOCKED" ? (
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
        ) : (
          <span aria-hidden />
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {canSubmit ? (
            <>
              <Button
                size="lg"
                onClick={submit}
                disabled={locking || startingRecon}
                data-cy="submit-plan"
              >
                {locking && !startingRecon ? "Submitting…" : "Submit plan"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={submitAndReconcile}
                disabled={locking || startingRecon}
                data-cy="submit-and-reconcile"
              >
                {startingRecon ? "Starting…" : "Submit & start reconciling"}
              </Button>
            </>
          ) : canEdit ? (
            <Button size="lg" disabled>
              Submit plan
            </Button>
          ) : data.state === "LOCKED" ? (
            <Button
              size="lg"
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
