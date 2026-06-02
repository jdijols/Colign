package com.colign.controller;

import com.colign.domain.DefiningObjective;
import com.colign.domain.Outcome;
import com.colign.domain.RallyCry;
import com.colign.domain.User;
import com.colign.domain.UserRole;
import com.colign.dto.CreateOutcomeRequest;
import com.colign.dto.OutcomeRefDto;
import com.colign.dto.UpdateOutcomeRequest;
import com.colign.repository.DefiningObjectiveRepository;
import com.colign.repository.OutcomeRepository;
import com.colign.repository.RallyCryRepository;
import com.colign.service.StrategyService;
import com.colign.service.UserResolver;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/outcomes")
public class OutcomeController {

  private final OutcomeRepository outcomes;
  private final DefiningObjectiveRepository definingObjectives;
  private final RallyCryRepository rallyCries;
  private final StrategyService strategy;
  private final UserResolver users;

  public OutcomeController(
      OutcomeRepository outcomes,
      DefiningObjectiveRepository definingObjectives,
      RallyCryRepository rallyCries,
      StrategyService strategy,
      UserResolver users) {
    this.outcomes = outcomes;
    this.definingObjectives = definingObjectives;
    this.rallyCries = rallyCries;
    this.strategy = strategy;
    this.users = users;
  }

  /**
   * Outcome picker for the commit form. Scoped to the caller's team (ADMIN sees all) so a manager
   * with assignments across tenants never leaks another team's strategy into an IC's combobox.
   */
  @GetMapping
  public Page<OutcomeRefDto> list(
      @RequestParam(name = "includeRetired", defaultValue = "false") boolean includeRetired,
      @PageableDefault(size = 50, sort = "priorityTier", direction = Sort.Direction.ASC)
          Pageable pageable) {
    User me = users.resolveCurrent();
    Pageable capped =
        PageRequest.of(
            pageable.getPageNumber(), Math.min(pageable.getPageSize(), 500), pageable.getSort());
    // Default to active (non-retired) outcomes so the commit-form picker and the
    // Dashboard anchor never show a retired Outcome. The Goals timeline passes
    // includeRetired=true and filters by each Outcome's effective range per week.
    boolean adminScope = me.getRole() == UserRole.ADMIN || me.getTeamId() == null;
    Page<Outcome> page;
    if (adminScope) {
      page = includeRetired ? outcomes.findAll(capped) : outcomes.findByEffectiveToIsNull(capped);
    } else if (includeRetired) {
      page = outcomes.findByTeamId(me.getTeamId(), capped);
    } else {
      page = outcomes.findByTeamIdAndEffectiveToIsNull(me.getTeamId(), capped);
    }

    // Hydrate parent labels in bulk (no N+1)
    var doIds = page.getContent().stream().map(Outcome::getDefiningObjectiveId).distinct().toList();
    Map<Long, DefiningObjective> doMap = new HashMap<>();
    definingObjectives.findAllById(doIds).forEach(d -> doMap.put(d.getId(), d));

    var rcIds = doMap.values().stream().map(DefiningObjective::getRallyCryId).distinct().toList();
    Map<Long, RallyCry> rcMap = new HashMap<>();
    rallyCries.findAllById(rcIds).forEach(rc -> rcMap.put(rc.getId(), rc));

    return page.map(
        o -> {
          DefiningObjective d = doMap.get(o.getDefiningObjectiveId());
          RallyCry rc = d == null ? null : rcMap.get(d.getRallyCryId());
          return new OutcomeRefDto(
              o.getId(),
              o.getTitle(),
              o.getPriorityTier(),
              d == null ? null : d.getId(),
              d == null ? null : d.getTitle(),
              rc == null ? null : rc.getId(),
              rc == null ? null : rc.getTitle(),
              o.getCreatedDate(),
              o.getEffectiveTo());
        });
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public OutcomeRefDto create(@Valid @RequestBody CreateOutcomeRequest req) {
    return strategy.createOutcome(users.resolveCurrent(), req);
  }

  @PutMapping("/{id}")
  public OutcomeRefDto update(@PathVariable Long id, @Valid @RequestBody UpdateOutcomeRequest req) {
    return strategy.updateOutcome(users.resolveCurrent(), id, req);
  }

  /** Soft-delete (retire) an Outcome. The row stays so past weeks still show it. */
  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    strategy.deleteOutcome(users.resolveCurrent(), id);
  }
}
