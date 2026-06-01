package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.TeamDto;
import com.colign.dto.UpdateTeamRequest;
import com.colign.repository.TeamRepository;
import com.colign.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

  @Mock TeamRepository teams;
  @Mock UserRepository users;
  @InjectMocks TeamService svc;

  private static final long TEAM_ID = 10L;
  private static final long LEAD_ID = 1L;
  private static final long OTHER_ID = 2L;

  private Team team() {
    Team t = Team.builder().name("Acme").leadUserId(LEAD_ID).build();
    t.setId(TEAM_ID);
    return t;
  }

  private User lead() {
    User u = User.builder().email("lead@x").role(UserRole.IC).active(true).build();
    u.setId(LEAD_ID);
    u.setTeamId(TEAM_ID);
    return u;
  }

  private User member(long id) {
    User u = User.builder().email("m" + id + "@x").role(UserRole.IC).active(true).build();
    u.setId(id);
    u.setTeamId(TEAM_ID);
    return u;
  }

  @Test
  void listMembers_returnsAllForCallerOnTeam() {
    when(users.findByTeamId(eq(TEAM_ID), any())).thenReturn(
        new PageImpl<>(List.of(lead(), member(2L), member(3L)))
    );
    var page = svc.listMembers(TEAM_ID, lead(), PageRequest.of(0, 50));
    assertThat(page.getTotalElements()).isEqualTo(3);
  }

  @Test
  void listMembers_throws403_whenCallerNotOnTeam() {
    User outsider = User.builder().role(UserRole.IC).build();
    outsider.setId(99L);
    outsider.setTeamId(999L);
    assertThatThrownBy(() -> svc.listMembers(TEAM_ID, outsider, PageRequest.of(0, 50)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
  }

  @Test
  void updateTeam_renamesWhenLeadIsCaller() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(teams.save(any())).thenAnswer(inv -> inv.getArgument(0));

    TeamDto out = svc.updateTeam(TEAM_ID, lead(), new UpdateTeamRequest("Acme, Inc.", null, null));
    assertThat(out.name()).isEqualTo("Acme, Inc.");
  }

  @Test
  void updateTeam_throws403_whenCallerCannotManage() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    User ic = User.builder().role(UserRole.IC).build();
    ic.setId(OTHER_ID);
    ic.setTeamId(TEAM_ID);
    assertThatThrownBy(() -> svc.updateTeam(TEAM_ID, ic, new UpdateTeamRequest("x", null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
  }

  @Test
  void updateTeam_rejectsBlankName() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    assertThatThrownBy(() -> svc.updateTeam(TEAM_ID, lead(), new UpdateTeamRequest("   ", null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
  }

  @Test
  void updateTeam_throws404_whenTeamMissing() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> svc.updateTeam(TEAM_ID, lead(), new UpdateTeamRequest("x", null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("404");
  }
}
