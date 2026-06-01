package com.colign.service;

import com.colign.config.exception.IllegalTransitionException;
import com.colign.config.exception.NotFoundException;
import com.colign.domain.DefiningObjective;
import com.colign.domain.Plan;
import com.colign.domain.PlanState;
import com.colign.domain.RallyCry;
import com.colign.domain.Reconciliation;
import com.colign.domain.WeeklyCommit;
import com.colign.dto.PlanDto;
import com.colign.dto.ReconciliationDto;
import com.colign.dto.WeeklyCommitDto;
import com.colign.repository.ChessTagRepository;
import com.colign.repository.DefiningObjectiveRepository;
import com.colign.repository.OutcomeRepository;
import com.colign.repository.PlanRepository;
import com.colign.repository.RallyCryRepository;
import com.colign.repository.ReconciliationRepository;
import com.colign.repository.WeeklyCommitRepository;
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
 * Plan lifecycle orchestrator. Owns: - Get-or-create the current-week plan for an IC - Enforce
 * state-machine transitions (see PLAN.md §4) - Hydrate a Plan + its commits + their alignment
 * summary into a single DTO
 */
@Service
public class PlanService {

  private final PlanRepository plans;
  private final WeeklyCommitRepository commits;
  private final OutcomeRepository outcomes;
  private final ChessTagRepository chessTags;
  private final ReconciliationRepository reconciliations;
  private final DefiningObjectiveRepository definingObjectives;
  private final RallyCryRepository rallyCries;

  public PlanService(
      PlanRepository plans,
      WeeklyCommitRepository commits,
      OutcomeRepository outcomes,
      ChessTagRepository chessTags,
      ReconciliationRepository reconciliations,
      DefiningObjectiveRepository definingObjectives,
      RallyCryRepository rallyCries) {
    this.plans = plans;
    this.commits = commits;
    this.outcomes = outcomes;
    this.chessTags = chessTags;
    this.reconciliations = reconciliations;
    this.definingObjectives = definingObjectives;
    this.rallyCries = rallyCries;
  }

  /**
   * Monday of "this week" — defined as the upcoming-or-today Monday, UTC. Rationale: in a
   * 15-Five-style weekly cadence the IC plans on Fri/Mon FOR the upcoming week, so on a non-Monday
   * day "this week" reads as the week that's about to start. On a Monday this is today.
   */
  public static LocalDate currentWeekStart() {
    return LocalDate.now().with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
  }

  @Transactional
  public Plan getOrCreatePlanForWeek(Long userId, LocalDate weekStart) {
    return plans
        .findByUserIdAndWeekStartDate(userId, weekStart)
        .orElseGet(
            () ->
                plans.save(
                    Plan.builder()
                        .userId(userId)
                        .weekStartDate(weekStart)
                        .state(PlanState.DRAFT)
                        .build()));
  }

  @Transactional(readOnly = true)
  public Plan getById(Long planId) {
    return plans.findById(planId).orElseThrow(() -> NotFoundException.of("Plan", planId));
  }

  @Transactional
  public Plan lock(Long planId) {
    Plan plan = getById(planId);
    if (plan.getState() != PlanState.DRAFT) {
      throw new IllegalTransitionException(
          plan.getState(), PlanState.LOCKED, "lock only valid from DRAFT");
    }
    int n = commits.countByPlanId(plan.getId());
    if (n == 0) {
      throw new IllegalTransitionException(
          PlanState.DRAFT, PlanState.LOCKED, "cannot lock an empty plan");
    }
    long unlinked = commits.countByPlanIdAndOutcomeIdIsNull(plan.getId());
    if (unlinked > 0) {
      throw new IllegalTransitionException(
          PlanState.DRAFT,
          PlanState.LOCKED,
          "cannot lock plan with " + unlinked + " commit(s) missing outcome link");
    }
    plan.setState(PlanState.LOCKED);
    plan.setLockedAt(Instant.now());
    return plans.save(plan);
  }

  @Transactional(readOnly = true)
  public PlanDto toDto(Plan plan) {
    List<WeeklyCommit> rows = commits.findByPlanIdOrderByOrdinalAsc(plan.getId());

    // Hydrate FK references in bulk to avoid N+1
    Map<Long, com.colign.domain.Outcome> outcomeById = new HashMap<>();
    rows.stream()
        .map(WeeklyCommit::getOutcomeId)
        .distinct()
        .forEach(id -> outcomes.findById(id).ifPresent(o -> outcomeById.put(id, o)));

    Map<Long, com.colign.domain.ChessTag> tagById = new HashMap<>();
    rows.stream()
        .map(WeeklyCommit::getChessTagId)
        .filter(java.util.Objects::nonNull)
        .distinct()
        .forEach(id -> chessTags.findById(id).ifPresent(t -> tagById.put(id, t)));

    // Resolve the RCDO path (Outcome → DefiningObjective → RallyCry) in two
    // bulk fetches so the manager drill-drawer can group commits by objective
    // without a per-row client lookup. Robust to missing rows: the DTO carries
    // nullable string titles, never throws if a hierarchy node is gone.
    List<Long> doIds =
        outcomeById.values().stream().map(o -> o.getDefiningObjectiveId()).distinct().toList();
    Map<Long, DefiningObjective> doById = new HashMap<>();
    if (!doIds.isEmpty()) {
      definingObjectives.findAllById(doIds).forEach(d -> doById.put(d.getId(), d));
    }
    List<Long> rcIds =
        doById.values().stream().map(d -> d.getRallyCryId()).distinct().toList();
    Map<Long, RallyCry> rcById = new HashMap<>();
    if (!rcIds.isEmpty()) {
      rallyCries.findAllById(rcIds).forEach(r -> rcById.put(r.getId(), r));
    }

    Map<Long, Reconciliation> reconciliationById = new HashMap<>();
    List<Long> commitIds = rows.stream().map(WeeklyCommit::getId).toList();
    if (!commitIds.isEmpty()) {
      reconciliations
          .findByWeeklyCommitIdIn(commitIds)
          .forEach(r -> reconciliationById.put(r.getWeeklyCommitId(), r));
    }

    List<WeeklyCommitDto> commitDtos =
        rows.stream()
            .map(
                c -> {
                  var o = outcomeById.get(c.getOutcomeId());
                  var t = c.getChessTagId() == null ? null : tagById.get(c.getChessTagId());
                  var r = reconciliationById.get(c.getId());
                  ReconciliationDto rDto =
                      r == null
                          ? null
                          : new ReconciliationDto(
                              r.getId(),
                              r.getWeeklyCommitId(),
                              r.getActualStatus(),
                              r.getActualOutcomeNote(),
                              r.getActualEffortHours(),
                              r.getOutcomeDelta(),
                              r.getReconciledAt(),
                              r.getReconciledBy());
                  DefiningObjective d = o == null ? null : doById.get(o.getDefiningObjectiveId());
                  RallyCry rc = d == null ? null : rcById.get(d.getRallyCryId());
                  return new WeeklyCommitDto(
                      c.getId(),
                      c.getPlanId(),
                      c.getOutcomeId(),
                      o == null ? null : o.getTitle(),
                      o == null ? null : o.getPriorityTier(),
                      c.getChessTagId(),
                      t == null ? null : t.getCode(),
                      c.getTitle(),
                      c.getDescription(),
                      c.getPlannedEffortHours(),
                      c.getStatus(),
                      c.getOrdinal(),
                      c.getCarriedFromCommitId(),
                      rDto,
                      d == null ? null : d.getTitle(),
                      rc == null ? null : rc.getTitle());
                })
            .toList();

    int total = commitDtos.size();
    int high =
        (int)
            commitDtos.stream()
                .filter(c -> "P0".equals(c.outcomePriority()) || "P1".equals(c.outcomePriority()))
                .count();
    double pct = total == 0 ? 0.0 : Math.round((100.0 * high / total) * 10.0) / 10.0;

    return new PlanDto(
        plan.getId(),
        plan.getUserId(),
        plan.getWeekStartDate(),
        plan.getState(),
        plan.getLockedAt(),
        plan.getReconciledAt(),
        plan.getManagerSignedAt(),
        plan.getManagerSignedBy(),
        commitDtos,
        new PlanDto.AlignmentSummary(total, high, pct),
        plan.getCreatedDate(),
        plan.getLastModifiedDate());
  }
}
