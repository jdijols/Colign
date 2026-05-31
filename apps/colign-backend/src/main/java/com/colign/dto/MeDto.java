package com.colign.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * The current authenticated user, as the frontend needs them for routing.
 *
 * The pivotal field is {@code teamId}: when null, the user belongs to no team
 * yet and the frontend routes them into the onboarding choice (create / join a
 * team) instead of the weekly-plan app. {@code role} is DERIVED from team
 * relationships server-side (see UserResolver), not read from the JWT — so a
 * user who just gained their first direct report sees MANAGER here immediately,
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
}
