package com.colign.controller;

import com.colign.dto.CreatePlanRequest;
import com.colign.dto.PlanDto;
import com.colign.service.PlanService;
import com.colign.service.UserResolver;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plans")
public class PlanController {

    private final PlanService plans;
    private final UserResolver users;

    public PlanController(PlanService plans, UserResolver users) {
        this.plans = plans;
        this.users = users;
    }

    /** Get-or-create the current-week plan for the JWT user. Idempotent. */
    @GetMapping("/current")
    public PlanDto getOrCreateCurrent() {
        var me = users.resolveCurrent();
        var plan = plans.getOrCreatePlanForWeek(me.getId(), PlanService.currentWeekStart());
        return plans.toDto(plan);
    }

    @PostMapping
    public ResponseEntity<PlanDto> create(@Valid @RequestBody CreatePlanRequest req) {
        var me = users.resolveCurrent();
        var plan = plans.getOrCreatePlanForWeek(me.getId(), req.weekStartDate());
        var dto = plans.toDto(plan);
        return ResponseEntity.created(URI.create("/api/v1/plans/" + dto.id())).body(dto);
    }

    @GetMapping("/{id}")
    public PlanDto getById(@PathVariable Long id) {
        return plans.toDto(plans.getById(id));
    }

    @PatchMapping("/{id}/lock")
    public PlanDto lock(@PathVariable Long id) {
        return plans.toDto(plans.lock(id));
    }
}
