package com.colign.controller;

import com.colign.dto.CreateDefiningObjectiveRequest;
import com.colign.dto.DefiningObjectiveDto;
import com.colign.dto.UpdateDefiningObjectiveRequest;
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
 * Team-scoped Defining Objective authoring (middle of the RCDO chain). The owning team is inherited
 * from the parent Rally Cry; authority is enforced in {@link StrategyService}.
 */
@RestController
@RequestMapping("/api/v1/defining-objectives")
public class DefiningObjectiveController {

  private final StrategyService strategy;
  private final UserResolver users;

  public DefiningObjectiveController(StrategyService strategy, UserResolver users) {
    this.strategy = strategy;
    this.users = users;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DefiningObjectiveDto create(@Valid @RequestBody CreateDefiningObjectiveRequest req) {
    return strategy.createDefiningObjective(users.resolveCurrent(), req);
  }

  @PutMapping("/{id}")
  public DefiningObjectiveDto update(
      @PathVariable Long id, @Valid @RequestBody UpdateDefiningObjectiveRequest req) {
    return strategy.updateDefiningObjective(users.resolveCurrent(), id, req);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    strategy.deleteDefiningObjective(users.resolveCurrent(), id);
    return ResponseEntity.noContent().build();
  }
}
