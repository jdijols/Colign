package com.colign.dto;

import jakarta.validation.constraints.Size;

/**
 * Body for {@code PATCH /api/v1/teams/{id}}. Every field optional; only non-null fields are
 * applied. Empty-string for {@code name} is rejected (would orphan the workspace identity).
 * avatarUrl wiring lands in PR 4; included here so the DTO doesn't churn.
 */
public record UpdateTeamRequest(
    @Size(max = 120) String name,
    @Size(max = 2000) String description,
    @Size(max = 500) String avatarUrl) {}
