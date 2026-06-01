package com.colign.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * The leaf of the RCDO hierarchy (Key Result analogue). Self-FK {@code parentOutcomeId} lets a
 * Supporting Outcome attach to its parent Outcome, giving unlimited-depth alignment without a
 * separate join table.
 */
@Entity
@Table(name = "outcome")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Outcome extends AbstractAuditingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Column(name = "defining_objective_id", nullable = false)
  private Long definingObjectiveId;

  @Column(name = "parent_outcome_id")
  private Long parentOutcomeId;

  @NotBlank
  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "metric_type", nullable = false, length = 20)
  private String metricType;

  @Column(name = "target_value", precision = 18, scale = 4)
  private BigDecimal targetValue;

  @Column(name = "baseline_value", precision = 18, scale = 4)
  private BigDecimal baselineValue;

  @Column(name = "current_value", precision = 18, scale = 4)
  private BigDecimal currentValue;

  @Column(name = "priority_tier", nullable = false, length = 8)
  private String priorityTier;

  @Column(nullable = false, length = 20)
  private String status;
}
