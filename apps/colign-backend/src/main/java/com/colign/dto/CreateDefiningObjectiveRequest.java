package com.colign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Create a Defining Objective under a Rally Cry. The owning team is inherited from the parent Rally
 * Cry (and the caller must have strategy authority over that team).
 */
public record CreateDefiningObjectiveRequest(
    @NotNull Long rallyCryId,
    @NotBlank @Size(max = 200) String title,
    @Size(max = 5000) String description) {}
