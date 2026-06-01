package com.colign.dto;

import com.colign.domain.DefiningObjective;

/** Full Defining Objective view returned from strategy write endpoints. */
public record DefiningObjectiveDto(
    Long id, Long rallyCryId, Long teamId, String title, String description, String status) {

  public static DefiningObjectiveDto of(DefiningObjective d) {
    return new DefiningObjectiveDto(
        d.getId(),
        d.getRallyCryId(),
        d.getTeamId(),
        d.getTitle(),
        d.getDescription(),
        d.getStatus());
  }
}
