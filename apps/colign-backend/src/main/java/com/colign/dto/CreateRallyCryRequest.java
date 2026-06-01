package com.colign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Create a team's Rally Cry. The owning team is derived from the authenticated caller, never the
 * request body, so a caller can only seed strategy for their own team. {@code narrative} and the
 * horizon dates are optional — the onboarding wizard collects a title only and the service defaults
 * a sensible horizon when absent.
 */
public record CreateRallyCryRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 5000) String narrative,
    LocalDate horizonStart,
    LocalDate horizonEnd) {}
