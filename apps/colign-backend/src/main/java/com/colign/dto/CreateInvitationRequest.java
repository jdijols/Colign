package com.colign.dto;

import com.colign.domain.InvitationRelationship;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Invite a single email to the caller's team. {@code relationship} chooses how
 * they join: REPORT (invitee becomes the inviter's direct report on accept,
 * which auto-levels the inviter to MANAGER via {@code UserResolver.derivedRole})
 * or PEER (same team, no manager link).
 */
public record CreateInvitationRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotNull InvitationRelationship relationship
) {}
