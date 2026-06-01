package com.colign.dto;

import com.colign.domain.CommitStatus;
import java.math.BigDecimal;

public record WeeklyCommitDto(
    Long id,
    Long planId,
    Long outcomeId,
    String outcomeTitle,
    String outcomePriority,
    Long chessTagId,
    String chessTagCode,
    String title,
    String description,
    BigDecimal plannedEffortHours,
    CommitStatus status,
    Integer ordinal,
    Long carriedFromCommitId,
    ReconciliationDto reconciliation,
    /**
     * Resolved Defining Objective title for the commit's leaf Outcome. Nullable for legacy or
     * partial data. Surfaces full RCDO path so the manager drill-drawer can group commits by
     * objective without an extra client round-trip.
     */
    String definingObjectiveTitle,
    /** Resolved Rally Cry title for the commit's leaf Outcome. Nullable for the same reason. */
    String rallyCryTitle) {}
