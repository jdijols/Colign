package com.wc.service;

import com.wc.config.exception.IllegalTransitionException;
import com.wc.config.exception.NotFoundException;
import com.wc.domain.Plan;
import com.wc.domain.PlanState;
import com.wc.domain.Reconciliation;
import com.wc.domain.WeeklyCommit;
import com.wc.dto.PlanDto;
import com.wc.dto.ReconciliationDto;
import com.wc.dto.WeeklyCommitDto;
import com.wc.repository.ChessTagRepository;
import com.wc.repository.OutcomeRepository;
import com.wc.repository.PlanRepository;
import com.wc.repository.ReconciliationRepository;
import com.wc.repository.WeeklyCommitRepository;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Plan lifecycle orchestrator. Owns:
 *   - Get-or-create the current-week plan for an IC
 *   - Enforce state-machine transitions (see PLAN.md §4)
 *   - Hydrate a Plan + its commits + their alignment summary into a single DTO
 */
@Service
public class PlanService {

    private final PlanRepository plans;
    private final WeeklyCommitRepository commits;
    private final OutcomeRepository outcomes;
    private final ChessTagRepository chessTags;
    private final ReconciliationRepository reconciliations;

    public PlanService(
            PlanRepository plans,
            WeeklyCommitRepository commits,
            OutcomeRepository outcomes,
            ChessTagRepository chessTags,
            ReconciliationRepository reconciliations) {
        this.plans = plans;
        this.commits = commits;
        this.outcomes = outcomes;
        this.chessTags = chessTags;
        this.reconciliations = reconciliations;
    }

    /** Monday-of-this-week, UTC. The demo's canonical week-start convention. */
    public static LocalDate currentWeekStart() {
        return LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    @Transactional
    public Plan getOrCreatePlanForWeek(Long userId, LocalDate weekStart) {
        return plans.findByUserIdAndWeekStartDate(userId, weekStart)
                .orElseGet(() -> plans.save(
                        Plan.builder()
                                .userId(userId)
                                .weekStartDate(weekStart)
                                .state(PlanState.DRAFT)
                                .build()));
    }

    @Transactional(readOnly = true)
    public Plan getById(Long planId) {
        return plans.findById(planId)
                .orElseThrow(() -> NotFoundException.of("Plan", planId));
    }

    @Transactional
    public Plan lock(Long planId) {
        Plan plan = getById(planId);
        if (plan.getState() != PlanState.DRAFT) {
            throw new IllegalTransitionException(plan.getState(), PlanState.LOCKED,
                    "lock only valid from DRAFT");
        }
        int n = commits.countByPlanId(plan.getId());
        if (n == 0) {
            throw new IllegalTransitionException(PlanState.DRAFT, PlanState.LOCKED,
                    "cannot lock an empty plan");
        }
        plan.setState(PlanState.LOCKED);
        plan.setLockedAt(Instant.now());
        return plans.save(plan);
    }

    @Transactional(readOnly = true)
    public PlanDto toDto(Plan plan) {
        List<WeeklyCommit> rows = commits.findByPlanIdOrderByOrdinalAsc(plan.getId());

        // Hydrate FK references in bulk to avoid N+1
        Map<Long, com.wc.domain.Outcome> outcomeById = new HashMap<>();
        rows.stream().map(WeeklyCommit::getOutcomeId).distinct()
                .forEach(id -> outcomes.findById(id).ifPresent(o -> outcomeById.put(id, o)));

        Map<Long, com.wc.domain.ChessTag> tagById = new HashMap<>();
        rows.stream().map(WeeklyCommit::getChessTagId).filter(java.util.Objects::nonNull).distinct()
                .forEach(id -> chessTags.findById(id).ifPresent(t -> tagById.put(id, t)));

        Map<Long, Reconciliation> reconciliationById = new HashMap<>();
        List<Long> commitIds = rows.stream().map(WeeklyCommit::getId).toList();
        if (!commitIds.isEmpty()) {
            reconciliations.findByWeeklyCommitIdIn(commitIds)
                    .forEach(r -> reconciliationById.put(r.getWeeklyCommitId(), r));
        }

        List<WeeklyCommitDto> commitDtos = rows.stream()
                .map(c -> {
                    var o = outcomeById.get(c.getOutcomeId());
                    var t = c.getChessTagId() == null ? null : tagById.get(c.getChessTagId());
                    var r = reconciliationById.get(c.getId());
                    ReconciliationDto rDto = r == null ? null : new ReconciliationDto(
                            r.getId(), r.getWeeklyCommitId(), r.getActualStatus(),
                            r.getActualOutcomeNote(), r.getActualEffortHours(),
                            r.getOutcomeDelta(), r.getReconciledAt(), r.getReconciledBy());
                    return new WeeklyCommitDto(
                            c.getId(), c.getPlanId(), c.getOutcomeId(),
                            o == null ? null : o.getTitle(),
                            o == null ? null : o.getPriorityTier(),
                            c.getChessTagId(),
                            t == null ? null : t.getCode(),
                            c.getTitle(), c.getDescription(),
                            c.getPlannedEffortHours(), c.getStatus(), c.getOrdinal(),
                            c.getCarriedFromCommitId(),
                            rDto);
                })
                .toList();

        int total = commitDtos.size();
        int high = (int) commitDtos.stream()
                .filter(c -> "P0".equals(c.outcomePriority()) || "P1".equals(c.outcomePriority()))
                .count();
        double pct = total == 0 ? 0.0 : Math.round((100.0 * high / total) * 10.0) / 10.0;

        return new PlanDto(
                plan.getId(), plan.getUserId(), plan.getWeekStartDate(),
                plan.getState(), plan.getLockedAt(), plan.getReconciledAt(),
                plan.getManagerSignedAt(), plan.getManagerSignedBy(),
                commitDtos,
                new PlanDto.AlignmentSummary(total, high, pct),
                plan.getCreatedDate(), plan.getLastModifiedDate());
    }
}
