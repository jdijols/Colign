package com.colign.dto;

import com.colign.domain.InvitationRelationship;
import com.colign.domain.InvitationStatus;
import lombok.Builder;
import lombok.Getter;

/**
 * Public-safe preview returned to the unauthenticated invite-accept screen.
 *
 * Deliberately omits the invitation id, email of the invitee, expiry timestamp,
 * and any inviter identifier beyond display name — the page is reachable to
 * anyone with the link, so we expose only what's needed for "Accept invitation
 * to join Team X as REPORT/PEER of Person Y."
 */
@Getter
@Builder
public class InvitationPreviewDto {
    private String teamName;
    private String inviterDisplayName;
    private InvitationRelationship relationship;
    private InvitationStatus status;
}
