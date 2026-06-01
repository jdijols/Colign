package com.colign.controller;

import com.colign.dto.CreateRallyCryRequest;
import com.colign.dto.RallyCryDto;
import com.colign.dto.UpdateRallyCryRequest;
import com.colign.service.StrategyService;
import com.colign.service.UserResolver;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Team-scoped Rally Cry authoring (top of the RCDO chain). Writes require strategy authority
 * (MANAGER/ADMIN or the team lead) over the caller's own team — enforced in {@link StrategyService}.
 */
@RestController
@RequestMapping("/api/v1/rally-cries")
public class RallyCryController {

  private final StrategyService strategy;
  private final UserResolver users;

  public RallyCryController(StrategyService strategy, UserResolver users) {
    this.strategy = strategy;
    this.users = users;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public RallyCryDto create(@Valid @RequestBody CreateRallyCryRequest req) {
    return strategy.createRallyCry(users.resolveCurrent(), req);
  }

  @PutMapping("/{id}")
  public RallyCryDto update(@PathVariable Long id, @Valid @RequestBody UpdateRallyCryRequest req) {
    return strategy.updateRallyCry(users.resolveCurrent(), id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    strategy.deleteRallyCry(users.resolveCurrent(), id);
    return ResponseEntity.noContent().build();
  }
}
