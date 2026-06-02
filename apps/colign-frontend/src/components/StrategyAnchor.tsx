import { useMemo } from "react";
import { HiChevronRight } from "react-icons/hi";
import { useListOutcomesQuery } from "@/api/outcomes";
import type { OutcomeRefDto } from "@/api/types";
import { Badge } from "@/components/ui";
import { priorityTone } from "@/lib/tokens";

/**
 * "Aiming for" strategy breadcrumb — a discrete pill primitive (DESIGN.md §11)
 * pinned at the top of strategy-aware surfaces. Reinforces the alignment story:
 * every weekly commit lives downstream of one strategic chain (Rally Cry →
 * Defining Objective → Outcome). Renders the full chain when the team's
 * strategy is small (1 RC, 1 DO, 1 Outcome) and compacts to a summary once it
 * grows.
 *
 * Rendered as an inline-flex pill — not a full-width card — so it reads as a
 * discrete anchor on the surface rather than a banner. Surface background +
 * hairline border + rounded-full per DESIGN.md §11 (depth from hairlines, not
 * elevation; §6).
 *
 * Renders nothing when no outcomes exist (pre-strategy-setup state — the
 * OnboardingGate routes the user to the wizard before this surface should
 * ever render with empty data, but stay defensive).
 */
export function StrategyAnchor() {
  const { data: page, isLoading } = useListOutcomesQuery({ size: 200 });
  const outcomes = useMemo<OutcomeRefDto[]>(() => page?.content ?? [], [page]);
  const shape = useMemo(() => deriveShape(outcomes), [outcomes]);

  if (isLoading || shape == null) return null;

  return (
    <div
      className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-4 pr-5 py-2 text-sm max-w-full"
      data-cy="strategy-anchor"
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400 shrink-0">
        Aiming for
      </span>
      {shape.kind === "full" ? (
        <FullChain rallyCry={shape.rallyCry} objective={shape.objective} outcome={shape.outcome} />
      ) : (
        <SummaryChain
          rallyCry={shape.rallyCry}
          objectiveCount={shape.objectiveCount}
          outcomeCount={shape.outcomeCount}
        />
      )}
    </div>
  );
}

function FullChain({
  rallyCry,
  objective,
  outcome,
}: {
  rallyCry: string;
  objective: string;
  outcome: { title: string; priorityTier: string };
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-900 dark:text-neutral-50">
      <span className="font-medium" data-cy="strategy-rc">
        {rallyCry}
      </span>
      <HiChevronRight
        className="h-3 w-3 text-neutral-400 dark:text-neutral-500 shrink-0"
        aria-hidden
      />
      <span className="font-medium" data-cy="strategy-do">
        {objective}
      </span>
      <HiChevronRight
        className="h-3 w-3 text-neutral-400 dark:text-neutral-500 shrink-0"
        aria-hidden
      />
      <Badge tone={priorityTone(outcome.priorityTier)} size="xs">
        {outcome.priorityTier}
      </Badge>
      <span className="font-medium" data-cy="strategy-outcome">
        {outcome.title}
      </span>
    </div>
  );
}

function SummaryChain({
  rallyCry,
  objectiveCount,
  outcomeCount,
}: {
  rallyCry: string;
  objectiveCount: number;
  outcomeCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-900 dark:text-neutral-50">
      <span className="font-medium" data-cy="strategy-rc">
        {rallyCry}
      </span>
      <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
        ·
      </span>
      <span className="text-neutral-600 dark:text-neutral-400">
        {objectiveCount} {objectiveCount === 1 ? "Objective" : "Objectives"} · {outcomeCount}{" "}
        {outcomeCount === 1 ? "Outcome" : "Outcomes"}
      </span>
    </div>
  );
}

type Shape =
  | {
      kind: "full";
      rallyCry: string;
      objective: string;
      outcome: { title: string; priorityTier: string };
    }
  | {
      kind: "summary";
      rallyCry: string;
      objectiveCount: number;
      outcomeCount: number;
    }
  | null;

/**
 * Derive the strategy chain from a flat list of outcomes. Each outcome carries
 * its parent DO title and grandparent RC title (denormalized in OutcomeRefDto)
 * so we can rebuild the tree without a separate query.
 *
 * Returns `null` when there are zero outcomes (defensive — caller should hide).
 * Returns `"full"` shape for a single RC + DO + Outcome (the post-wizard
 * happy path). Returns `"summary"` once the team has multiple DOs or Outcomes,
 * since rendering a wide tree inline doesn't fit a slim anchor strip.
 */
function deriveShape(outcomes: OutcomeRefDto[]): Shape {
  if (outcomes.length === 0) return null;

  // Group by RC title (defensive: handle the rare case of multiple RCs by
  // picking the first; the product surface restricts teams to one RC).
  const rcTitle = outcomes[0]?.rallyCryTitle ?? "Untitled Rally Cry";
  const doTitles = new Set<string>();
  for (const o of outcomes) {
    if (o.definingObjectiveTitle) doTitles.add(o.definingObjectiveTitle);
  }

  if (outcomes.length === 1 && doTitles.size === 1) {
    const only = outcomes[0]!;
    return {
      kind: "full",
      rallyCry: rcTitle,
      objective: only.definingObjectiveTitle ?? "Untitled Objective",
      outcome: { title: only.title, priorityTier: only.priorityTier },
    };
  }

  return {
    kind: "summary",
    rallyCry: rcTitle,
    objectiveCount: doTitles.size,
    outcomeCount: outcomes.length,
  };
}
