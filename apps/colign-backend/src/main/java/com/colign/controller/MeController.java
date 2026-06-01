package com.colign.controller;

import com.colign.dto.MeDto;
import com.colign.service.UserResolver;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Who am I" endpoint. The frontend calls this immediately after authentication to decide where to
 * route: - teamId == null → onboarding (create / join a team) - teamId present → the weekly-plan
 * app, with role-appropriate nav
 *
 * <p>resolveCurrent() JIT-provisions the user row on first call; the role returned is DERIVED from
 * team relationships, so a freshly-promoted manager is reflected without re-login.
 */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

  private final UserResolver userResolver;

  public MeController(UserResolver userResolver) {
    this.userResolver = userResolver;
  }

  @GetMapping
  public MeDto me() {
    return userResolver.toMeDto(userResolver.resolveCurrent());
  }
}
