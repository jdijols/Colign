package com.colign.config.security;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Thin helper for controllers to read the current JWT principal without
 * threading {@code @AuthenticationPrincipal Jwt} through every signature.
 */
public final class CurrentUser {

    public static final String ROLES_CLAIM = "https://colign.org/roles";

    private CurrentUser() {}

    public static Optional<Jwt> jwt() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(a -> a.isAuthenticated() && a.getPrincipal() instanceof Jwt)
                .map(a -> (Jwt) a.getPrincipal());
    }

    public static Optional<String> email() {
        return jwt().map(j -> j.getClaimAsString("email"));
    }

    public static Optional<String> sub() {
        return jwt().map(Jwt::getSubject);
    }

    public static List<String> roles() {
        return jwt()
                .map(j -> j.getClaimAsStringList(ROLES_CLAIM))
                .orElse(Collections.emptyList());
    }

    public static boolean hasRole(String role) {
        return roles().contains(role);
    }
}
