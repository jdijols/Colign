package com.colign.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The IC's weekly commitment. {@code outcomeId} is NOT NULL — this is the structural-alignment
 * guarantee that distinguishes WC from 15-Five's unenforced "priorities link to objectives"
 * pattern.
 */
@Entity
@Table(name = "weekly_commit")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class WeeklyCommit extends AbstractAuditingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Column(name = "plan_id", nullable = false)
  private Long planId;

  @NotNull
  @Column(name = "outcome_id", nullable = false)
  private Long outcomeId;

  @Column(name = "chess_tag_id")
  private Long chessTagId;

  @NotBlank
  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "planned_effort_hours", precision = 5, scale = 2)
  private BigDecimal plannedEffortHours;

  @NotNull
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private CommitStatus status;

  @Column(nullable = false)
  private Integer ordinal;

  @Column(name = "carried_from_commit_id")
  private Long carriedFromCommitId;
}
