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
    ReconciliationDto reconciliation) {}
