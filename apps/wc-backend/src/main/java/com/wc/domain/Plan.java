package com.wc.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One plan per IC per week. Owns the lifecycle state machine documented in PLAN.md §4.
 * The unique constraint on (user_id, week_start_date) is the structural guarantee
 * that an IC cannot accidentally create two plans for the same week.
 */
@Entity
@Table(
    name = "plan",
    uniqueConstraints = @UniqueConstraint(name = "uk_plan_user_week", columnNames = {"user_id", "week_start_date"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Plan extends AbstractAuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull
    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlanState state;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "reconciled_at")
    private Instant reconciledAt;

    @Column(name = "manager_signed_at")
    private Instant managerSignedAt;

    @Column(name = "manager_signed_by")
    private Long managerSignedBy;
}
