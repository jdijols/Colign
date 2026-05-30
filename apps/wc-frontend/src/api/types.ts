// Mirrors apps/wc-backend src/main/java/com/wc/dto/*.

export type PlanState = "DRAFT" | "LOCKED" | "RECONCILING" | "RECONCILED" | "CARRIED_FORWARD";
export type CommitStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "MISSED" | "CARRIED";

export interface AlignmentSummary {
  totalCommits: number;
  linkedToHighPriority: number;
  alignmentPct: number;
}

export type ReconcileStatus = "DONE" | "PARTIAL" | "MISSED" | "DROPPED";

export interface ReconciliationDto {
  id: number;
  weeklyCommitId: number;
  actualStatus: ReconcileStatus;
  actualOutcomeNote: string | null;
  actualEffortHours: number | null;
  outcomeDelta: number | null;
  reconciledAt: string;
  reconciledBy: string;
}

export interface ReconcileCommitRequest {
  actualStatus: ReconcileStatus;
  actualOutcomeNote?: string;
  actualEffortHours?: number;
  outcomeDelta?: number;
}

export interface WeeklyCommitDto {
  id: number;
  planId: number;
  outcomeId: number;
  outcomeTitle: string | null;
  outcomePriority: string | null;
  chessTagId: number | null;
  chessTagCode: string | null;
  title: string;
  description: string | null;
  plannedEffortHours: number | null;
  status: CommitStatus;
  ordinal: number;
  carriedFromCommitId: number | null;
  reconciliation: ReconciliationDto | null;
}

export interface PlanDto {
  id: number;
  userId: number;
  weekStartDate: string; // ISO yyyy-mm-dd
  state: PlanState;
  lockedAt: string | null;
  reconciledAt: string | null;
  managerSignedAt: string | null;
  managerSignedBy: number | null;
  commits: WeeklyCommitDto[];
  alignment: AlignmentSummary;
  createdDate: string;
  lastModifiedDate: string;
}

export interface OutcomeRefDto {
  id: number;
  title: string;
  priorityTier: string;
  definingObjectiveId: number | null;
  definingObjectiveTitle: string | null;
  rallyCryId: number | null;
  rallyCryTitle: string | null;
}

export interface ChessTagDto {
  id: number;
  code: "OFFENSE" | "DEFENSE" | "MAINTENANCE" | string;
  label: string;
  priorityRank: number;
}

export interface AddCommitRequest {
  title: string;
  description?: string;
  outcomeId: number;
  chessTagId?: number;
  plannedEffortHours?: number;
  ordinal?: number;
}

export interface UpdateCommitRequest {
  title?: string;
  description?: string;
  outcomeId?: number;
  chessTagId?: number;
  plannedEffortHours?: number;
  status?: CommitStatus;
  ordinal?: number;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
