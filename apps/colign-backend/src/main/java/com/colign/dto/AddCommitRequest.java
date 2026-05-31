package com.colign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AddCommitRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 5000) String description,
        @NotNull Long outcomeId,
        Long chessTagId,
        BigDecimal plannedEffortHours,
        Integer ordinal
) {}
