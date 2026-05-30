package com.wc.service;

import com.wc.config.exception.IllegalTransitionException;
import com.wc.config.exception.NotFoundException;
import com.wc.config.security.CurrentUser;
import com.wc.domain.CommitStatus;
import com.wc.domain.Plan;
import com.wc.domain.PlanState;
import com.wc.domain.Reconciliation;
import com.wc.domain.WeeklyCommit;
import com.wc.dto.ReconcileCommitRequest;
import com.wc.repository.PlanRepository;
import com.wc.repository.ReconciliationRepository;
import com.wc.repository.WeeklyCommitRepository;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns RECONCILING + RECONCILED transitions and the per-commit reconciliation
 * write path. RECONCILED → CARRIED_FORWARD also lives here because the
 * carry-forward step has to atomically inspect this week's commits AND
 * materialize next week's plan.
 */
@Service
public class ReconciliationService {

    private final PlanRepository plans;
    private final WeeklyCommitRepository commits;
    private final ReconciliationRepository reconciliations;

    public ReconciliationService(
            PlanRepository plans,
            WeeklyCommitRepository commits,
            ReconciliationRepository reconciliations) {
        this.plans = plans;
        this.commits = commits;
        this.reconciliations = reconciliations;
    }

    @Transactional
    public Plan startReconciliation(Long planId) {
        Plan plan = plans.findById(planId)
                .orElseThrow(() -> NotFoundException.of("Plan", planId));
        if (plan.getState() != PlanState.LOCKED) {
            throw new IllegalTransitionException(plan.getState(), PlanState.RECONCILING,
                    "start-reconciliation only valid from LOCKED");
        }
        plan.setState(PlanState.RECONCILING);
        return plans.save(plan);
    }

    @Transactional
    public Reconciliation reconcileCommit(Long commitId, ReconcileCommitRequest req) {
        WeeklyCommit commit = commits.findById(commitId)
                .orElseThrow(() -> NotFoundException.of("WeeklyCommit", commitId));
        Plan plan = plans.findById(commit.getPlanId())
                .orElseThrow(() -> NotFoundException.of("Plan", commit.getPlanId()));
        if (plan.getState() != PlanState.RECONCILING) {
            throw new IllegalTransitionException(plan.getState(), plan.getState(),
                    "commits can only be reconciled while the plan is RECONCILING");
        }

        Reconciliation existing = reconciliations.findByWeeklyCommitId(commitId).orElse(null);
        Reconciliation row = existing != null ? existing : Reconciliation.builder()
                .weeklyCommitId(commitId)
                .build();
        row.setActualStatus(req.actualStatus());
        row.setActualOutcomeNote(req.actualOutcomeNote());
        row.setActualEffortHours(req.actualEffortHours());
        row.setOutcomeDelta(req.outcomeDelta());
        row.setReconciledAt(Instant.now());
        row.setReconciledBy(CurrentUser.email().orElse(CurrentUser.sub().orElse("system")));
        reconciliations.save(row);

        // Mirror terminal status on the commit for fast list queries.
        commit.setStatus(switch (req.actualStatus()) {
            case "DONE" -> CommitStatus.DONE;
            case "PARTIAL", "DROPPED" -> CommitStatus.MISSED;
            case "MISSED" -> CommitStatus.MISSED;
            default -> commit.getStatus();
        });
        commits.save(commit);
        return row;
    }

    /**
     * Finalize reconciliation: RECONCILING → RECONCILED, then immediately
     * carry forward any MISSED commits into next week's plan (creating that
     * plan in DRAFT if it doesn't exist yet). Returns the now-RECONCILED plan.
     */
    @Transactional
    public Plan finalizeReconciliation(Long planId) {
        Plan plan = plans.findById(planId)
                .orElseThrow(() -> NotFoundException.of("Plan", planId));
        if (plan.getState() != PlanState.RECONCILING) {
            throw new IllegalTransitionException(plan.getState(), PlanState.RECONCILED,
                    "finalize-reconciliation only valid from RECONCILING");
        }
        List<WeeklyCommit> all = commits.findByPlanIdOrderByOrdinalAsc(plan.getId());
        boolean fullyReconciled = all.stream().allMatch(c ->
                reconciliations.findByWeeklyCommitId(c.getId()).isPresent());
        if (!fullyReconciled) {
            throw new IllegalTransitionException(PlanState.RECONCILING, PlanState.RECONCILED,
                    "every commit must be reconciled before finalizing");
        }

        plan.setState(PlanState.RECONCILED);
        plan.setReconciledAt(Instant.now());
        plans.save(plan);

        carryForward(plan, all);
        return plan;
    }

    private void carryForward(Plan finalized, List<WeeklyCommit> sourceCommits) {
        List<WeeklyCommit> toCarry = sourceCommits.stream()
                .filter(c -> c.getStatus() == CommitStatus.MISSED)
                .toList();
        if (toCarry.isEmpty()) return;

        LocalDate nextMonday = finalized.getWeekStartDate()
                .plusWeeks(1)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        Plan nextPlan = plans.findByUserIdAndWeekStartDate(finalized.getUserId(), nextMonday)
                .orElseGet(() -> plans.save(Plan.builder()
                        .userId(finalized.getUserId())
                        .weekStartDate(nextMonday)
                        .state(PlanState.DRAFT)
                        .build()));

        if (nextPlan.getState() != PlanState.DRAFT) {
            // Next week is already locked or further along — don't carry into it.
            return;
        }

        int baseOrdinal = commits.countByPlanId(nextPlan.getId());
        for (int i = 0; i < toCarry.size(); i++) {
            WeeklyCommit src = toCarry.get(i);
            commits.save(WeeklyCommit.builder()
                    .planId(nextPlan.getId())
                    .outcomeId(src.getOutcomeId())
                    .chessTagId(src.getChessTagId())
                    .title(src.getTitle())
                    .description(src.getDescription())
                    .plannedEffortHours(src.getPlannedEffortHours())
                    .status(CommitStatus.CARRIED)
                    .ordinal(baseOrdinal + i)
                    .carriedFromCommitId(src.getId())
                    .build());
        }
    }

    public Optional<Reconciliation> findByCommit(Long commitId) {
        return reconciliations.findByWeeklyCommitId(commitId);
    }
}
