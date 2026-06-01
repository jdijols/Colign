package com.colign.dto;

/** Workspace profile shape returned by GET / PATCH /api/v1/teams/{id}. */
public record TeamDto(
    Long id,
    String name,
    String description,
    String avatarUrl,
    Long leadUserId
) {}
