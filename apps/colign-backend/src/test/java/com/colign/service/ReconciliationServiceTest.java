package com.colign.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.colign.config.exception.IllegalTransitionException;
import com.colign.domain.CommitStatus;
import com.colign.domain.Plan;
import com.colign.domain.PlanState;
import com.colign.domain.Reconciliation;
import com.colign.domain.WeeklyCommit;
import com.colign.repository.PlanRepository;
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
class ReconciliationServiceTest {

  @Mock PlanRepository plans;
  @Mock WeeklyCommitRepository commits;
  @Mock ReconciliationRepository reconciliations;
  @InjectMocks ReconciliationService svc;

  private static final long PLAN_ID = 100L;
  private static final long USER_ID = 9L;

  private Plan reconcilingPlan() {
    Plan p =
        Plan.builder()
            .userId(USER_ID)
            .weekStartDate(LocalDate.of(2026, 6, 1))
            .state(PlanState.RECONCILING)
            .build();
    p.setId(PLAN_ID);
    return p;
  }

  private WeeklyCommit commit(long id, CommitStatus status) {
    WeeklyCommit c =
        WeeklyCommit.builder()
            .planId(PLAN_ID)
            .outcomeId(1L)
            .title("c" + id)
            .ordinal((int) id)
            .status(status)
            .build();
    c.setId(id);
    return c;
  }

  @Test
  void finalize_throws_whenPlanIsNotReconciling() {
    Plan draft = reconcilingPlan();
    draft.setState(PlanState.DRAFT);
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(draft));

    assertThatThrownBy(() -> svc.finalizeReconciliation(PLAN_ID))
        .isInstanceOf(IllegalTransitionException.class)
        .hasMessageContaining("finalize-reconciliation only valid from RECONCILING");
  }

  @Test
  void finalize_throws_whenAnyCommitMissingReconciliationRow() {
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(reconcilingPlan()));
    when(commits.findByPlanIdOrderByOrdinalAsc(PLAN_ID))
        .thenReturn(List.of(commit(1L, CommitStatus.DONE), commit(2L, CommitStatus.DONE)));
    when(reconciliations.findByWeeklyCommitId(1L))
        .thenReturn(Optional.of(Reconciliation.builder().weeklyCommitId(1L).build()));
    when(reconciliations.findByWeeklyCommitId(2L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> svc.finalizeReconciliation(PLAN_ID))
        .isInstanceOf(IllegalTransitionException.class)
        .hasMessageContaining("every commit must be reconciled");
  }

  @Test
  void finalize_transitionsToReconciled_andSkipsCarryForwardWhenNoMissed() {
    Plan plan = reconcilingPlan();
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
    List<WeeklyCommit> doneCommits =
        List.of(commit(1L, CommitStatus.DONE), commit(2L, CommitStatus.DONE));
    when(commits.findByPlanIdOrderByOrdinalAsc(PLAN_ID)).thenReturn(doneCommits);
    when(reconciliations.findByWeeklyCommitId(anyLong()))
        .thenReturn(Optional.of(Reconciliation.builder().build()));
    when(plans.save(any(Plan.class))).thenAnswer(inv -> inv.getArgument(0));

    Plan result = svc.finalizeReconciliation(PLAN_ID);

    assertThat(result.getState()).isEqualTo(PlanState.RECONCILED);
    assertThat(result.getReconciledAt()).isNotNull();
    // No MISSED commits → no next-plan lookup, no carry-forward save.
    verify(plans, never()).findByUserIdAndWeekStartDate(anyLong(), any(LocalDate.class));
    verify(commits, never()).save(any(WeeklyCommit.class));
  }

  @Test
  void finalize_carriesForwardOnlyMissedCommitsIntoNextDraftPlan() {
    Plan plan = reconcilingPlan();
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
    WeeklyCommit done = commit(1L, CommitStatus.DONE);
    WeeklyCommit missedA = commit(2L, CommitStatus.MISSED);
    WeeklyCommit missedB = commit(3L, CommitStatus.MISSED);
    when(commits.findByPlanIdOrderByOrdinalAsc(PLAN_ID))
        .thenReturn(List.of(done, missedA, missedB));
    when(reconciliations.findByWeeklyCommitId(anyLong()))
        .thenReturn(Optional.of(Reconciliation.builder().build()));

    Plan nextWeek =
        Plan.builder()
            .userId(USER_ID)
            .weekStartDate(LocalDate.of(2026, 6, 8))
            .state(PlanState.DRAFT)
            .build();
    nextWeek.setId(101L);
    when(plans.findByUserIdAndWeekStartDate(USER_ID, LocalDate.of(2026, 6, 8)))
        .thenReturn(Optional.of(nextWeek));
    when(commits.countByPlanId(101L)).thenReturn(0);
    when(plans.save(any(Plan.class))).thenAnswer(inv -> inv.getArgument(0));
    when(commits.save(any(WeeklyCommit.class))).thenAnswer(inv -> inv.getArgument(0));

    svc.finalizeReconciliation(PLAN_ID);

    // Exactly the two MISSED commits get cloned into next week's DRAFT plan.
    verify(commits, times(2)).save(any(WeeklyCommit.class));
    verify(plans, atLeast(1)).save(any(Plan.class));
  }

  @Test
  void finalize_skipsCarryForwardWhenNextPlanIsNotDraft() {
    Plan plan = reconcilingPlan();
    when(plans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
    when(commits.findByPlanIdOrderByOrdinalAsc(PLAN_ID))
        .thenReturn(List.of(commit(1L, CommitStatus.MISSED)));
    when(reconciliations.findByWeeklyCommitId(anyLong()))
        .thenReturn(Optional.of(Reconciliation.builder().build()));

    Plan nextLocked =
        Plan.builder()
            .userId(USER_ID)
            .weekStartDate(LocalDate.of(2026, 6, 8))
            .state(PlanState.LOCKED)
            .build();
    nextLocked.setId(102L);
    when(plans.findByUserIdAndWeekStartDate(USER_ID, LocalDate.of(2026, 6, 8)))
        .thenReturn(Optional.of(nextLocked));
    when(plans.save(any(Plan.class))).thenAnswer(inv -> inv.getArgument(0));

    svc.finalizeReconciliation(PLAN_ID);

    // Next plan already past DRAFT — refuse to carry into it.
    verify(commits, never()).save(any(WeeklyCommit.class));
  }
}
