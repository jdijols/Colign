package com.wc.dto;

public record TeamMemberDto(
        Long userId,
        String email,
        String displayName,
        String role,
        String avatarUrl,
        PlanDto currentPlan
) {}
