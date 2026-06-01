package com.colign.dto;

import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Patch an Outcome. Only non-null fields are applied. */
public record UpdateOutcomeRequest(
    @Size(max = 200) String title,
    @Size(max = 5000) String description,
    @Size(max = 20) String metricType,
    BigDecimal targetValue,
    BigDecimal baselineValue,
    BigDecimal currentValue,
    @Size(max = 8) String priorityTier,
    @Size(max = 20) String status) {}
