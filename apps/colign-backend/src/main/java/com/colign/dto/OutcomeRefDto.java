package com.colign.dto;

import java.time.Instant;

/**
 * Slim Outcome view for FE pickers (combobox) — no metrics, just identity and the strategy-chain
 * context the IC sees when choosing. {@code createdDate} lets the timeline views place each Outcome
 * in the week it was established.
 */
public record OutcomeRefDto(
    Long id,
    String title,
    String priorityTier,
    Long definingObjectiveId,
    String definingObjectiveTitle,
    Long rallyCryId,
    String rallyCryTitle,
    Instant createdDate,
    Instant effectiveTo) {}
