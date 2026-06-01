package com.colign.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Patch a Rally Cry. Only non-null fields are applied. */
public record UpdateRallyCryRequest(
    @Size(max = 200) String title,
    @Size(max = 5000) String narrative,
    LocalDate horizonStart,
    LocalDate horizonEnd,
    @Size(max = 20) String status) {}
