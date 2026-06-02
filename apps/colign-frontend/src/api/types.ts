// Mirrors apps/colign-backend src/main/java/com/colign/dto/*.

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
  /** Resolved Defining Objective title for the commit's Outcome (may be null on partial data). */
  definingObjectiveTitle?: string | null;
  /** Resolved Rally Cry title for the commit's Outcome (may be null on partial data). */
  rallyCryTitle?: string | null;
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
  /**
   * ISO-8601 instant the Outcome was created (from the backend auditing
   * fields). Drives the timeline views — an Outcome is "established as of" a
   * week when its creation date is on or before that week's end. Optional so
   * callers built before the field shipped still type-check.
   */
  createdDate?: string;
  /**
   * ISO-8601 instant the Outcome was retired (soft delete); null/absent = still
   * active. With createdDate this is the effective range the timeline filters
   * on — an Outcome shows in weeks between its creation and its retirement.
   */
  effectiveTo?: string | null;
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

export interface TeamMemberDto {
  userId: number;
  email: string;
  displayName: string;
  role: "IC" | "MANAGER" | "ADMIN";
  avatarUrl: string | null;
  currentPlan: PlanDto | null;
}
