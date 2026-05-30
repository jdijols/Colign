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
export declare function planStateTone(state: PlanState): StatusTone;
export declare function planStateLabel(state: PlanState): string;
export declare function commitStatusTone(status: CommitStatus): StatusTone;
export declare function commitStatusLabel(status: CommitStatus): string;
export declare function reconcileStatusTone(status: ReconcileStatus): StatusTone;
export declare function priorityTone(tier: string | null | undefined): StatusTone;
export declare function chessTagTone(code: string | null | undefined): StatusTone;
export interface AlignmentTier {
    tone: StatusTone;
    bar: string;
    label: string;
}
export declare function alignmentTier(pct: number): AlignmentTier;
