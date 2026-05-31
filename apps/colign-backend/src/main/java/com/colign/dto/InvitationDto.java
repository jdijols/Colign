package com.colign.dto;

import com.colign.domain.InvitationRelationship;
import com.colign.domain.InvitationStatus;
import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

/**
 * What the inviter sees: the invitation row plus a precomputed {@code acceptUrl}
 * so the UI can offer "copy invite link" without having to reconstruct the URL
 * shape. The {@code token} is included because that URL contains it anyway —
 * preview/accept enforce the security perimeter, not opacity.
 */
@Getter
@Builder
public class InvitationDto {
    private Long id;
    private String email;
    private Long teamId;
    private String inviterDisplayName;
    private InvitationRelationship relationship;
    private InvitationStatus status;
    private String token;
    private String acceptUrl;
    private Instant expiresAt;
    private Instant acceptedAt;
    private Instant createdAt;
}
