package com.colign.service;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.TeamDto;
import com.colign.dto.UpdateTeamRequest;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Workspace-management operations: list members, update team profile, remove
 * a member (PR 3). Permissions follow {@link TeamPermissions}; same-team
 * membership is checked here, not in the controller, so reuse from other
 * services stays safe.
 */
@Service
public class TeamService {

  private final TeamRepository teams;
  private final UserRepository users;

  public TeamService(TeamRepository teams, UserRepository users) {
    this.teams = teams;
    this.users = users;
  }

  /** All members of the team. Any team member may call (ADMIN bypasses). Paginated. */
  @Transactional(readOnly = true)
  public Page<User> listMembers(Long teamId, User caller, Pageable pageable) {
    requireSameTeam(teamId, caller);
    return users.findByTeamId(teamId, pageable);
  }

  /**
   * Apply only non-null fields. Trim+reject-blank for name. Caller must
   * satisfy {@link TeamPermissions#canManage}. Returns the updated DTO so the
   * FE doesn't need a follow-up GET.
   */
  @Transactional
  public TeamDto updateTeam(Long teamId, User caller, UpdateTeamRequest req) {
    Team t = teams.findById(teamId).orElseThrow(
        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "team not found"));
    if (!TeamPermissions.canManage(caller, t)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only managers may update the team");
    }
    if (req.name() != null) {
      String trimmed = req.name().trim();
      if (trimmed.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name cannot be blank");
      }
      t.setName(trimmed);
    }
    if (req.description() != null) {
      String trimmed = req.description().trim();
      t.setDescription(trimmed.isEmpty() ? null : trimmed);
    }
    if (req.avatarUrl() != null) {
      String trimmed = req.avatarUrl().trim();
      t.setAvatarUrl(trimmed.isEmpty() ? null : trimmed);
    }
    Team saved = teams.save(t);
    return toDto(saved);
  }

  /** DTO mapping. Avatar field provisioned by V5 in Task 2.0 — direct getter. */
  public TeamDto toDto(Team t) {
    return new TeamDto(
        t.getId(), t.getName(), t.getDescription(),
        t.getAvatarUrl(), t.getLeadUserId());
  }

  private void requireSameTeam(Long teamId, User caller) {
    if (caller.getRole() == UserRole.ADMIN) return; // ADMINs cross-team
    if (caller.getTeamId() == null || !caller.getTeamId().equals(teamId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not a member of this team");
    }
  }
}
