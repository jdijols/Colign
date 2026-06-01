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

  @Test
  void removeMember_succeeds_andOrphanReports() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    User manager = member(2L); manager.setRole(UserRole.IC);
    when(users.findById(2L)).thenReturn(Optional.of(manager));
    User report1 = member(3L); report1.setManagerId(2L);
    User report2 = member(4L); report2.setManagerId(2L);
    when(users.findByManagerId(2L)).thenReturn(List.of(report1, report2));
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

    svc.removeMember(TEAM_ID, 2L, lead());

    assertThat(report1.getManagerId()).isNull();
    assertThat(report2.getManagerId()).isNull();
    assertThat(manager.getTeamId()).isNull();
    assertThat(manager.getManagerId()).isNull();
  }

  @Test
  void removeMember_blocksRemovingTheLead() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(users.findById(LEAD_ID)).thenReturn(Optional.of(lead()));
    User admin = User.builder().role(UserRole.ADMIN).build();
    admin.setId(99L); admin.setTeamId(TEAM_ID);
    assertThatThrownBy(() -> svc.removeMember(TEAM_ID, LEAD_ID, admin))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
  }

  @Test
  void removeMember_blocksLeadFromLeavingThemselves() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(users.findById(LEAD_ID)).thenReturn(Optional.of(lead()));
    assertThatThrownBy(() -> svc.removeMember(TEAM_ID, LEAD_ID, lead()))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("400");
  }

  @Test
  void removeMember_allowsSelfRemovalForNonLead() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    User ic = member(2L);
    when(users.findById(2L)).thenReturn(Optional.of(ic));
    when(users.findByManagerId(2L)).thenReturn(List.of());
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

    svc.removeMember(TEAM_ID, 2L, ic);
    assertThat(ic.getTeamId()).isNull();
  }

  @Test
  void removeMember_throws403_whenCallerCannotManageAndIsNotSelf() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    User ic = member(2L);
    User other = member(3L);
    when(users.findById(3L)).thenReturn(Optional.of(other));
    assertThatThrownBy(() -> svc.removeMember(TEAM_ID, 3L, ic))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
  }

  @Test
  void removeMember_throws404_whenUserNotOnTeam() {
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    User outsider = User.builder().role(UserRole.IC).build();
    outsider.setId(99L);
    outsider.setTeamId(999L);
    when(users.findById(99L)).thenReturn(Optional.of(outsider));
    assertThatThrownBy(() -> svc.removeMember(TEAM_ID, 99L, lead()))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("404");
  }
}
