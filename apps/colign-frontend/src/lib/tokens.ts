import type { CommitStatus, PlanState, ReconcileStatus } from "@/api/types";

/**
 * Semantic status tones. Drives the Badge / Alert variants and is the single
 * source of truth for "what color should this state be?" Adding a new state
 * means adding it to the right mapper below — no scattered color literals.
 *
 *   neutral  →  zinc / inactive
 *   info     →  high-contrast (acts as the primary brand surface in light/dark)
 *   success  →  emerald
 *   warning  →  amber
 *   danger   →  rose
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export function planStateTone(state: PlanState): StatusTone {
  switch (state) {
    case "DRAFT":
      return "neutral";
    case "LOCKED":
      return "info";
    case "RECONCILING":
      return "warning";
    case "RECONCILED":
      return "success";
    case "CARRIED_FORWARD":
      return "neutral";
  }
}

export function planStateLabel(state: PlanState): string {
  switch (state) {
    case "DRAFT":
      return "Draft";
    case "LOCKED":
      // User-facing label for the LOCKED state is "Submitted" — the immutable
      // baseline the IC has committed to for the week. Backend state name stays
      // LOCKED; only user-visible copy uses "Submitted" / "Submit plan".
      return "Submitted";
    case "RECONCILING":
      return "Reconciling";
    case "RECONCILED":
      return "Reconciled";
    case "CARRIED_FORWARD":
      return "Carried forward";
  }
}

export function commitStatusTone(status: CommitStatus): StatusTone {
  switch (status) {
    case "PLANNED":
      return "neutral";
    case "IN_PROGRESS":
      return "info";
    case "DONE":
      return "success";
    case "MISSED":
      return "danger";
    case "CARRIED":
      return "neutral";
  }
}

export function commitStatusLabel(status: CommitStatus): string {
  switch (status) {
    case "PLANNED":
      return "Planned";
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
    case "MISSED":
      return "Missed";
    case "CARRIED":
      return "Carried";
  }
}

export function reconcileStatusTone(status: ReconcileStatus): StatusTone {
  switch (status) {
    case "DONE":
      return "success";
    case "PARTIAL":
      return "warning";
    case "MISSED":
      return "danger";
    case "DROPPED":
      return "neutral";
  }
}

export function priorityTone(tier: string | null | undefined): StatusTone {
  if (tier === "P0") return "danger";
  if (tier === "P1") return "warning";
  if (tier === "P2") return "info";
  return "neutral";
}

/**
 * Consumer-friendly label for a priority tier (DESIGN.md §10). The internal
 * data model is P0/P1/P2 but every user-facing surface must render the
 * Notion-adjacent "High / Medium / Low" wording — never the internal codes.
 *
 * Returns the tier string unchanged for unknown / unmapped values so existing
 * call sites that pre-translate keep working.
 */
export function priorityLabel(tier: string | null | undefined): string {
  if (tier === "P0") return "High";
  if (tier === "P1") return "Medium";
  if (tier === "P2") return "Low";
  return tier ?? "";
}

export function chessTagTone(code: string | null | undefined): StatusTone {
  if (code === "OFFENSE") return "success";
  if (code === "DEFENSE") return "warning";
  if (code === "MAINTENANCE") return "neutral";
  if (code === "POSITIONING") return "info";
  return "neutral";
}

export interface AlignmentTier {
  tone: StatusTone;
  bar: string;
  label: string;
}

export function alignmentTier(pct: number): AlignmentTier {
  if (pct >= 70) {
    return {
      tone: "success",
      bar: "bg-emerald-500 dark:bg-emerald-400",
      label: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (pct >= 40) {
    return {
      tone: "warning",
      bar: "bg-amber-500 dark:bg-amber-400",
      // amber-600 on white = 3.32:1 (fails AA normal). Bumped to amber-700 (5.05:1).
      label: "text-amber-700 dark:text-amber-400",
    };
  }
  return {
    tone: "danger",
    bar: "bg-rose-500 dark:bg-rose-400",
    // rose-600 on white = 4.45:1 (borderline). Bumped to rose-700 (5.94:1).
    label: "text-rose-700 dark:text-rose-400",
  };
}
