package com.colign.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * The current authenticated user, as the frontend needs them for routing.
 *
 * <p>The pivotal field is {@code teamId}: when null, the user belongs to no team yet and the
 * frontend routes them into the onboarding choice (create / join a team) instead of the weekly-plan
 * app. {@code role} is DERIVED from team relationships server-side (see UserResolver), not read
 * from the JWT — so a user who just gained their first direct report sees MANAGER here immediately,
 * without needing to re-authenticate.
 */
@Getter
@Builder
public class MeDto {
  private Long id;
  private String email;
  private String displayName;
  private String role;
  private Long teamId;
  private Long managerId;

  /**
   * True when the caller is on a team that still needs invites sent before the app is useful:
   * they're the only member AND no invitations have gone out yet. Drives the onboarding gate's
   * create→invite→app routing — a freshly-created team lands on the invite step until they invite
   * someone; an invited member (team already has &gt;1 person) skips straight to the app.
   */
  private boolean needsInvite;

  // --- new in Phase 4 ---
  /**
   * Team name, denormalized onto /me so AppShell can render the workspace pill without an extra
   * query. Null when the user has no team.
   */
  private String teamName;

  /** Team avatar URL (HTTP/HTTPS). Null when unset; FE falls back to a generated initial. */
  private String teamAvatarUrl;

  /**
   * True once the caller's team has a complete strategy chain (≥1 Outcome, which implies its parent
   * Objective and Rally Cry). Drives the onboarding gate: a team with an incomplete chain routes
   * authors into the strategy wizard and ICs into the "ask your admin" empty state, and the backend
   * rejects weekly-commit creation with 422 until this flips true. False when the user has no team.
   */
  private boolean strategySetupComplete;
}
