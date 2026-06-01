package com.colign.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ReconciliationDto(
    Long id,
    Long weeklyCommitId,
    String actualStatus,
    String actualOutcomeNote,
    BigDecimal actualEffortHours,
    BigDecimal outcomeDelta,
    Instant reconciledAt,
    String reconciledBy) {}
