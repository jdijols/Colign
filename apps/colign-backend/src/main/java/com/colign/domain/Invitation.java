package com.colign.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A team invitation. Created when a lead invites someone by email; consumed when the named invitee
 * signs in and accepts via the unique {@code token}.
 *
 * <p>Email is stored lowercased so the accept-side equality check is case-insensitive without
 * needing a {@code citext} column or a per-query {@code LOWER()} call — historical accident of MIME
 * but consistent in v1.
 *
 * <p>The {@code token} is the only field exposed to the outside world (it's literally in the URL of
 * the email); everything else stays server-side.
 */
@Entity
@Table(name = "invitation")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Invitation extends AbstractAuditingEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  @Email
  @Column(nullable = false, length = 254)
  private String email;

  @NotNull
  @Column(name = "team_id", nullable = false)
  private Long teamId;

  @NotNull
  @Column(name = "inviter_user_id", nullable = false)
  private Long inviterUserId;

  @NotNull
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private InvitationRelationship relationship;

  @NotBlank
  @Column(nullable = false, unique = true, length = 64)
  private String token;

  @NotNull
  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "accepted_at")
  private Instant acceptedAt;

  @NotNull
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private InvitationStatus status;
}
