package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.colign.config.exception.IllegalTransitionException;
import com.colign.config.exception.NotFoundException;
import com.colign.domain.Plan;
import com.colign.domain.PlanState;
import com.colign.repository.ChessTagRepository;
import com.colign.repository.OutcomeRepository;
import com.colign.repository.PlanRepository;
import com.colign.repository.ReconciliationRepository;
import com.colign.repository.WeeklyCommitRepository;
import java.time.LocalDate;
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
}
