package com.colign.service;

import com.colign.config.exception.NotFoundException;
import com.colign.domain.Invitation;
import com.colign.domain.InvitationRelationship;
import com.colign.domain.InvitationStatus;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.dto.InvitationDto;
import com.colign.dto.InvitationPreviewDto;
import com.colign.dto.MeDto;
import com.colign.repository.InvitationRepository;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.email.EmailClient;
import com.colign.service.email.InvitationEmail;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lifecycle for team invitations: create, preview, accept.
 *
 * <p>Invariants enforced here (not in the controller, so the unit tests own them):
 *
 * <ul>
 *   <li>Only members of the target team may issue invitations to it.
 *   <li>One pending invite per (email, team) — repeat calls return the existing row so the
 *       recipient never sees two valid links at once.
 *   <li>Inviter cannot invite themselves (no self-promotion to MANAGER by inviting your own email
 *       as REPORT).
 *   <li>Accept requires {@code currentUser.email == invitation.email} (case-insensitive). Without
 *       this anyone with the link is in.
 *   <li>Accept fails if the caller is already on a different team — they must leave first (out of
 *       scope for v1). Same-team is idempotent.
 *   <li>Past {@code expiresAt} the invitation auto-flips to EXPIRED on the next observation, so the
 *       controller surface never has to run a cleanup job.
 * </ul>
 *
 * Role-leveling is automatic: REPORT acceptance sets {@code invitee.managerId = inviter.id}, which
 * makes {@code UserResolver.derivedRole(inviter)} return MANAGER the next time it runs. Nothing
 * here writes to the inviter's role field.
 */
@Service
public class InvitationService {

  /** 24 random bytes → 32 URL-safe base64 chars. Plenty for an unguessable token. */
  private static final int TOKEN_BYTES = 24;

  private static final SecureRandom RAND = new SecureRandom();

  private final InvitationRepository invitations;
  private final TeamRepository teams;
  private final UserRepository users;
  private final EmailClient emailClient;
  private final Duration expiry;
  private final String appBaseUrl;

  public InvitationService(
      InvitationRepository invitations,
      TeamRepository teams,
      UserRepository users,
      EmailClient emailClient,
      @Value("${colign.invitations.expiry-days:14}") int expiryDays,
      @Value("${colign.app.base-url:http://localhost:4173/weekly-commit}") String appBaseUrl) {
    this.invitations = invitations;
    this.teams = teams;
    this.users = users;
    this.emailClient = emailClient;
    this.expiry = Duration.ofDays(expiryDays);
    this.appBaseUrl = trimTrailingSlash(appBaseUrl);
  }

  @Transactional
  public InvitationDto create(
      Long teamId, String rawEmail, InvitationRelationship relationship, User inviter) {
    Team team = teams.findById(teamId).orElseThrow(() -> NotFoundException.of("Team", teamId));

    if (inviter.getTeamId() == null || !inviter.getTeamId().equals(teamId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only members of a team can invite to it");
    }

    String email = normalizeEmail(rawEmail);
    if (email.equalsIgnoreCase(inviter.getEmail())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't invite yourself");
    }

    // Reuse existing pending invitation for the same email + team so the
    // recipient never has two live links and the inviter sees the same row
    // they already created.
    Invitation invitation =
        invitations
            .findFirstByEmailIgnoreCaseAndTeamIdAndStatus(email, teamId, InvitationStatus.PENDING)
            .map(
                existing -> {
                  // Refresh expiry + relationship if the inviter is re-sending.
                  existing.setExpiresAt(Instant.now().plus(expiry));
                  existing.setRelationship(relationship);
                  return existing;
                })
            .orElseGet(
                () ->
                    Invitation.builder()
                        .email(email)
                        .teamId(teamId)
                        .inviterUserId(inviter.getId())
                        .relationship(relationship)
                        .token(generateToken())
                        .expiresAt(Instant.now().plus(expiry))
                        .status(InvitationStatus.PENDING)
                        .build());

    invitation = invitations.save(invitation);

    String acceptUrl = acceptUrlFor(invitation.getToken());
    emailClient.sendInvitation(
        new InvitationEmail(
            email, inviter.getDisplayName(), team.getName(), relationship, acceptUrl));

    return toDto(invitation, inviter.getDisplayName(), acceptUrl);
  }

  @Transactional(readOnly = true)
  public InvitationPreviewDto preview(String token) {
    Invitation invitation =
        invitations.findByToken(token).orElseThrow(() -> NotFoundException.of("Invitation", token));
    Team team =
        teams
            .findById(invitation.getTeamId())
            .orElseThrow(() -> NotFoundException.of("Team", invitation.getTeamId()));
    User inviter =
        users
            .findById(invitation.getInviterUserId())
            .orElseThrow(() -> NotFoundException.of("User", invitation.getInviterUserId()));

    InvitationStatus status = effectiveStatus(invitation);

    return InvitationPreviewDto.builder()
        .teamName(team.getName())
        .inviterDisplayName(inviter.getDisplayName())
        .relationship(invitation.getRelationship())
        .status(status)
        .build();
  }

  @Transactional
  public MeDto accept(String token, User invitee, UserResolver resolver) {
    Invitation invitation =
        invitations.findByToken(token).orElseThrow(() -> NotFoundException.of("Invitation", token));

    // Lazy expiry: persist the flip so preview/accept agree from here on.
    if (invitation.getStatus() == InvitationStatus.PENDING
        && invitation.getExpiresAt().isBefore(Instant.now())) {
      invitation.setStatus(InvitationStatus.EXPIRED);
      invitations.save(invitation);
    }

    switch (invitation.getStatus()) {
      case ACCEPTED ->
          throw new ResponseStatusException(
              HttpStatus.GONE, "This invitation has already been accepted");
      case EXPIRED ->
          throw new ResponseStatusException(HttpStatus.GONE, "This invitation has expired");
      case REVOKED ->
          throw new ResponseStatusException(HttpStatus.GONE, "This invitation was revoked");
      case PENDING -> {
        /* fall through */
      }
    }

    if (!invitation.getEmail().equalsIgnoreCase(invitee.getEmail())) {
      // Don't leak which side mismatched — same 403 either way.
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "This invitation is for a different email address");
    }

    // Same-team is idempotent: just stamp the invitation accepted and bail.
    if (invitation.getTeamId().equals(invitee.getTeamId())) {
      invitation.setStatus(InvitationStatus.ACCEPTED);
      invitation.setAcceptedAt(Instant.now());
      invitations.save(invitation);
      return resolver.toMeDto(invitee);
    }

    // Different team — refuse rather than silently moving them. Letting
    // them swap teams is a v2 flow (must reconcile prior plans, etc).
    if (invitee.getTeamId() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "You already belong to a different team");
    }

    invitee.setTeamId(invitation.getTeamId());
    if (invitation.getRelationship() == InvitationRelationship.REPORT) {
      invitee.setManagerId(invitation.getInviterUserId());
    }
    users.save(invitee);

    invitation.setStatus(InvitationStatus.ACCEPTED);
    invitation.setAcceptedAt(Instant.now());
    invitations.save(invitation);

    return resolver.toMeDto(invitee);
  }

  @Transactional(readOnly = true)
  public List<InvitationDto> listForTeam(Long teamId, User caller) {
    if (caller.getTeamId() == null || !caller.getTeamId().equals(teamId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only members of a team can list its invitations");
    }
    return invitations.findByTeamIdOrderByCreatedDateDesc(teamId).stream()
        .map(
            inv -> {
              String inviterName =
                  users
                      .findById(inv.getInviterUserId())
                      .map(User::getDisplayName)
                      .orElse("(unknown)");
              return toDto(inv, inviterName, acceptUrlFor(inv.getToken()));
            })
        .toList();
  }

  // --- helpers -------------------------------------------------------------

  private InvitationDto toDto(Invitation invitation, String inviterDisplayName, String acceptUrl) {
    return InvitationDto.builder()
        .id(invitation.getId())
        .email(invitation.getEmail())
        .teamId(invitation.getTeamId())
        .inviterDisplayName(inviterDisplayName)
        .relationship(invitation.getRelationship())
        .status(invitation.getStatus())
        .token(invitation.getToken())
        .acceptUrl(acceptUrl)
        .expiresAt(invitation.getExpiresAt())
        .acceptedAt(invitation.getAcceptedAt())
        .createdAt(invitation.getCreatedDate())
        .build();
  }

  private String acceptUrlFor(String token) {
    return appBaseUrl + "/invite/" + token;
  }

  private InvitationStatus effectiveStatus(Invitation invitation) {
    if (invitation.getStatus() == InvitationStatus.PENDING
        && invitation.getExpiresAt().isBefore(Instant.now())) {
      return InvitationStatus.EXPIRED;
    }
    return invitation.getStatus();
  }

  private static String generateToken() {
    byte[] buf = new byte[TOKEN_BYTES];
    RAND.nextBytes(buf);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
  }

  private static String normalizeEmail(String raw) {
    if (raw == null) return "";
    return raw.trim().toLowerCase();
  }

  private static String trimTrailingSlash(String s) {
    if (s == null || s.isEmpty()) return s;
    return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
  }
}
