package com.colign.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreatePlanRequest(@NotNull LocalDate weekStartDate) {}
