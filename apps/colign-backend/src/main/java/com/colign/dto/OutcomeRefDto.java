package com.colign.dto;

/**
 * Slim Outcome view for FE pickers (combobox) — no metrics, just identity
 * and the strategy-chain context the IC sees when choosing.
 */
public record OutcomeRefDto(
        Long id,
        String title,
        String priorityTier,
        Long definingObjectiveId,
        String definingObjectiveTitle,
        Long rallyCryId,
        String rallyCryTitle
) {}
