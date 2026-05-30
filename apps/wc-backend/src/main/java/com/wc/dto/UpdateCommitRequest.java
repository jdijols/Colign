package com.wc.dto;

import com.wc.domain.CommitStatus;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateCommitRequest(
        @Size(max = 200) String title,
        @Size(max = 5000) String description,
        Long outcomeId,
        Long chessTagId,
        BigDecimal plannedEffortHours,
        CommitStatus status,
        Integer ordinal
) {}
