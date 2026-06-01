package com.colign.service.email;

import com.colign.domain.InvitationRelationship;

/**
 * The data an {@link EmailClient} needs to render a team-invitation email.
 *
 * <p>Deliberately a record of plain values rather than a JPA entity — the email service must not
 * pull from the DB on render, and the controller/service layer shouldn't have to know which fields
 * the template uses.
 */
public record InvitationEmail(
    String toEmail,
    String inviterDisplayName,
    String teamName,
    InvitationRelationship relationship,
    String acceptUrl) {}
