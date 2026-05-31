package com.colign.dto;

import com.colign.domain.PlanState;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PlanDto(
        Long id,
        Long userId,
        LocalDate weekStartDate,
        PlanState state,
        Instant lockedAt,
        Instant reconciledAt,
        Instant managerSignedAt,
        Long managerSignedBy,
        List<WeeklyCommitDto> commits,
        AlignmentSummary alignment,
        Instant createdDate,
        Instant lastModifiedDate
) {
    public record AlignmentSummary(int totalCommits, int linkedToHighPriority, double alignmentPct) {}
}
