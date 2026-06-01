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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 1:0..1 with {@link WeeklyCommit} — keeps the locked plan-of-record verbatim while letting
 * reconciliation carry its own audit columns and signer. The commit's {@code status} field is
 * updated to a terminal value (DONE/MISSED/CARRIED) as a denormalized convenience for list queries;
 * the truth lives here.
 */
@Entity
@Table(name = "reconciliation")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Reconciliation extends AbstractAuditingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Column(name = "weekly_commit_id", nullable = false, unique = true)
  private Long weeklyCommitId;

  @NotBlank
  @Column(name = "actual_status", nullable = false, length = 20)
  private String actualStatus;

  @Column(name = "actual_outcome_note", columnDefinition = "TEXT")
  private String actualOutcomeNote;

  @Column(name = "actual_effort_hours", precision = 5, scale = 2)
  private BigDecimal actualEffortHours;

  @Column(name = "outcome_delta", precision = 18, scale = 4)
  private BigDecimal outcomeDelta;

  @NotNull
  @Column(name = "reconciled_at", nullable = false)
  private Instant reconciledAt;

  @NotBlank
  @Column(name = "reconciled_by", nullable = false, length = 50)
  private String reconciledBy;
}
