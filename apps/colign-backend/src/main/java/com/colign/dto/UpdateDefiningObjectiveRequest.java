package com.colign.dto;

import jakarta.validation.constraints.Size;

/** Patch a Defining Objective. Only non-null fields are applied. */
public record UpdateDefiningObjectiveRequest(
    @Size(max = 200) String title,
    @Size(max = 5000) String description,
    @Size(max = 20) String status) {}
