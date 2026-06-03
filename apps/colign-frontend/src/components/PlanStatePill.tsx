import type { PlanState } from "@/api/types";
import { planStateLabel } from "@/lib/tokens";
import { cn } from "@/lib/cn";

interface PlanStatePillProps {
  state: PlanState;
  size?: "xs" | "sm";
}

/**
 * DESIGN.md §11 — state pill spec:
 *   - inline-flex, 1px hairline border, --surface background, rounded-pill
 *   - 6px colored leading dot (--success / --warning / --text-soft / --text)
 *   - --t-xs body, weight 500
 *   - same shape and size for every state; only the dot color differs
 *
 * Critic cycle 2 callout: the previous SOFT/SOLID palette gave "Submitted"
 * (LOCKED) a solid-black pill that read as a primary CTA and shouted louder
 * than the data it was supporting. This rewrite lifts the visual treatment
 * up to spec — one calm hairline pill across all states — so the data
 * (alignment %, commit counts) stays the dominant element of the row.
 *
 * Internal state semantics (LOCKED → "Submitted", success dot) are unchanged;
 * `planStateLabel` is still the single source of truth for the user-facing
 * copy and the API layer keeps the LOCKED code.
 */
const DOT: Record<PlanState, string> = {
  DRAFT: "bg-neutral-500 dark:bg-neutral-400",
  // Submitted plan — DESIGN.md §11 success dot.
  LOCKED: "bg-emerald-600 dark:bg-emerald-400",
  RECONCILING: "bg-amber-600 dark:bg-amber-400",
  RECONCILED: "bg-emerald-600 dark:bg-emerald-400",
  // Carried-forward plan reads as a neutral/historical marker, not a status
  // signal — match Draft's quiet dot.
  CARRIED_FORWARD: "bg-neutral-500 dark:bg-neutral-400",
};

const SIZES: Record<"xs" | "sm", { pill: string; dot: string }> = {
  // 6px dot at xs (per §11 "6px colored dot prefix"); 7px at sm to track the
  // slightly larger pill height.
  xs: {
    pill: "text-[10px] leading-none px-2 py-0.5 gap-1.5",
    dot: "h-1.5 w-1.5",
  },
  sm: {
    pill: "text-xs leading-none px-2.5 py-1 gap-1.5",
    dot: "h-[7px] w-[7px]",
  },
};

export function PlanStatePill({ state, size = "sm" }: PlanStatePillProps) {
  const sz = SIZES[size];
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium whitespace-nowrap rounded-full border bg-white border-neutral-200 text-neutral-700 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-300",
        sz.pill,
      )}
    >
      <span aria-hidden className={cn("inline-block rounded-full shrink-0", sz.dot, DOT[state])} />
      {planStateLabel(state)}
    </span>
  );
}
