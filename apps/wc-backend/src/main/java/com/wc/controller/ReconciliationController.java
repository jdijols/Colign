package com.wc.controller;

import com.wc.config.exception.NotFoundException;
import com.wc.domain.Reconciliation;
import com.wc.dto.PlanDto;
import com.wc.dto.ReconcileCommitRequest;
import com.wc.dto.ReconciliationDto;
import com.wc.repository.WeeklyCommitRepository;
import com.wc.service.PlanService;
import com.wc.service.ReconciliationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;
    private final PlanService planService;
    private final WeeklyCommitRepository commitRepo;

    public ReconciliationController(
            ReconciliationService reconciliationService,
            PlanService planService,
            WeeklyCommitRepository commitRepo) {
        this.reconciliationService = reconciliationService;
        this.planService = planService;
        this.commitRepo = commitRepo;
    }

    /** LOCKED → RECONCILING. */
    @PatchMapping("/plans/{id}/start-reconciliation")
    public PlanDto startReconciliation(@PathVariable Long id) {
        return planService.toDto(reconciliationService.startReconciliation(id));
    }

    /** Record an actual against a single commit (RECONCILING-only). */
    @PostMapping("/commits/{commitId}/reconciliation")
    public ResponseEntity<ReconciliationDto> reconcile(
            @PathVariable Long commitId,
            @Valid @RequestBody ReconcileCommitRequest req) {
        Reconciliation row = reconciliationService.reconcileCommit(commitId, req);
        return ResponseEntity.ok(toDto(row));
    }

    /** Fetch a single commit's reconciliation row (404 if not yet reconciled). */
    @GetMapping("/commits/{commitId}/reconciliation")
    public ReconciliationDto getReconciliation(@PathVariable Long commitId) {
        // Verify the commit exists for a clearer 404 if the URL is wrong.
        commitRepo.findById(commitId)
                .orElseThrow(() -> NotFoundException.of("WeeklyCommit", commitId));
        Reconciliation row = reconciliationService.findByCommit(commitId)
                .orElseThrow(() -> NotFoundException.of("Reconciliation for commit", commitId));
        return toDto(row);
    }

    /** RECONCILING → RECONCILED. Triggers carry-forward of MISSED commits. */
    @PatchMapping("/plans/{id}/finalize-reconciliation")
    public PlanDto finalizeReconciliation(@PathVariable Long id) {
        return planService.toDto(reconciliationService.finalizeReconciliation(id));
    }

    private static ReconciliationDto toDto(Reconciliation r) {
        return new ReconciliationDto(
                r.getId(),
                r.getWeeklyCommitId(),
                r.getActualStatus(),
                r.getActualOutcomeNote(),
                r.getActualEffortHours(),
                r.getOutcomeDelta(),
                r.getReconciledAt(),
                r.getReconciledBy());
    }
}
