package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.colign.config.exception.IllegalTransitionException;
import com.colign.config.exception.NotFoundException;
import com.colign.domain.DefiningObjective;
import com.colign.domain.Outcome;
import com.colign.domain.Plan;
import com.colign.domain.PlanState;
import com.colign.domain.RallyCry;
import com.colign.domain.WeeklyCommit;
import com.colign.dto.PlanDto;
import com.colign.repository.ChessTagRepository;
import com.colign.repository.DefiningObjectiveRepository;
import com.colign.repository.OutcomeRepository;
import com.colign.repository.PlanRepository;
import com.colign.repository.RallyCryRepository;
import com.colign.repository.ReconciliationRepository;
import com.colign.repository.WeeklyCommitRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanServiceTest {

  @Mock PlanRepository plans;
  @Mock WeeklyCommitRepository commits;
  @Mock OutcomeRepository outcomes;
  @Mock ChessTagRepository chessTags;
  @Mock ReconciliationRepository reconciliations;
  @Mock DefiningObjectiveRepository definingObjectives;
  @Mock RallyCryRepository rallyCries;
  @InjectMocks PlanService svc;

  private static final long PLAN_ID = 42L;
  private static final long USER_ID = 7L;

  private Plan draftPlan() {
    Plan p =
        Plan.builder()
            .userId(USER_ID)
            .weekStartDate(LocalDate.of(2026, 6, 1))
            .state(PlanState.DRAFT)
            .build();
    p.setId(PLAN_ID);
    return p;
  }

  @Test
  void lock_throws409_whenPlanIsNotDraft() {
    Plan locked = draftPlan();
    locked.setState(PlanState.LOCKED);
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(locked));

    assertThatThrownBy(() -> svc.lock(PLAN_ID))
        .isInstanceOf(IllegalTransitionException.class)
        .hasMessageContaining("lock only valid from DRAFT");
  }

  @Test
  void lock_throws409_whenPlanIsEmpty() {
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(draftPlan()));
    when(commits.countByPlanId(PLAN_ID)).thenReturn(0);

    assertThatThrownBy(() -> svc.lock(PLAN_ID))
        .isInstanceOf(IllegalTransitionException.class)
        .hasMessageContaining("cannot lock an empty plan");
  }

  @Test
  void lock_throws409_whenAnyCommitIsMissingOutcome() {
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(draftPlan()));
    when(commits.countByPlanId(PLAN_ID)).thenReturn(3);
    when(commits.countByPlanIdAndOutcomeIdIsNull(PLAN_ID)).thenReturn(2L);

    assertThatThrownBy(() -> svc.lock(PLAN_ID))
        .isInstanceOf(IllegalTransitionException.class)
        .hasMessageContaining("2 commit(s) missing outcome link");
  }

  @Test
  void lock_transitionsToLocked_whenAllCommitsHaveOutcome() {
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(draftPlan()));
    when(commits.countByPlanId(PLAN_ID)).thenReturn(3);
    when(commits.countByPlanIdAndOutcomeIdIsNull(PLAN_ID)).thenReturn(0L);
    when(plans.save(any(Plan.class))).thenAnswer(inv -> inv.getArgument(0));

    Plan result = svc.lock(PLAN_ID);

    assertThat(result.getState()).isEqualTo(PlanState.LOCKED);
    assertThat(result.getLockedAt()).isNotNull();
  }

  @Test
  void getById_throws404_whenPlanMissing() {
    when(plans.findById(PLAN_ID)).thenReturn(Optional.empty());
    assertThatThrownBy(() -> svc.getById(PLAN_ID)).isInstanceOf(NotFoundException.class);
  }

  @Test
  void toDto_populatesRcdoPathForEveryCommit() {
    // Build a minimal RCDO tree: RallyCry → DefiningObjective → Outcome
    RallyCry rc = RallyCry.builder().title("Ship faster, support stronger").build();
    rc.setId(1L);
    DefiningObjective ob = DefiningObjective.builder().rallyCryId(1L).title("Cut p95").build();
    ob.setId(10L);
    Outcome outcome =
        Outcome.builder()
            .definingObjectiveId(10L)
            .title("Migrate auth")
            .priorityTier("P0")
            .metricType("BOOLEAN")
            .status("ACTIVE")
            .build();
    outcome.setId(100L);

    WeeklyCommit c =
        WeeklyCommit.builder().planId(PLAN_ID).outcomeId(100L).title("Wire it").ordinal(0).build();
    c.setId(1000L);

    Plan plan = draftPlan();
    when(commits.findByPlanIdOrderByOrdinalAsc(PLAN_ID)).thenReturn(List.of(c));
    when(outcomes.findById(100L)).thenReturn(Optional.of(outcome));
    when(definingObjectives.findAllById(List.of(10L))).thenReturn(List.of(ob));
    when(rallyCries.findAllById(List.of(1L))).thenReturn(List.of(rc));

    PlanDto dto = svc.toDto(plan);

    assertThat(dto.commits()).hasSize(1);
    assertThat(dto.commits().get(0).outcomeTitle()).isEqualTo("Migrate auth");
    assertThat(dto.commits().get(0).definingObjectiveTitle()).isEqualTo("Cut p95");
    assertThat(dto.commits().get(0).rallyCryTitle()).isEqualTo("Ship faster, support stronger");
  }

  @Test
  void toDto_leavesRcdoTitlesNullWhenLookupsFail() {
    // Outcome row missing → no DO/RC traversal possible.
    WeeklyCommit c =
        WeeklyCommit.builder().planId(PLAN_ID).outcomeId(999L).title("Orphan").ordinal(0).build();
    c.setId(2000L);

    Plan plan = draftPlan();
    when(commits.findByPlanIdOrderByOrdinalAsc(PLAN_ID)).thenReturn(List.of(c));
    when(outcomes.findById(999L)).thenReturn(Optional.empty());

    PlanDto dto = svc.toDto(plan);

    assertThat(dto.commits()).hasSize(1);
    assertThat(dto.commits().get(0).outcomeTitle()).isNull();
    assertThat(dto.commits().get(0).definingObjectiveTitle()).isNull();
    assertThat(dto.commits().get(0).rallyCryTitle()).isNull();
  }
}
