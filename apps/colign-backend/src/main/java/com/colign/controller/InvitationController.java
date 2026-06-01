package com.colign.controller;

import com.colign.domain.User;
import com.colign.dto.InvitationPreviewDto;
import com.colign.dto.MeDto;
import com.colign.service.InvitationService;
import com.colign.service.UserResolver;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Invite-link endpoints — paired with the team-scoped invite create/list on {@link TeamController}.
 * Split here because the URL space is token-keyed and the preview must be reachable WITHOUT
 * authentication (the recipient hasn't logged in yet). {@code SecurityConfig} permits {@code GET
 * /api/v1/invitations/**} to make that possible.
 */
@RestController
@RequestMapping("/api/v1/invitations")
public class InvitationController {

  private final InvitationService invitations;
  private final UserResolver userResolver;

  public InvitationController(InvitationService invitations, UserResolver userResolver) {
    this.invitations = invitations;
    this.userResolver = userResolver;
  }

  /**
   * Public preview for the unauthenticated accept screen. Returns just enough to render "Join
   * {team} as {report|peer} of {person}" — nothing the link doesn't already imply. Lazy-flips
   * PENDING→EXPIRED on read so the UI can show an accurate state without a backfill job.
   */
  @GetMapping("/{token}")
  public InvitationPreviewDto preview(@PathVariable String token) {
    return invitations.preview(token);
  }

  /**
   * Accept the invitation. Requires the caller's authenticated email to match the invitation email
   * (the service enforces this; the controller just plumbs the JIT-provisioned user through).
   * Returns the caller's refreshed {@link MeDto} — same shape as {@code GET /me} — so the frontend
   * can route straight into the app off a single response.
   */
  @PostMapping("/{token}/accept")
  public MeDto accept(@PathVariable String token) {
    User me = userResolver.resolveCurrent();
    return invitations.accept(token, me, userResolver);
  }
}
