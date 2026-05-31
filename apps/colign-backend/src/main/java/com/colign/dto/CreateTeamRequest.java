package com.colign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Create a team. Only the name is required — strategy (RCDO) and members are
 * added later, so a user can go from sign-up to a real team in one field.
 */
public record CreateTeamRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) String description
) {}
