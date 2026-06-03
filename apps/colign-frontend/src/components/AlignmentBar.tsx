import type { AlignmentSummary } from "@/api/types";
import { alignmentTier } from "@/lib/tokens";
import { cn } from "@/lib/cn";

interface AlignmentBarProps {
  alignment: AlignmentSummary;
  size?: "sm" | "md";
  /**
   * Visual variant. Defaults to `"labeled"` — bar + inline "%" numeral +
   * "N/M high-priority" supporting count, the standalone treatment used on
   * sidebar and inline placements.
   *
   * `"bare"` strips both visible labels (keeping the SR-only live region) so
   * the primitive composes cleanly under a hero numeral that already carries
   * the percentage and below a separate supporting sentence. Used by the
   * Dashboard's composed alignment instrument (DESIGN.md §9) where having
   * the bar restate the same fact three times competes with the calm
   * "numeral → bar → one sentence" rhythm the spec calls for.
   */
  variant?: "labeled" | "bare";
}

/**
 * High-priority alignment visualization — bar + numeric % + linked-count.
 *
 * The metric is the share of weekly commits linked to a P0/P1 Outcome.
 * (Every commit is already linked to *some* outcome via NOT NULL FK, so
 * "linked at all" is uninformative — this surfaces the priority of that link.)
 *
 * Two complementary a11y channels for the live percentage:
 *  - The visible bar uses {@code role="progressbar"} + {@code aria-valuenow},
 *    which most modern screen readers announce on update.
 *  - A visually-hidden {@code aria-live="polite"} status sibling carries a
 *    full sentence ("High-priority alignment 75%, 6 of 8 commits on P0/P1
 *    outcomes") so SRs that ignore progressbar updates (or read it terse)
 *    still surface a meaningful change announcement after the user adds /
 *    removes / re-prioritises a commit.
 *
 * {@code aria-atomic="true"} on the live region ensures the whole new
 * sentence is read, not just the diff — important because alignmentPct,
 * linkedToHighPriority, and totalCommits often all change together.
 */
export function AlignmentBar({ alignment, size = "sm", variant = "labeled" }: AlignmentBarProps) {
  const { totalCommits, linkedToHighPriority, alignmentPct } = alignment;
  const tier = alignmentTier(alignmentPct);
  const barH = size === "md" ? "h-2" : "h-1.5";
  // Bare variant: stretch to the parent column width so the bar sits as a
  // continuous element under the hero numeral. Labeled variant keeps its
  // fixed widths so it composes inline with sidebar/badge contexts.
  const barW = variant === "bare" ? "w-full" : size === "md" ? "w-40" : "w-32";
  const isBare = variant === "bare";

  return (
    <div
      className={cn(isBare ? "block" : "flex items-center gap-3")}
      aria-label="High-priority alignment"
    >
      <div
        className={cn(
          "rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800",
          barH,
          barW,
        )}
      >
        <div
          className={cn("rounded-full", barH, tier.bar)}
          style={{ width: `${Math.max(0, Math.min(100, alignmentPct))}%` }}
          role="progressbar"
          aria-valuenow={alignmentPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`High-priority alignment ${alignmentPct}%`}
        />
      </div>
      {/* Visible inline labels — suppressed in the "bare" composed treatment
          (cycle-2 critic #4): when this primitive nests under a hero numeral
          that already carries the percentage, restating it here makes the
          surface read as three duplicate facts. */}
      {!isBare && (
        <>
          <span className={cn("text-xs font-medium tabular-nums", tier.label)} aria-hidden="true">
            {alignmentPct}%
          </span>
          {/* DESIGN.md §10: consumer-friendly tone — never "P0/P1" in
              user-facing UI. Restated as "N/M high-priority" so the inline
              label stays brief but never leaks the internal taxonomy. */}
          <span
            className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums"
            aria-hidden="true"
          >
            {linkedToHighPriority}/{totalCommits} high-priority
          </span>
        </>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {totalCommits === 0
          ? "High-priority alignment unavailable: no commits yet."
          : `High-priority alignment ${alignmentPct} percent. ${linkedToHighPriority} of ${totalCommits} commits on high-priority outcomes.`}
      </span>
    </div>
  );
}
