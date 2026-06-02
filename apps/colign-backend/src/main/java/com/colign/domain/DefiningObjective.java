package com.colign.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "defining_objective")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class DefiningObjective extends AbstractAuditingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotNull
  @Column(name = "rally_cry_id", nullable = false)
  private Long rallyCryId;

  /**
   * Denormalised owning team (V7). Mirrors {@code rally_cry.team_id} so strategy authz and
   * team-scoped reads don't walk the FK chain per request. Always equal to the parent Rally Cry's
   * team.
   */
  @NotNull
  @Column(name = "team_id", nullable = false)
  private Long teamId;

  @NotBlank
  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "owner_user_id")
  private Long ownerUserId;

  @Column(nullable = false, length = 20)
  private String status;

  /**
   * When this Objective was retired (soft delete). Null = still active. Removing
   * an Objective stamps this and soft-cascades to its active Outcomes so the
   * timeline can still show it in the weeks it was live.
   */
  @Column(name = "effective_to")
  private Instant effectiveTo;
}
