package com.colign.domain;

/**
 * Lifecycle of an {@link Invitation}.
 *
 * <ul>
 *   <li>{@link #PENDING}   — created, awaiting accept. Preview/accept allowed
 *       until {@code expiresAt}.
 *   <li>{@link #ACCEPTED}  — the named invitee accepted. {@code acceptedAt}
 *       is set. Subsequent accept attempts return 410.
 *   <li>{@link #EXPIRED}   — past {@code expiresAt}. Status is set lazily by
 *       the service when first observed past-expiry (no batch job needed).
 *   <li>{@link #REVOKED}   — explicitly cancelled by the inviter or a team
 *       admin. Not exposed in v1's controller surface; reserved for the
 *       members screen in v2.
 * </ul>
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    EXPIRED,
    REVOKED
}
