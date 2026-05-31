package com.colign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ReconcileCommitRequest(
        @NotBlank
        @Pattern(regexp = "DONE|PARTIAL|MISSED|DROPPED",
                 message = "actualStatus must be one of DONE, PARTIAL, MISSED, DROPPED")
        String actualStatus,
        @Size(max = 5000) String actualOutcomeNote,
        BigDecimal actualEffortHours,
        BigDecimal outcomeDelta
) {}
