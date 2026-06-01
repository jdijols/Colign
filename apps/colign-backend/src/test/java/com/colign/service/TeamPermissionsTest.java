package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import org.junit.jupiter.api.Test;

class TeamPermissionsTest {

  private static Team team(long leadId) {
    return Team.builder().name("Acme").leadUserId(leadId).build();
  }

  @Test
  void adminMayManage() {
    User admin = User.builder().role(UserRole.ADMIN).build();
    assertThat(TeamPermissions.canManage(admin, team(99))).isTrue();
  }

  @Test
  void managerMayManage() {
    User m = User.builder().role(UserRole.MANAGER).build();
    assertThat(TeamPermissions.canManage(m, team(99))).isTrue();
  }

  @Test
  void icWhoIsLeadMayManage() {
    User lead = User.builder().role(UserRole.IC).build();
    lead.setId(5L);
    assertThat(TeamPermissions.canManage(lead, team(5L))).isTrue();
  }

  @Test
  void icWhoIsNotLeadIsBlocked() {
    User ic = User.builder().role(UserRole.IC).build();
    ic.setId(5L);
    assertThat(TeamPermissions.canManage(ic, team(99L))).isFalse();
  }

  @Test
  void nullsAreBlocked() {
    assertThat(TeamPermissions.canManage(null, team(1L))).isFalse();
    assertThat(TeamPermissions.canManage(User.builder().role(UserRole.MANAGER).build(), null)).isFalse();
  }
}
