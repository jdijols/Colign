package com.colign.controller;

import com.colign.config.exception.IllegalTransitionException;
import com.colign.config.exception.NotFoundException;
import com.colign.domain.CommitStatus;
import com.colign.domain.PlanState;
import com.colign.domain.WeeklyCommit;
import com.colign.dto.AddCommitRequest;
import com.colign.dto.PlanDto;
import com.colign.dto.UpdateCommitRequest;
import com.colign.repository.PlanRepository;
import com.colign.repository.WeeklyCommitRepository;
import com.colign.service.PlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class WeeklyCommitController {

    private final PlanRepository planRepo;
    private final WeeklyCommitRepository commitRepo;
    private final PlanService planService;

    public WeeklyCommitController(PlanRepository planRepo,
                                   WeeklyCommitRepository commitRepo,
                                   PlanService planService) {
        this.planRepo = planRepo;
        this.commitRepo = commitRepo;
        this.planService = planService;
    }

    @PostMapping("/plans/{planId}/commits")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PlanDto add(@PathVariable Long planId, @Valid @RequestBody AddCommitRequest req) {
        var plan = planRepo.findById(planId).orElseThrow(() -> NotFoundException.of("Plan", planId));
        if (plan.getState() != PlanState.DRAFT) {
            throw new IllegalTransitionException(plan.getState(), plan.getState(),
                    "commits can only be added while the plan is DRAFT");
        }
        int ord = req.ordinal() != null ? req.ordinal() : commitRepo.countByPlanId(planId);
        WeeklyCommit wc = WeeklyCommit.builder()
                .planId(planId)
                .outcomeId(req.outcomeId())
                .chessTagId(req.chessTagId())
                .title(req.title())
                .description(req.description())
                .plannedEffortHours(req.plannedEffortHours())
                .status(CommitStatus.PLANNED)
                .ordinal(ord)
                .build();
        commitRepo.save(wc);
        return planService.toDto(plan);
    }

    @PatchMapping("/commits/{id}")
    @Transactional
    public PlanDto update(@PathVariable Long id, @Valid @RequestBody UpdateCommitRequest req) {
        WeeklyCommit wc = commitRepo.findById(id)
                .orElseThrow(() -> NotFoundException.of("WeeklyCommit", id));
        if (req.title() != null) wc.setTitle(req.title());
        if (req.description() != null) wc.setDescription(req.description());
        if (req.outcomeId() != null) wc.setOutcomeId(req.outcomeId());
        if (req.chessTagId() != null) wc.setChessTagId(req.chessTagId());
        if (req.plannedEffortHours() != null) wc.setPlannedEffortHours(req.plannedEffortHours());
        if (req.status() != null) wc.setStatus(req.status());
        if (req.ordinal() != null) wc.setOrdinal(req.ordinal());
        commitRepo.save(wc);
        return planService.toDto(planRepo.findById(wc.getPlanId()).orElseThrow());
    }

    @DeleteMapping("/commits/{id}")
    @Transactional
    public PlanDto delete(@PathVariable Long id) {
        WeeklyCommit wc = commitRepo.findById(id)
                .orElseThrow(() -> NotFoundException.of("WeeklyCommit", id));
        Long planId = wc.getPlanId();
        var plan = planRepo.findById(planId).orElseThrow();
        if (plan.getState() != PlanState.DRAFT) {
            throw new IllegalTransitionException(plan.getState(), plan.getState(),
                    "commits can only be deleted while the plan is DRAFT");
        }
        commitRepo.delete(wc);
        return planService.toDto(plan);
    }
}
