package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.colign.config.exception.NotFoundException;
import com.colign.domain.Invitation;
import com.colign.domain.InvitationRelationship;
import com.colign.domain.InvitationStatus;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.InvitationDto;
import com.colign.dto.InvitationPreviewDto;
import com.colign.dto.MeDto;
import com.colign.repository.InvitationRepository;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.email.EmailClient;
import com.colign.service.email.InvitationEmail;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Unit tests for {@link InvitationService}. Mocks the repositories and email client; wires a real
 * {@link UserResolver} so role-leveling assertions exercise the actual derivation logic
 * (countByManagerId → MANAGER) rather than a stub.
 *
 * <p>Covers the invariants the controller layer relies on but doesn't itself enforce:
 * only-team-members-may-invite, no self-invite, email-match on accept, REPORT vs PEER relationship
 * effects, idempotent same-team accept, refusal of different-team accept, lazy expiry transition.
 */
@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

  private static final long TEAM_ID = 100L;
  private static final long INVITER_ID = 1L;
  private static final long INVITEE_ID = 2L;
  private static final String INVITER_EMAIL = "lead@example.com";
  private static final String INVITEE_EMAIL = "newhire@example.com";
  private static final String APP_BASE = "http://localhost:4173/weekly-commit";

  @Mock private InvitationRepository invitations;
  @Mock private TeamRepository teams;
  @Mock private UserRepository users;
  @Mock private EmailClient emailClient;
  @Mock private com.colign.repository.OutcomeRepository outcomes;

  private InvitationService service;
  private UserResolver resolver;

  private Team team;
  private User inviter;
  private User invitee;

  @BeforeEach
  void setUp() {
    service = new InvitationService(invitations, teams, users, emailClient, 14, APP_BASE);
    resolver = new UserResolver(users, invitations, teams, outcomes, "IC");

    team = Team.builder().name("Platform Engineering").leadUserId(INVITER_ID).build();
    team.setId(TEAM_ID);

    inviter =
        User.builder()
            .email(INVITER_EMAIL)
            .displayName("Lead Person")
            .role(UserRole.IC)
            .teamId(TEAM_ID)
            .active(true)
            .build();
    inviter.setId(INVITER_ID);

    invitee =
        User.builder()
            .email(INVITEE_EMAIL)
            .displayName("New Hire")
            .role(UserRole.IC)
            .teamId(null)
            .active(true)
            .build();
    invitee.setId(INVITEE_ID);
  }

  // ----- create ------------------------------------------------------------

  @Test
  void create_persistsAndSendsEmail_andReturnsAcceptUrl() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));
    when(invitations.findFirstByEmailIgnoreCaseAndTeamIdAndStatus(
            eq(INVITEE_EMAIL), eq(TEAM_ID), eq(InvitationStatus.PENDING)))
        .thenReturn(Optional.empty());
    when(invitations.save(any(Invitation.class)))
        .thenAnswer(
            inv -> {
              Invitation saved = inv.getArgument(0);
              saved.setId(999L);
              return saved;
            });

    InvitationDto dto =
        service.create(TEAM_ID, INVITEE_EMAIL, InvitationRelationship.REPORT, inviter);

    assertThat(dto.getEmail()).isEqualTo(INVITEE_EMAIL);
    assertThat(dto.getTeamId()).isEqualTo(TEAM_ID);
    assertThat(dto.getRelationship()).isEqualTo(InvitationRelationship.REPORT);
    assertThat(dto.getStatus()).isEqualTo(InvitationStatus.PENDING);
    assertThat(dto.getToken()).isNotBlank();
    assertThat(dto.getAcceptUrl()).isEqualTo(APP_BASE + "/invite/" + dto.getToken());
    verify(emailClient, times(1))
        .sendInvitation(
            argThat(
                (InvitationEmail e) ->
                    e.toEmail().equals(INVITEE_EMAIL)
                        && e.teamName().equals("Platform Engineering")
                        && e.inviterDisplayName().equals("Lead Person")
                        && e.acceptUrl().equals(dto.getAcceptUrl())));
  }

  @Test
  void create_normalizesEmailToLowercase() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));
    when(invitations.findFirstByEmailIgnoreCaseAndTeamIdAndStatus(
            eq("mixedcase@example.com"), eq(TEAM_ID), eq(InvitationStatus.PENDING)))
        .thenReturn(Optional.empty());
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

    InvitationDto dto =
        service.create(TEAM_ID, "  MixedCase@Example.COM ", InvitationRelationship.PEER, inviter);

    assertThat(dto.getEmail()).isEqualTo("mixedcase@example.com");
  }

  @Test
  void create_refusesIfInviterNotOnTeam() {
    inviter.setTeamId(null);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));

    assertThatThrownBy(
            () -> service.create(TEAM_ID, INVITEE_EMAIL, InvitationRelationship.PEER, inviter))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    verify(emailClient, never()).sendInvitation(any());
  }

  @Test
  void create_refusesIfInviterOnDifferentTeam() {
    inviter.setTeamId(999L);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));

    assertThatThrownBy(
            () -> service.create(TEAM_ID, INVITEE_EMAIL, InvitationRelationship.PEER, inviter))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
  }

  @Test
  void create_refusesSelfInvite() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));

    assertThatThrownBy(
            () ->
                service.create(
                    TEAM_ID, INVITER_EMAIL.toUpperCase(), InvitationRelationship.REPORT, inviter))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
  }

  @Test
  void create_reusesExistingPending_andRefreshesExpiry() {
    Invitation existing =
        Invitation.builder()
            .email(INVITEE_EMAIL)
            .teamId(TEAM_ID)
            .inviterUserId(INVITER_ID)
            .relationship(InvitationRelationship.PEER)
            .token("preserved-token")
            .expiresAt(Instant.now().minus(2, ChronoUnit.DAYS))
            .status(InvitationStatus.PENDING)
            .build();
    existing.setId(42L);

    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));
    when(invitations.findFirstByEmailIgnoreCaseAndTeamIdAndStatus(
            eq(INVITEE_EMAIL), eq(TEAM_ID), eq(InvitationStatus.PENDING)))
        .thenReturn(Optional.of(existing));
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

    InvitationDto dto =
        service.create(TEAM_ID, INVITEE_EMAIL, InvitationRelationship.REPORT, inviter);

    assertThat(dto.getToken()).isEqualTo("preserved-token");
    assertThat(dto.getRelationship()).isEqualTo(InvitationRelationship.REPORT);
    assertThat(dto.getExpiresAt()).isAfter(Instant.now());
  }

  // ----- accept ------------------------------------------------------------

  @Test
  void accept_REPORT_setsTeamIdAndManagerId_andPromotesInviterToManager() {
    Invitation pending = pendingInvitation(InvitationRelationship.REPORT, "report-token");
    when(invitations.findByToken("report-token")).thenReturn(Optional.of(pending));
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));
    when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    MeDto me = service.accept("report-token", invitee, resolver);

    assertThat(invitee.getTeamId()).isEqualTo(TEAM_ID);
    assertThat(invitee.getManagerId()).isEqualTo(INVITER_ID);
    assertThat(pending.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    assertThat(pending.getAcceptedAt()).isNotNull();
    assertThat(me.getTeamId()).isEqualTo(TEAM_ID);
    assertThat(me.getManagerId()).isEqualTo(INVITER_ID);

    // Role-leveling: now that invitee.managerId = inviter.id, the inviter's
    // derived role flips to MANAGER on next resolve.
    when(users.countByManagerId(INVITER_ID)).thenReturn(1L);
    MeDto inviterMe = resolver.toMeDto(inviter);
    assertThat(inviterMe.getRole()).isEqualTo("MANAGER");
  }

  @Test
  void accept_PEER_setsTeamId_butLeavesManagerIdNull() {
    Invitation pending = pendingInvitation(InvitationRelationship.PEER, "peer-token");
    when(invitations.findByToken("peer-token")).thenReturn(Optional.of(pending));
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));
    when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    service.accept("peer-token", invitee, resolver);

    assertThat(invitee.getTeamId()).isEqualTo(TEAM_ID);
    assertThat(invitee.getManagerId()).isNull();
    // Inviter still has zero reports → still IC.
    when(users.countByManagerId(INVITER_ID)).thenReturn(0L);
    assertThat(resolver.toMeDto(inviter).getRole()).isEqualTo("IC");
  }

  @Test
  void accept_rejectsEmailMismatch_withForbidden() {
    Invitation pending = pendingInvitation(InvitationRelationship.REPORT, "mismatch-token");
    when(invitations.findByToken("mismatch-token")).thenReturn(Optional.of(pending));

    User wrongUser =
        User.builder()
            .email("not-the-invitee@example.com")
            .displayName("Wrong Person")
            .role(UserRole.IC)
            .active(true)
            .build();
    wrongUser.setId(77L);

    assertThatThrownBy(() -> service.accept("mismatch-token", wrongUser, resolver))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    verify(users, never()).save(any());
  }

  @Test
  void accept_isCaseInsensitiveOnEmail() {
    Invitation pending = pendingInvitation(InvitationRelationship.REPORT, "case-token");
    when(invitations.findByToken("case-token")).thenReturn(Optional.of(pending));
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));
    when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    invitee.setEmail(INVITEE_EMAIL.toUpperCase());
    service.accept("case-token", invitee, resolver);

    assertThat(invitee.getTeamId()).isEqualTo(TEAM_ID);
  }

  @Test
  void accept_rejectsExpiredInvitation_andPersistsExpiredStatus() {
    Invitation expired = pendingInvitation(InvitationRelationship.PEER, "old-token");
    expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));
    when(invitations.findByToken("old-token")).thenReturn(Optional.of(expired));
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

    assertThatThrownBy(() -> service.accept("old-token", invitee, resolver))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.GONE));
    assertThat(expired.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
  }

  @Test
  void accept_rejectsAlreadyAccepted() {
    Invitation accepted = pendingInvitation(InvitationRelationship.PEER, "used-token");
    accepted.setStatus(InvitationStatus.ACCEPTED);
    accepted.setAcceptedAt(Instant.now().minus(1, ChronoUnit.HOURS));
    when(invitations.findByToken("used-token")).thenReturn(Optional.of(accepted));

    assertThatThrownBy(() -> service.accept("used-token", invitee, resolver))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.GONE));
  }

  @Test
  void accept_isIdempotentForSameTeamMembership() {
    Invitation pending = pendingInvitation(InvitationRelationship.PEER, "same-team-token");
    when(invitations.findByToken("same-team-token")).thenReturn(Optional.of(pending));
    when(invitations.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

    invitee.setTeamId(TEAM_ID); // already a member
    MeDto me = service.accept("same-team-token", invitee, resolver);

    assertThat(invitee.getTeamId()).isEqualTo(TEAM_ID);
    assertThat(pending.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    assertThat(me.getTeamId()).isEqualTo(TEAM_ID);
    verify(users, never()).save(any()); // no membership change
  }

  @Test
  void accept_rejectsIfAlreadyOnDifferentTeam_withConflict() {
    Invitation pending = pendingInvitation(InvitationRelationship.PEER, "swap-token");
    when(invitations.findByToken("swap-token")).thenReturn(Optional.of(pending));

    invitee.setTeamId(999L); // on a different team

    assertThatThrownBy(() -> service.accept("swap-token", invitee, resolver))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void accept_unknownTokenReturns404() {
    when(invitations.findByToken("nope")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.accept("nope", invitee, resolver))
        .isInstanceOf(NotFoundException.class);
  }

  // ----- preview -----------------------------------------------------------

  @Test
  void preview_returnsTeamAndInviterAndStatus() {
    Invitation pending = pendingInvitation(InvitationRelationship.REPORT, "preview-token");
    when(invitations.findByToken("preview-token")).thenReturn(Optional.of(pending));
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));
    when(users.findById(INVITER_ID)).thenReturn(Optional.of(inviter));

    InvitationPreviewDto preview = service.preview("preview-token");

    assertThat(preview.getTeamName()).isEqualTo("Platform Engineering");
    assertThat(preview.getInviterDisplayName()).isEqualTo("Lead Person");
    assertThat(preview.getRelationship()).isEqualTo(InvitationRelationship.REPORT);
    assertThat(preview.getStatus()).isEqualTo(InvitationStatus.PENDING);
  }

  @Test
  void preview_reportsExpiredEvenIfStoredStatusIsPending() {
    Invitation expired = pendingInvitation(InvitationRelationship.PEER, "old-preview");
    expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));
    when(invitations.findByToken("old-preview")).thenReturn(Optional.of(expired));
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team));
    when(users.findById(INVITER_ID)).thenReturn(Optional.of(inviter));

    InvitationPreviewDto preview = service.preview("old-preview");

    assertThat(preview.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
  }

  // ----- listForTeam -------------------------------------------------------

  @Test
  void listForTeam_returnsAllInvitations_forTeamMember() {
    Invitation a = pendingInvitation(InvitationRelationship.REPORT, "tok-a");
    Invitation b = pendingInvitation(InvitationRelationship.PEER, "tok-b");
    when(invitations.findByTeamIdOrderByCreatedDateDesc(TEAM_ID))
        .thenReturn(java.util.List.of(a, b));
    when(users.findById(INVITER_ID)).thenReturn(Optional.of(inviter));

    var list = service.listForTeam(TEAM_ID, inviter);

    assertThat(list).hasSize(2);
    assertThat(list.get(0).getToken()).isEqualTo("tok-a");
    assertThat(list.get(0).getAcceptUrl()).endsWith("/invite/tok-a");
    assertThat(list.get(0).getInviterDisplayName()).isEqualTo("Lead Person");
  }

  @Test
  void listForTeam_refusesNonMember() {
    User stranger =
        User.builder()
            .email("nope@example.com")
            .displayName("Stranger")
            .role(UserRole.IC)
            .teamId(999L)
            .active(true)
            .build();
    stranger.setId(50L);

    assertThatThrownBy(() -> service.listForTeam(TEAM_ID, stranger))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    verify(invitations, never()).findByTeamIdOrderByCreatedDateDesc(anyLong());
  }

  // ----- helpers -----------------------------------------------------------

  private Invitation pendingInvitation(InvitationRelationship relationship, String token) {
    Invitation invitation =
        Invitation.builder()
            .email(INVITEE_EMAIL)
            .teamId(TEAM_ID)
            .inviterUserId(INVITER_ID)
            .relationship(relationship)
            .token(token)
            .expiresAt(Instant.now().plus(14, ChronoUnit.DAYS))
            .status(InvitationStatus.PENDING)
            .build();
    invitation.setId(7L);
    return invitation;
  }
}
