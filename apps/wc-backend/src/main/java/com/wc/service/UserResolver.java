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
        // Everyone starts IC. Effective role is DERIVED at read time (see
        // derivedRole) from team relationships — a user becomes MANAGER the
        // instant someone reports to them, with no re-login. The stored field
        // is only authoritative for the explicit ADMIN (instance operator) case.
        Jwt jwt = CurrentUser.jwt().orElse(null);
        User u = User.builder()
                .email(email)
                .displayName(resolveDisplayName(jwt, email))
                .avatarUrl(jwt != null ? jwt.getClaimAsString("picture") : null)
                .role(UserRole.valueOf(defaultRole))
                .auth0Sub(sub)
                .active(true)
                .build();
        return users.save(u);
    }

    /**
     * The user's EFFECTIVE role, derived from relationships rather than read
     * from the stored field or the JWT claim:
     *   - ADMIN   if explicitly flagged ADMIN in the DB (instance operator)
     *   - MANAGER if anyone reports to them (managerId == this user)
     *   - IC      otherwise
     */
    public UserRole derivedRole(User user) {
        if (user.getRole() == UserRole.ADMIN) return UserRole.ADMIN;
        long reports = users.countByManagerId(user.getId());
        return reports > 0 ? UserRole.MANAGER : UserRole.IC;
    }

    private String resolveDisplayName(Jwt jwt, String email) {
        if (jwt != null) {
            String name = jwt.getClaimAsString("name");
            if (name != null && !name.isBlank()) return name;
            String nickname = jwt.getClaimAsString("nickname");
            if (nickname != null && !nickname.isBlank()) return nickname;
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }
}
