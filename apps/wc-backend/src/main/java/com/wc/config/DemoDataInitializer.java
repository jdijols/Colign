package com.wc.config;

import com.wc.domain.ChessTag;
import com.wc.domain.CommitStatus;
import com.wc.domain.Outcome;
import com.wc.domain.Plan;
import com.wc.domain.PlanState;
import com.wc.domain.Reconciliation;
import com.wc.domain.User;
import com.wc.domain.WeeklyCommit;
import com.wc.repository.ChessTagRepository;
import com.wc.repository.OutcomeRepository;
import com.wc.repository.PlanRepository;
import com.wc.repository.ReconciliationRepository;
import com.wc.repository.UserRepository;
import com.wc.repository.WeeklyCommitRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Materializes plans + commits + reconciliations for the seeded demo users
 * (Ada, Ben, Chris) the first time the app boots with the V3 seed users
 * present and no commits in the DB. Idempotent on commitRepo.count() — once
 * any commits exist (seeded or created via the API), this runner no-ops.
 *
 * Profile-gated to h2/dev to avoid touching production-shaped Postgres
 * deployments by accident. For a Postgres demo, set SPRING_PROFILES_ACTIVE=demo
 * or temporarily widen the @Profile to include "local".
 */
@Component
@Profile({"h2", "demo"})
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final UserRepository users;
    private final PlanRepository plans;
    private final WeeklyCommitRepository commits;
    private final OutcomeRepository outcomes;
    private final ChessTagRepository chessTags;
    private final ReconciliationRepository reconciliations;

    public DemoDataInitializer(
            UserRepository users,
            PlanRepository plans,
            WeeklyCommitRepository commits,
            OutcomeRepository outcomes,
            ChessTagRepository chessTags,
            ReconciliationRepository reconciliations) {
        this.users = users;
        this.plans = plans;
        this.commits = commits;
        this.outcomes = outcomes;
        this.chessTags = chessTags;
        this.reconciliations = reconciliations;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (commits.count() > 0) {
            log.info("DemoDataInitializer: commits already exist, skipping seed");
            return;
        }
        User ada = users.findByEmail("ada@st6.dev").orElse(null);
        User ben = users.findByEmail("ben@st6.dev").orElse(null);
        User chris = users.findByEmail("chris@st6.dev").orElse(null);
        if (ada == null || ben == null || chris == null) {
            log.warn("DemoDataInitializer: seeded users not found, skipping (V3 may not have run)");
            return;
        }

        Map<String, List<Outcome>> byTier = new HashMap<>();
        outcomes.findAll().forEach(o -> byTier.computeIfAbsent(o.getPriorityTier(), k -> new java.util.ArrayList<>()).add(o));
        if (!byTier.containsKey("P0") || byTier.get("P0").size() < 2
                || !byTier.containsKey("P1") || byTier.get("P1").size() < 2
                || !byTier.containsKey("P2") || byTier.get("P2").isEmpty()) {
            log.warn("DemoDataInitializer: outcomes catalog incomplete, skipping");
            return;
        }
        Outcome p0a = byTier.get("P0").get(0);
        Outcome p0b = byTier.get("P0").get(1);
        Outcome p1a = byTier.get("P1").get(0);
        Outcome p1b = byTier.get("P1").get(1);
        Outcome p2  = byTier.get("P2").get(0);

        ChessTag offense = chessTagByCode("OFFENSE");
        ChessTag defense = chessTagByCode("DEFENSE");
        ChessTag maintenance = chessTagByCode("MAINTENANCE");

        LocalDate thisWeek = LocalDate.now().with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        LocalDate lastWeek = thisWeek.minusWeeks(1);

        // === Ada: this-week DRAFT, 2 commits (P0 OFFENSE + P2 MAINTENANCE) ===
        Plan adaPlan = plans.save(Plan.builder()
                .userId(ada.getId())
                .weekStartDate(thisWeek)
                .state(PlanState.DRAFT)
                .build());
        commit(adaPlan, p0a, offense, "Ship onboarding wizard v2",
                "Reduce step count from 7 → 4, add progress bar.",
                bd(8.0), CommitStatus.PLANNED, 0, null);
        commit(adaPlan, p2, maintenance, "Tune auth cache hit rate",
                "Profile current misses, address top hot path.",
                bd(3.0), CommitStatus.PLANNED, 1, null);

        // === Ben: this-week LOCKED, 3 commits (2× P0 + P1, 100% alignment) ===
        Plan benPlan = plans.save(Plan.builder()
                .userId(ben.getId())
                .weekStartDate(thisWeek)
                .state(PlanState.LOCKED)
                .lockedAt(Instant.now().minus(Duration.ofHours(6)))
                .build());
        commit(benPlan, p0a, offense, "Pair with Ada on wizard ship",
                "Backend instrumentation + frontend QA.",
                bd(6.0), CommitStatus.PLANNED, 0, null);
        commit(benPlan, p0b, defense, "Roll out auth p95 dashboard",
                "Datadog board + alerting threshold tuned.",
                bd(4.0), CommitStatus.PLANNED, 1, null);
        commit(benPlan, p1a, offense, "First-week-active rate funnel review",
                "Cohort drilldown, identify drop-off step.",
                bd(2.0), CommitStatus.PLANNED, 2, null);

        // === Chris: last-week RECONCILED (3 commits, 1 missed) + this-week DRAFT with carried ===
        Plan chrisLast = plans.save(Plan.builder()
                .userId(chris.getId())
                .weekStartDate(lastWeek)
                .state(PlanState.RECONCILED)
                .lockedAt(Instant.now().minus(Duration.ofDays(5)))
                .reconciledAt(Instant.now().minus(Duration.ofDays(2)))
                .build());
        WeeklyCommit chris1 = commit(chrisLast, p1b, offense,
                "Spike plans-list p95 latency fix",
                "Pageable + @EntityGraph hydration prototype.",
                bd(4.0), CommitStatus.DONE, 0, null);
        WeeklyCommit chris2 = commit(chrisLast, p0b, defense,
                "Auth p95 fix candidate A",
                "Trial JWT introspection caching, deploy to staging.",
                bd(6.0), CommitStatus.DONE, 1, null);
        WeeklyCommit chris3 = commit(chrisLast, p2, maintenance,
                "Cleanup auth cache observability",
                "Add hit/miss histogram, log spikes.",
                bd(2.0), CommitStatus.MISSED, 2, null);

        reconcile(chris1, "DONE", "Spike landed Thursday, ready to roll out", bd(4.5));
        reconcile(chris2, "DONE", null, bd(5.0));
        reconcile(chris3, "MISSED", "Blocked by oncall incident Wed", bd(0.0));

        // Chris's this-week DRAFT carrying forward the missed P2 commit
        Plan chrisThis = plans.save(Plan.builder()
                .userId(chris.getId())
                .weekStartDate(thisWeek)
                .state(PlanState.DRAFT)
                .build());
        commit(chrisThis, chris3.getOutcomeId() == null ? p2.getId() : chris3.getOutcomeId(),
                chris3.getChessTagId(),
                chris3.getTitle(),
                chris3.getDescription(),
                chris3.getPlannedEffortHours(),
                CommitStatus.CARRIED, 0, chris3.getId());

        log.info("DemoDataInitializer seeded: ada DRAFT/2, ben LOCKED/3, chris RECONCILED-last + DRAFT-carried/1");
    }

    // ---------- helpers ----------

    private ChessTag chessTagByCode(String code) {
        return chessTags.findAll().stream()
                .filter(t -> code.equals(t.getCode()))
                .findFirst().orElseThrow(() ->
                        new IllegalStateException("chess_tag " + code + " not seeded"));
    }

    private WeeklyCommit commit(
            Plan plan, Outcome outcome, ChessTag tag,
            String title, String description, BigDecimal hours,
            CommitStatus status, int ordinal, Long carriedFrom) {
        return commit(plan, outcome.getId(), tag == null ? null : tag.getId(),
                title, description, hours, status, ordinal, carriedFrom);
    }

    private WeeklyCommit commit(
            Plan plan, Long outcomeId, Long chessTagId,
            String title, String description, BigDecimal hours,
            CommitStatus status, int ordinal, Long carriedFrom) {
        return commits.save(WeeklyCommit.builder()
                .planId(plan.getId())
                .outcomeId(outcomeId)
                .chessTagId(chessTagId)
                .title(title)
                .description(description)
                .plannedEffortHours(hours)
                .status(status)
                .ordinal(ordinal)
                .carriedFromCommitId(carriedFrom)
                .build());
    }

    private void reconcile(WeeklyCommit c, String actual, String note, BigDecimal actualHours) {
        reconciliations.save(Reconciliation.builder()
                .weeklyCommitId(c.getId())
                .actualStatus(actual)
                .actualOutcomeNote(note)
                .actualEffortHours(actualHours)
                .reconciledAt(Instant.now().minus(Duration.ofDays(2)))
                .reconciledBy("chris@st6.dev")
                .build());
    }

    private static BigDecimal bd(double d) { return BigDecimal.valueOf(d); }
}
