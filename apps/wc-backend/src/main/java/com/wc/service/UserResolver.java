package com.wc.service;

import com.wc.config.security.CurrentUser;
import com.wc.domain.User;
import com.wc.domain.UserRole;
import com.wc.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lazy-provision a domain {@link User} from the JWT principal the first time
 * we see them. Keeps the demo flowing without a separate user-onboarding step.
 *
 * Production hardening would add: invite-only flag, manager linkage, team
 * membership via separate join table, soft-delete on deactivation.
 */
@Component
public class UserResolver {

    private final UserRepository users;
    private final String defaultRole;

    public UserResolver(UserRepository users,
                        @Value("${wc.users.default-role:IC}") String defaultRole) {
        this.users = users;
        this.defaultRole = defaultRole;
    }

    @Transactional
    public User resolveCurrent() {
        Jwt jwt = CurrentUser.jwt()
                .orElseThrow(() -> new IllegalStateException("No JWT in security context"));
        String email = jwt.getClaimAsString("email");
        String sub = jwt.getSubject();
        if (email == null || email.isBlank()) {
            email = (sub != null ? sub : "anonymous") + "@local";
        }
        String emailFinal = email;
        return users.findByEmail(email)
                .orElseGet(() -> provision(emailFinal, sub));
    }

    private User provision(String email, String sub) {
        UserRole role = CurrentUser.hasRole("MANAGER") ? UserRole.MANAGER
                : CurrentUser.hasRole("ADMIN") ? UserRole.ADMIN
                : UserRole.valueOf(defaultRole);
        User u = User.builder()
                .email(email)
                .displayName(email.split("@")[0])
                .role(role)
                .auth0Sub(sub)
                .active(true)
                .build();
        return users.save(u);
    }
}
