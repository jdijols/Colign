package com.colign.service;

import com.colign.config.security.CurrentUser;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.repository.InvitationRepository;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves (and lazily provisions) the domain {@link User} for the current JWT
 * principal.
 *
 * Identity key is the Auth0 {@code sub} — stable and always present, unlike
 * email (which arrives via a custom claim and could in principle change). Keying
 * by sub avoids duplicate rows when, e.g., a user was first seen before the
 * profile-claims Action existed (synthetic "<sub>@local" email) and later logs
 * in with their real email.
 *
 * On every resolve we backfill profile fields (displayName / email / avatar)
 * from the current token when it carries better data, so a stale row created
 * before the Auth0 Action was deployed self-heals on the next login.
 */
@Component
public class UserResolver {

    /**
     * Namespace for custom claims copied into the ACCESS token by the Auth0
     * Post-Login Action (OIDC profile fields live only in the ID token by
     * default). Mock-mode tokens put {@code email} at the top level, so every
     * lookup also falls back to the bare claim.
     */
    private static final String NS = "https://colign.org/";

    private final UserRepository users;
    private final InvitationRepository invitations;
    private final TeamRepository teams;
    private final String defaultRole;

    public UserResolver(UserRepository users,
                        InvitationRepository invitations,
                        TeamRepository teams,
                        @Value("${colign.users.default-role:IC}") String defaultRole) {
        this.users = users;
        this.invitations = invitations;
        this.teams = teams;
        this.defaultRole = defaultRole;
    }

    @Transactional
    public User resolveCurrent() {
        Jwt jwt = CurrentUser.jwt()
                .orElseThrow(() -> new IllegalStateException("No JWT in security context"));
        String sub = jwt.getSubject();

        // Prefer lookup by stable sub; fall back to email for any legacy row
        // that predates auth0_sub being stored.
        User existing = users.findByAuth0Sub(sub)
                .or(() -> users.findByEmail(resolveEmail(jwt)))
                .orElse(null);

        if (existing != null) {
            return backfill(existing, jwt, sub);
        }
        return provision(jwt, sub);
    }

    /** Update stored profile from the token when it carries better values. */
    private User backfill(User user, Jwt jwt, String sub) {
        boolean dirty = false;

        if (user.getAuth0Sub() == null && sub != null) {
            user.setAuth0Sub(sub);
            dirty = true;
        }
        String name = resolveName(jwt);
        if (name != null && !name.equals(user.getDisplayName())) {
            user.setDisplayName(name);
            dirty = true;
        }
        String email = resolveEmail(jwt);
        // Only overwrite a synthetic "<sub>@local" placeholder with a real email.
        if (email != null && !email.endsWith("@local")
                && !email.equals(user.getEmail())) {
            user.setEmail(email);
            dirty = true;
        }
        String picture = resolvePicture(jwt);
        if (picture != null && !picture.equals(user.getAvatarUrl())) {
            user.setAvatarUrl(picture);
            dirty = true;
        }
        return dirty ? users.save(user) : user;
    }

    private User provision(Jwt jwt, String sub) {
        // Everyone starts IC. Effective role is DERIVED at read time
        // (see derivedRole) from team relationships — a user becomes MANAGER the
        // instant someone reports to them, with no re-login. The stored field is
        // only authoritative for the explicit ADMIN (instance operator) case.
        String email = resolveEmail(jwt);
        String name = resolveName(jwt);
        User u = User.builder()
                .email(email)
                .displayName(name != null ? name : displayNameFallback(email))
                .avatarUrl(resolvePicture(jwt))
                .role(UserRole.valueOf(defaultRole))
                .auth0Sub(sub)
                .active(true)
                .build();
        return users.save(u);
    }

    /**
     * Maps a User to the identity shape the frontend routes on. Shared by
     * GET /me and POST /teams so a single response can re-route the client.
     * Role is the DERIVED role, never the stored field.
     */
    public com.colign.dto.MeDto toMeDto(User user) {
        Long teamId = user.getTeamId();
        String teamName = null, teamAvatarUrl = null;
        if (teamId != null) {
            Team t = teams.findById(teamId).orElse(null);
            if (t != null) {
                teamName = t.getName();
                teamAvatarUrl = t.getAvatarUrl();
            }
        }
        return com.colign.dto.MeDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(derivedRole(user).name())
                .teamId(teamId)
                .managerId(user.getManagerId())
                .needsInvite(needsInvite(teamId))
                .teamName(teamName)
                .teamAvatarUrl(teamAvatarUrl)
                .build();
    }

    /**
     * Whether a freshly-created team still needs its first invite. True only
     * when the user is on a team that has exactly one member (them) AND no
     * invitations have been issued yet. As soon as they send one invite, or
     * anyone else joins, this flips false and the onboarding gate lets them
     * into the app. An invited member never sees true — their team already
     * has &gt;1 person by the time they resolve.
     */
    private boolean needsInvite(Long teamId) {
        if (teamId == null) return false;
        return users.countByTeamId(teamId) <= 1 && invitations.countByTeamId(teamId) == 0;
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

    // --- claim helpers (namespaced first for real Auth0, bare for mock) -------

    private String resolveEmail(Jwt jwt) {
        String email = firstNonBlank(
                jwt.getClaimAsString(NS + "email"),
                jwt.getClaimAsString("email"));
        if (email != null) return email;
        String sub = jwt.getSubject();
        return (sub != null ? sub : "anonymous") + "@local";
    }

    private String resolveName(Jwt jwt) {
        return firstNonBlank(
                jwt.getClaimAsString(NS + "name"),
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("nickname"));
    }

    private String resolvePicture(Jwt jwt) {
        return firstNonBlank(
                jwt.getClaimAsString(NS + "picture"),
                jwt.getClaimAsString("picture"));
    }

    /** Local-part of the email, guarding the synthetic "<sub>@local" form. */
    private String displayNameFallback(String email) {
        int at = email.indexOf('@');
        String local = at > 0 ? email.substring(0, at) : email;
        return local.contains("|") ? "there" : local;
    }

    private static String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
