package com.colign.config.audit;

import java.util.Optional;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Returns the current actor for {@code @CreatedBy} / {@code @LastModifiedBy}. Order: Auth0 JWT
 * email claim → JWT sub → "system" fallback.
 */
@Component("auditorAware")
public class AuditorAwareImpl implements AuditorAware<String> {

  public static final String SYSTEM = "system";

  @Override
  public Optional<String> getCurrentAuditor() {
    return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
        .filter(a -> a.isAuthenticated() && a.getPrincipal() instanceof Jwt)
        .map(a -> (Jwt) a.getPrincipal())
        .map(
            jwt ->
                jwt.getClaimAsString("email") != null
                    ? jwt.getClaimAsString("email")
                    : jwt.getSubject())
        .or(() -> Optional.of(SYSTEM));
  }
}
