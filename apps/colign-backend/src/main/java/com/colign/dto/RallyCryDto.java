package com.colign.dto;

import com.colign.domain.RallyCry;
import java.time.LocalDate;

/** Full Rally Cry view returned from strategy write endpoints and the wizard's resume read. */
public record RallyCryDto(
    Long id,
    String title,
    String narrative,
    Long teamId,
    LocalDate horizonStart,
    LocalDate horizonEnd,
    String status) {

  public static RallyCryDto of(RallyCry rc) {
    return new RallyCryDto(
        rc.getId(),
        rc.getTitle(),
        rc.getNarrative(),
        rc.getTeamId(),
        rc.getHorizonStart(),
        rc.getHorizonEnd(),
        rc.getStatus());
  }
}
