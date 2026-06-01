package com.colign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Create a measurable Outcome under a Defining Objective. The owning team is inherited from the
 * parent Objective. Metric/target fields are optional so the onboarding wizard can create a
 * title-only Outcome and refine metrics later. {@code priorityTier} defaults to P1 when absent.
 */
public record CreateOutcomeRequest(
    @NotNull Long definingObjectiveId,
    @NotBlank @Size(max = 200) String title,
    @Size(max = 5000) String description,
    @Size(max = 20) String metricType,
    BigDecimal targetValue,
    BigDecimal baselineValue,
    @Size(max = 8) String priorityTier,
    Long parentOutcomeId) {}
