package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.colign.domain.DefiningObjective;
import com.colign.domain.Outcome;
import com.colign.domain.RallyCry;
import com.colign.domain.Team;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.CreateDefiningObjectiveRequest;
import com.colign.dto.CreateOutcomeRequest;
import com.colign.dto.CreateRallyCryRequest;
import com.colign.dto.RallyCryDto;
import com.colign.repository.DefiningObjectiveRepository;
import com.colign.repository.OutcomeRepository;
import com.colign.repository.RallyCryRepository;
import com.colign.repository.TeamRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class StrategyServiceTest {

  @Mock RallyCryRepository rallyCries;
  @Mock DefiningObjectiveRepository definingObjectives;
  @Mock OutcomeRepository outcomes;
  @Mock TeamRepository teams;
  @Mock UserResolver userResolver;
  @InjectMocks StrategyService svc;

  private static final long TEAM_ID = 10L;
  private static final long OTHER_TEAM_ID = 20L;
  private static final long LEAD_ID = 1L;
  private static final long IC_ID = 2L;

  private Team team() {
    Team t = Team.builder().name("Acme").leadUserId(LEAD_ID).build();
    t.setId(TEAM_ID);
    return t;
  }

  private User user(long id, long teamId) {
    User u = User.builder().email("u" + id + "@x").role(UserRole.IC).active(true).build();
    u.setId(id);
    u.setTeamId(teamId);
    return u;
  }

  // ---------- strategySetupComplete ----------

  @Test
  void setupComplete_falseWhenNoTeam() {
    assertThat(svc.isStrategySetupComplete(null)).isFalse();
    verify(outcomes, never()).existsByTeamId(any());
  }

  @Test
  void setupComplete_reflectsOutcomeExistence() {
    when(outcomes.existsByTeamId(TEAM_ID)).thenReturn(false, true);
    assertThat(svc.isStrategySetupComplete(TEAM_ID)).isFalse();
    assertThat(svc.isStrategySetupComplete(TEAM_ID)).isTrue();
  }

  // ---------- Rally Cry authorization ----------

  @Test
  void createRallyCry_succeeds_forManager() {
    User mgr = user(IC_ID, TEAM_ID);
    when(userResolver.derivedRole(mgr)).thenReturn(UserRole.MANAGER);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(rallyCries.save(any())).thenAnswer(i -> i.getArgument(0));

    RallyCryDto dto = svc.createRallyCry(mgr, new CreateRallyCryRequest("Win Q3", null, null, null));

    assertThat(dto.teamId()).isEqualTo(TEAM_ID);
    assertThat(dto.title()).isEqualTo("Win Q3");
    assertThat(dto.status()).isEqualTo("ACTIVE");
  }

  @Test
  void createRallyCry_succeeds_forTeamLeadEvenWhenDerivedIC() {
    User lead = user(LEAD_ID, TEAM_ID);
    when(userResolver.derivedRole(lead)).thenReturn(UserRole.IC);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(rallyCries.save(any())).thenAnswer(i -> i.getArgument(0));

    RallyCryDto dto = svc.createRallyCry(lead, new CreateRallyCryRequest("Win Q3", null, null, null));
    assertThat(dto.teamId()).isEqualTo(TEAM_ID);
  }

  @Test
  void createRallyCry_403_forPlainIC() {
    User ic = user(IC_ID, TEAM_ID);
    when(userResolver.derivedRole(ic)).thenReturn(UserRole.IC);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team())); // lead != ic

    assertThatThrownBy(
            () -> svc.createRallyCry(ic, new CreateRallyCryRequest("x", null, null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
    verify(rallyCries, never()).save(any());
  }

  @Test
  void createRallyCry_succeeds_forAdmin() {
    User admin = user(99L, TEAM_ID);
    when(userResolver.derivedRole(admin)).thenReturn(UserRole.ADMIN);
    when(rallyCries.save(any())).thenAnswer(i -> i.getArgument(0));

    RallyCryDto dto =
        svc.createRallyCry(admin, new CreateRallyCryRequest("Win Q3", null, null, null));
    assertThat(dto.teamId()).isEqualTo(TEAM_ID);
  }

  @Test
  void createRallyCry_409_whenCallerHasNoTeam() {
    User u = User.builder().email("z@x").role(UserRole.IC).active(true).build();
    u.setId(5L); // no teamId
    assertThatThrownBy(() -> svc.createRallyCry(u, new CreateRallyCryRequest("x", null, null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("409");
  }

  // ---------- team inheritance + cross-team isolation ----------

  @Test
  void createDefiningObjective_inheritsTeamFromParentRallyCry() {
    User mgr = user(IC_ID, TEAM_ID);
    RallyCry rc = RallyCry.builder().title("RC").teamId(TEAM_ID).build();
    rc.setId(50L);
    when(definingObjectives.save(any())).thenAnswer(i -> i.getArgument(0));
    when(rallyCries.findById(50L)).thenReturn(Optional.of(rc));
    when(userResolver.derivedRole(mgr)).thenReturn(UserRole.MANAGER);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));

    var dto =
        svc.createDefiningObjective(mgr, new CreateDefiningObjectiveRequest(50L, "Objective", null));
    assertThat(dto.teamId()).isEqualTo(TEAM_ID);
    assertThat(dto.rallyCryId()).isEqualTo(50L);
  }

  @Test
  void createDefiningObjective_403_whenManagerOfDifferentTeam() {
    User mgr = user(IC_ID, OTHER_TEAM_ID); // caller on team 20
    RallyCry rc = RallyCry.builder().title("RC").teamId(TEAM_ID).build(); // parent on team 10
    rc.setId(50L);
    when(rallyCries.findById(50L)).thenReturn(Optional.of(rc));
    when(userResolver.derivedRole(mgr)).thenReturn(UserRole.MANAGER);

    assertThatThrownBy(
            () ->
                svc.createDefiningObjective(
                    mgr, new CreateDefiningObjectiveRequest(50L, "Objective", null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("403");
    verify(definingObjectives, never()).save(any());
  }

  @Test
  void createOutcome_inheritsTeamFromParentObjective() {
    User mgr = user(IC_ID, TEAM_ID);
    DefiningObjective parent = DefiningObjective.builder().rallyCryId(50L).teamId(TEAM_ID).build();
    parent.setId(60L);
    when(definingObjectives.findById(60L)).thenReturn(Optional.of(parent));
    when(userResolver.derivedRole(mgr)).thenReturn(UserRole.MANAGER);
    when(teams.findById(TEAM_ID)).thenReturn(Optional.of(team()));
    when(outcomes.save(any())).thenAnswer(i -> i.getArgument(0));
    lenient().when(rallyCries.findById(50L)).thenReturn(Optional.empty());

    var dto =
        svc.createOutcome(
            mgr, new CreateOutcomeRequest(60L, "Hit 99% uptime", null, null, null, null, "P0", null));
    assertThat(dto.id()).isNull(); // not persisted with an id in this unit test
    assertThat(dto.title()).isEqualTo("Hit 99% uptime");

    // Assert the saved Outcome carried the inherited team + tier
    verify(outcomes)
        .save(
            org.mockito.ArgumentMatchers.argThat(
                o -> TEAM_ID == o.getTeamId() && "P0".equals(o.getPriorityTier())));
  }

  @Test
  void createOutcome_404_whenParentObjectiveMissing() {
    User mgr = user(IC_ID, TEAM_ID);
    when(definingObjectives.findById(60L)).thenReturn(Optional.empty());
    assertThatThrownBy(
            () ->
                svc.createOutcome(
                    mgr,
                    new CreateOutcomeRequest(60L, "x", null, null, null, null, null, null)))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("404");
  }
}
