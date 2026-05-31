package com.colign.domain;

/**
 * How an invited user joins the team:
 *
 * <ul>
 *   <li>{@link #REPORT} — the invitee becomes a direct report of the inviter.
 *       On accept, {@code invitee.managerId = inviter.id}. The inviter's
 *       derived role flips to MANAGER the next time {@code UserResolver}
 *       resolves them.
 *   <li>{@link #PEER} — the invitee joins the same team but no manager link
 *       is created. {@code invitee.managerId} stays null.
 * </ul>
 *
 * Stored as the column name (String) via {@code @Enumerated(EnumType.STRING)},
 * so adding values later is a migration concern, not a renumbering one.
 */
public enum InvitationRelationship {
    REPORT,
    PEER
}
