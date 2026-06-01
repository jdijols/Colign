package com.colign.controller;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.dto.CreateInvitationRequest;
import com.colign.dto.CreateTeamRequest;
import com.colign.dto.InvitationDto;
import com.colign.dto.MeDto;
import com.colign.dto.TeamDto;
import com.colign.dto.TeamMemberDto;
import com.colign.dto.UpdateTeamRequest;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import com.colign.service.InvitationService;
import com.colign.service.TeamService;
import com.colign.service.UserResolver;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Team lifecycle. v1 is deliberately thin: create a team (the onboarding
 * unblock), then invite teammates. The creator becomes the team lead and its
 * first member; they stay IC until their first REPORT invitation is accepted,
 * because role is DERIVED from team relationships (see
 * {@code UserResolver.derivedRole}), not stored.
 */
@RestController
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final UserResolver userResolver;
    private final TeamRepository teams;
    private final UserRepository users;
    private final InvitationService invitations;
    private final TeamService teamService;

    public TeamController(
            UserResolver userResolver,
            TeamRepository teams,
            UserRepository users,
            InvitationService invitations,
            TeamService teamService) {
        this.userResolver = userResolver;
        this.teams = teams;
        this.users = users;
        this.invitations = invitations;
        this.teamService = teamService;
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

    /**
     * Invite a teammate by email. Any member of the team may invite (the role
     * the inviter takes on the resulting relationship is decided here too —
     * REPORT means "I'll be their manager", PEER means "we're peers"). The
     * email send is synchronous; if it fails we 502 rather than leave a row
     * the recipient never hears about.
     */
    @PostMapping("/{teamId}/invitations")
    public ResponseEntity<InvitationDto> invite(
            @PathVariable Long teamId,
            @Valid @RequestBody CreateInvitationRequest req) {
        User me = userResolver.resolveCurrent();
        InvitationDto dto = invitations.create(teamId, req.email(), req.relationship(), me);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * List invitations for the team, newest first. Used by the post-create
     * "invite teammates" screen so the inviter can see pending invites at a
     * glance.
     */
    @GetMapping("/{teamId}/invitations")
    public List<InvitationDto> list(@PathVariable Long teamId) {
        User me = userResolver.resolveCurrent();
        return invitations.listForTeam(teamId, me);
    }

    /** Workspace member roster. Any member may read; cap page size at 2000 per brief. */
    @GetMapping("/{teamId}/members")
    public Page<TeamMemberDto> members(
            @PathVariable Long teamId,
            @PageableDefault(size = 50, sort = "displayName", direction = Sort.Direction.ASC) Pageable pageable) {
        User me = userResolver.resolveCurrent();
        Pageable capped = PageRequest.of(
                pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), 2000),
                pageable.getSort());
        return teamService.listMembers(teamId, me, capped).map(u -> new TeamMemberDto(
                u.getId(), u.getEmail(), u.getDisplayName(),
                userResolver.derivedRole(u).name(),
                u.getAvatarUrl(),
                null /* currentPlan — not needed in the workspace roster; ManagerController serves the roll-up */
        ));
    }

    /** Rename / set description / set avatar URL. Permission-gated in TeamService. */
    @PatchMapping("/{teamId}")
    public TeamDto update(
            @PathVariable Long teamId,
            @Valid @RequestBody UpdateTeamRequest req) {
        User me = userResolver.resolveCurrent();
        return teamService.updateTeam(teamId, me, req);
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long teamId,
            @PathVariable Long userId) {
        User me = userResolver.resolveCurrent();
        teamService.removeMember(teamId, userId, me);
        return ResponseEntity.noContent().build();
    }

    /** Read the team profile. Any team member may call; ADMIN bypasses team membership. */
    @GetMapping("/{teamId}")
    public TeamDto get(@PathVariable Long teamId) {
        User me = userResolver.resolveCurrent();
        Team t = teams.findById(teamId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "team not found"));
        if (me.getRole() != com.colign.domain.UserRole.ADMIN) {
            if (me.getTeamId() == null || !me.getTeamId().equals(teamId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not a member of this team");
            }
        }
        return teamService.toDto(t);
    }
}
