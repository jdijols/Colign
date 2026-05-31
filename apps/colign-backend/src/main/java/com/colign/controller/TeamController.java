package com.colign.controller;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.dto.CreateTeamRequest;
import com.colign.dto.MeDto;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.UserResolver;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Team lifecycle. v1 is deliberately thin: create a team (the onboarding
 * unblock). The creator becomes the team lead and its first member; they stay
 * IC until they invite a direct report, because role is DERIVED from team
 * relationships (see UserResolver.derivedRole), not stored.
 */
@RestController
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final UserResolver userResolver;
    private final TeamRepository teams;
    private final UserRepository users;

    public TeamController(UserResolver userResolver, TeamRepository teams, UserRepository users) {
        this.userResolver = userResolver;
        this.teams = teams;
        this.users = users;
    }

    /**
     * Create a team and attach the caller to it as lead. Returns the caller's
     * refreshed identity (same shape as GET /me) so the frontend re-routes
     * straight into the app off a single response — no second round trip.
     *
     * One team per user in v1: if the caller already belongs to a team we 409
     * rather than silently orphaning their old membership.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<MeDto> create(@Valid @RequestBody CreateTeamRequest req) {
        User me = userResolver.resolveCurrent();
        if (me.getTeamId() != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        Team team = Team.builder()
                .name(req.name().trim())
                .description(req.description() == null || req.description().isBlank()
                        ? null : req.description().trim())
                .leadUserId(me.getId())
                .build();
        team = teams.save(team);

        me.setTeamId(team.getId());
        users.save(me);

        return ResponseEntity.status(HttpStatus.CREATED).body(userResolver.toMeDto(me));
    }
}
